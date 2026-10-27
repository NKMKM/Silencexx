import 'package:silencexx/widgets/app_navigation.dart';
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
import 'package:silencexx/core/theme.dart';
import 'package:silencexx/screens/journal_screen.dart';
import 'package:silencexx/screens/tasks_screen.dart';
import 'package:silencexx/screens/inbox_screen.dart';
import 'package:silencexx/screens/panic_screen.dart';
import 'package:silencexx/screens/home_screen.dart';
import 'package:silencexx/widgets/common.dart';

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
    if (find.byType(AppNavigation).evaluate().isEmpty &&
        find.byTooltip('Назад').evaluate().isNotEmpty) {
      await tester.tap(find.byTooltip('Назад').first);
      await tester.pumpAndSettle();
    }
    final target = label == 'Чат'
        ? 'Разговоры'
        : label == 'Маленькие шаги'
        ? 'Практики'
        : label;
    if (target == 'Настройки') {
      await tester.tap(find.byTooltip('Сегодня').last);
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Настройки').last);
    } else {
      final item = find.descendant(
        of: find.byType(AppNavigation),
        matching: find.byTooltip(target),
      );
      await tester.ensureVisible(item.last);
      await tester.tap(item.last);
    }
    await tester.pumpAndSettle();
  }

  Future<void> writeJournal(WidgetTester tester) async {
    final button = find.text('Написать о сегодня');
    if (button.evaluate().isNotEmpty) {
      await tester.ensureVisible(button);
      await tester.pumpAndSettle();
      await tester.tap(button);
      await tester.pumpAndSettle();
    }
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
    await writeJournal(tester);
    await tester.scrollUntilVisible(
      find.byType(TextField),
      200,
      scrollable: find
          .byWidgetPredicate(
            (widget) =>
                widget is Scrollable &&
                widget.axisDirection == AxisDirection.down,
          )
          .last,
    );
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Мой черновик');
    await selectSection(tester, 'Настройки');
    tester.takeException();
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
      var taskLoads = 0;
      await boot(tester, (request) async {
        if (request.url.path.endsWith('/daily-task/open') ||
            request.url.path.endsWith('/daily-task/complete')) {
          expect(request.method, 'PUT');
          expect(jsonDecode(request.body)['taskId'], 42);
          status = request.url.path.endsWith('/open') ? 'opened' : 'completed';
          return response({'success': true, 'status': status});
        }
        if (request.url.path.endsWith('/daily-task')) {
          taskLoads++;
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
      await selectSection(tester, 'Практики');
      await tester.ensureVisible(find.text('Открыть практику'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Открыть практику'));
      await tester.pumpAndSettle();
      expect(taskLoads, 1, reason: 'Opening a task should update in place');
      expect(find.byType(AppLoadingState), findsNothing);
      expect(
        find.text('Прогулка'),
        findsOneWidget,
        reason: tester
            .widgetList<Text>(find.byType(Text))
            .map((w) => w.data)
            .join(' | '),
      );
      await tester.ensureVisible(find.text('Я выполнил(а)'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Я выполнил(а)'));
      await tester.pumpAndSettle();
      expect(status, 'completed');
      expect(find.text('Выполнено. Вы нашли время для себя.'), findsOneWidget);
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
    await writeJournal(tester);
    await tester.scrollUntilVisible(
      find.byType(TextField),
      200,
      scrollable: find
          .byWidgetPredicate(
            (widget) =>
                widget is Scrollable &&
                widget.axisDirection == AxisDirection.down,
          )
          .last,
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
      scrollable: find
          .byWidgetPredicate(
            (widget) =>
                widget is Scrollable &&
                widget.axisDirection == AxisDirection.down,
          )
          .last,
    );
    expect(find.text('Хороший день'), findsOneWidget);
  });

  testWidgets('journal archive expands a saved entry for reading', (
    tester,
  ) async {
    var requestedDate = '';
    await boot(tester, (request) async {
      if (request.url.path.endsWith('/journal/list')) {
        return response({
          'dates': [
            {'id': 7, 'date': '2026-10-09'},
          ],
        });
      }
      if (request.url.path.endsWith('/journal/entry')) {
        requestedDate = request.url.queryParameters['date'] ?? '';
        return response({
          'entry': {'diary_content': 'Вчера я нашёл время спокойно погулять.'},
        });
      }
      return response({'chats': []});
    });
    await selectSection(tester, 'Дневник');
    await tester.tap(find.text('2026-10-09'));
    await tester.pumpAndSettle();
    expect(requestedDate, '2026-10-09');
    expect(find.text('Вчера я нашёл время спокойно погулять.'), findsOneWidget);
    expect(find.byType(SelectableText), findsOneWidget);
    expect(find.byType(TextField), findsNothing);
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
    await Scrollable.ensureVisible(
      tester.element(find.text('Отправить пожелание')),
      alignment: 0.5,
    );
    await tester.pumpAndSettle();
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

  testWidgets('inbox opens the full wish and marks it read without reloading', (
    tester,
  ) async {
    var read = false;
    var listLoads = 0;
    await boot(tester, (request) async {
      if (request.url.path.endsWith('/inbox/received')) {
        listLoads++;
        return response({
          'messages': [
            {
              'id': 51,
              'message':
                  'Ты справился со многим. Пусть сегодня у тебя найдётся немного времени для отдыха.',
              'sent_at': '2026-10-10T10:00:00.000Z',
              'is_read': read,
            },
          ],
        });
      }
      if (request.url.path.endsWith('/messages/51/read')) {
        expect(request.method, 'PATCH');
        read = true;
        return response({'success': true});
      }
      if (request.url.path.endsWith('/inbox/can-send')) {
        return response({'canSend': true});
      }
      return response({'chats': []});
    });
    await selectSection(tester, 'Сообщения');
    await tester.tap(find.text('Открыть пожелание'));
    await tester.pumpAndSettle();
    expect(find.byType(SelectableText), findsOneWidget);
    expect(
      tester.widget<SelectableText>(find.byType(SelectableText)).data,
      contains('немного времени для отдыха'),
    );
    expect(read, isTrue);
    expect(
      listLoads,
      1,
      reason: 'Opening a message should not blank the inbox',
    );
  });

  testWidgets('changing language updates the UI and persists the preference', (
    tester,
  ) async {
    final app = await boot(tester, (_) async => response({'chats': []}));
    await selectSection(tester, 'Настройки');
    await tester.tap(find.text('Приложение'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Язык'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('English'));
    await tester.pumpAndSettle();
    expect(find.text('App language'), findsOneWidget);
    expect(app.preferences.getString('language'), 'en');
  });
  testWidgets('wellness workspaces fit narrow 2x text and landscape', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    final state = AppState(
      api: Api(
        client: MockClient((request) async {
          if (request.url.path.endsWith('/journal/list')) {
            return response({'dates': []});
          }
          if (request.url.path.endsWith('/journal/entry')) {
            return response({'entry': null});
          }
          if (request.url.path.endsWith('/daily-task')) {
            return response({
              'task': {'id': 42, 'status': 'locked', 'streak': 3},
            });
          }
          if (request.url.path.endsWith('/inbox/received')) {
            return response({'messages': []});
          }
          return response({'canSend': true});
        }),
      ),
      preferences: await SharedPreferences.getInstance(),
    );
    state.language = 'ru';
    addTearDown(state.api.close);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    tester.view.devicePixelRatio = 1;
    for (final size in [const Size(320, 720), const Size(844, 390)]) {
      tester.view.physicalSize = size;
      for (final page in [
        const JournalScreen(),
        const TasksScreen(),
        const InboxScreen(),
        const PanicScreen(),
      ]) {
        await tester.pumpWidget(
          AppScope(
            state: state,
            child: MaterialApp(
              theme: auroraTheme(Brightness.dark),
              home: Scaffold(
                key: UniqueKey(),
                body: MediaQuery(
                  data: MediaQueryData(
                    size: size,
                    textScaler: const TextScaler.linear(2),
                    disableAnimations: true,
                  ),
                  child: page,
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(
          tester.takeException(),
          isNull,
          reason: '${page.runtimeType} $size',
        );
        if (page is InboxScreen) {
          await tester.scrollUntilVisible(
            find.text('Написать'),
            100,
            scrollable: find
                .byWidgetPredicate(
                  (widget) =>
                      widget is Scrollable &&
                      widget.axisDirection == AxisDirection.down,
                )
                .first,
          );
          await tester.tap(find.text('Написать').first);
          await tester.pumpAndSettle();
          expect(
            tester.takeException(),
            isNull,
            reason: 'letter composer $size',
          );
        }
        if (page is JournalScreen) {
          await tester.scrollUntilVisible(find.text('История записей'), 160);
          await tester.pumpAndSettle();
          expect(find.text('История записей'), findsOneWidget);
          expect(find.byType(TextField), findsNothing);
          expect(
            tester.takeException(),
            isNull,
            reason: 'journal archive $size',
          );
        }
      }
    }
  });

  testWidgets('support pause keeps the breathing step focused on one screen', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await boot(tester, (request) async {
      if (request.url.path.endsWith('/panic/start')) {
        return response({
          'sessionId': 'pause-test',
          'initialMessage': 'Можно идти медленно.',
        });
      }
      if (request.url.path.endsWith('/panic/anxiety-level')) {
        return response({'ok': true});
      }
      if (request.url.path.endsWith('/panic/step')) {
        return response({'aiResponse': 'Оставь плечи мягкими.'});
      }
      return response({'ok': true});
    });

    Navigator.of(
      tester.element(find.byType(HomeScreen)),
    ).push(MaterialPageRoute<void>(builder: (_) => const PanicScreen()));
    await tester.pumpAndSettle();
    expect(find.text('Давай замедлимся'), findsOneWidget);
    expect(find.text('Начать паузу'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.tap(find.text('Начать паузу'));
    await tester.pumpAndSettle();
    expect(find.text('Оцените тревогу от 1 до 10'), findsOneWidget);
    expect(find.text('Дальше'), findsOneWidget);

    await tester.tap(find.text('Дальше'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 30));
    expect(find.byType(BreathingCircle), findsOneWidget);
    expect(find.text('Вдох'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(const SizedBox.shrink());
  });
}
