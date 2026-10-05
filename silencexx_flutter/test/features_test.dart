import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:silencexx/core/api.dart';
import 'package:silencexx/core/app_state.dart';
import 'package:silencexx/main.dart';
import 'package:silencexx/screens/home_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  Future<AppState> boot(
    WidgetTester tester,
    Future<http.Response> Function(http.Request) handler,
  ) async {
    tester.platformDispatcher.accessibilityFeaturesTestValue =
        const FakeAccessibilityFeatures(disableAnimations: true);
    addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({});
    final app = AppState(
      api: Api(client: MockClient(handler)),
      preferences: await SharedPreferences.getInstance(),
    );
    app.api.token = 'token';
    app.user = {'id': 1, 'name': 'Test'};
    app.ready = true;
    app.disclaimerAccepted = true;
    app.language = 'ru';
    await tester.pumpWidget(SilenceApp(state: app));
    await tester.pumpAndSettle();
    expect(
      find.byType(HomeScreen),
      findsOneWidget,
      reason:
          'ready=${app.ready}, authenticated=${app.authenticated}, disclaimer=${app.disclaimerAccepted}, onboarding=${app.needsOnboarding}',
    );
    addTearDown(app.api.close);
    return app;
  }

  http.Response response(Json data) => http.Response(
    jsonEncode(data),
    200,
    headers: {'content-type': 'application/json; charset=utf-8'},
  );

  Future<void> selectSection(WidgetTester tester, String label) async {
    if (find.text(label).hitTestable().evaluate().isEmpty) {
      await tester.tap(find.byTooltip('Открыть меню'));
      await tester.pumpAndSettle();
    }
    await tester.tap(find.text(label).last);
    await tester.pumpAndSettle();
  }

  testWidgets('journal draft survives tab switching on a narrow screen', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final app = await boot(tester, (request) async {
      if (request.url.path.endsWith('/journal/list')) {
        return response({'dates': []});
      }
      if (request.url.path.endsWith('/journal/entry')) {
        return response({'entry': null});
      }
      return response({'chats': []});
    });
    await selectSection(tester, 'Дневник');
    await tester.scrollUntilVisible(
      find.byType(TextField),
      200,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Мой черновик');
    await selectSection(tester, 'Настройки');
    await selectSection(tester, 'Дневник');
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      'Мой черновик',
    );
    tester.platformDispatcher.textScaleFactorTestValue = 1.4;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    await app.setTheme(ThemeMode.light);
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'daily task moves from locked to opened to completed with server IDs',
    (tester) async {
      var status = 'locked';
      await boot(tester, (request) async {
        if (request.url.path.endsWith('/daily-task/open') ||
            request.url.path.endsWith('/daily-task/complete')) {
          expect(request.method, 'PUT');
          expect(jsonDecode(request.body)['taskId'], 42);
          status = request.url.path.endsWith('/open') ? 'opened' : 'completed';
          return response({'success': true, 'status': status});
        }
        if (request.url.path.endsWith('/daily-task')) {
          return response({
            'task': {
              'id': 42,
              'status': status,
              'title': 'Прогулка',
              'description': 'Погуляйте',
              'streak': 3,
            },
          });
        }
        return response({'chats': []});
      });
      await selectSection(tester, 'Маленькие шаги');
      await tester.tap(find.text('Открыть задание'));
      await tester.pumpAndSettle();
      expect(
        find.text('Прогулка'),
        findsOneWidget,
        reason: tester
            .widgetList<Text>(find.byType(Text))
            .map((w) => w.data)
            .join(' | '),
      );
      await tester.tap(find.text('Я выполнил(а)'));
      await tester.pumpAndSettle();
      expect(status, 'completed');
      expect(find.text('Выполнено. Вы позаботились о себе!'), findsOneWidget);
    },
  );

  testWidgets('journal saves today with correct date and becomes read-only', (
    tester,
  ) async {
    Json? saved;
    await boot(tester, (request) async {
      if (request.url.path.endsWith('/journal/list')) {
        return response({'dates': []});
      }
      if (request.url.path.endsWith('/journal/entry')) {
        if (request.method == 'POST') {
          saved = jsonDecode(request.body) as Json;
          expect(saved!['date'], matches(RegExp(r'^\d{4}-\d{2}-\d{2}$')));
          return response({'success': true, 'id': 1});
        }
        return response({
          'entry': saved == null ? null : {'diary_content': saved!['content']},
        });
      }
      return response({'chats': []});
    });
    await selectSection(tester, 'Дневник');
    await tester.scrollUntilVisible(
      find.byType(TextField),
      200,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Хороший день');
    await tester.ensureVisible(find.text('Сохранить запись'));
    await tester.tap(find.text('Сохранить запись'));
    await tester.pumpAndSettle();
    expect(saved?['content'], 'Хороший день');
    expect(find.byType(TextField), findsNothing);
    await tester.scrollUntilVisible(
      find.text('Хороший день'),
      200,
      scrollable: find.byType(Scrollable).last,
    );
    expect(find.text('Хороший день'), findsOneWidget);
  });

  testWidgets('inbox sends a wish and applies server cooldown', (tester) async {
    var sent = false;
    await boot(tester, (request) async {
      if (request.url.path.endsWith('/inbox/received')) {
        return response({'messages': []});
      }
      if (request.url.path.endsWith('/inbox/can-send')) {
        return response({'canSend': !sent, 'minutesLeft': 480});
      }
      if (request.url.path.endsWith('/inbox/send')) {
        expect(jsonDecode(request.body)['message'], 'Хорошего дня!');
        sent = true;
        return response({'success': true});
      }
      return response({'chats': []});
    });
    await selectSection(tester, 'Сообщения');
    await tester.tap(find.text('Написать'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Хорошего дня!');
    await tester.ensureVisible(find.text('Отправить пожелание'));
    await tester.tap(find.text('Отправить пожелание'));
    await tester.pumpAndSettle();
    expect(sent, isTrue);
    expect(
      find.text('Следующее пожелание через 480 мин.'),
      findsOneWidget,
      reason: tester
          .widgetList<Text>(find.byType(Text))
          .map((w) => w.data)
          .join(' | '),
    );
    expect(find.text('Отправить пожелание'), findsNothing);
  });

  testWidgets('changing language updates the UI and persists the preference', (
    tester,
  ) async {
    final app = await boot(tester, (_) async => response({'chats': []}));
    await selectSection(tester, 'Настройки');
    await tester.scrollUntilVisible(
      find.text('Язык'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Язык'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('English'));
    await tester.pumpAndSettle();
    expect(find.text('App language'), findsOneWidget);
    expect(app.preferences.getString('language'), 'en');
  });
}
