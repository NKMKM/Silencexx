import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:silencexx/core/api.dart';
import 'package:silencexx/core/app_state.dart';
import 'package:silencexx/core/theme.dart';
import 'package:silencexx/main.dart';
import 'package:silencexx/screens/auth_screen.dart';
import 'package:silencexx/screens/chat_screen.dart';
import 'package:silencexx/screens/disclaimer_screen.dart';
import 'package:silencexx/screens/inbox_screen.dart';
import 'package:silencexx/screens/panic_screen.dart';
import 'package:silencexx/screens/settings_screen.dart';
import 'package:silencexx/screens/subscription_screen.dart';
import 'package:silencexx/screens/tasks_screen.dart';
import 'package:silencexx/screens/wellness_onboarding_screen.dart';
import 'package:silencexx/widgets/common.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    final messenger =
        TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
    messenger.setMockMethodCallHandler(
      const MethodChannel('com.llfbandit.record/messages'),
      (_) async => null,
    );
    messenger.setMockMethodCallHandler(
      const MethodChannel('flutter_tts'),
      (_) async => 1,
    );
  });

  setUpAll(() async {
    // Optional local visual review uses a real font instead of the test font.
    const font = String.fromEnvironment('DESIGN_REVIEW_FONT');
    if (font.isNotEmpty) {
      final loader = FontLoader('Roboto')
        ..addFont(
          File(font).readAsBytes().then((bytes) => ByteData.sublistView(bytes)),
        );
      await loader.load();
      final fallback = FontLoader('Ahem')
        ..addFont(
          File(font).readAsBytes().then((bytes) => ByteData.sublistView(bytes)),
        );
      await fallback.load();
      final icons = FontLoader('MaterialIcons')
        ..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'));
      await icons.load();
    }
  });

  Future<AppState> makeState() async {
    SharedPreferences.setMockInitialValues({});
    final app = AppState(
      preferences: await SharedPreferences.getInstance(),
      api: Api(
        client: MockClient(
          (request) async => http.Response(
            jsonEncode({
              'chats': [],
              'dates': [],
              'entry': null,
              'messages': [],
              'canSend': true,
              'task': {'id': 42, 'status': 'locked', 'streak': 3},
              'subscription': {'name': 'Free', 'slug': 'free'},
              'limits': {},
              'plans': [
                {
                  'name': 'Plus',
                  'slug': 'plus',
                  'price_monthly': 499,
                  'description': 'Больше времени для себя',
                  'daily_chat_limit': 100,
                },
              ],
              'payments': [],
              'sessions': [],
              'user': {'name': 'Александр'},
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          ),
        ),
      ),
    );
    app.api.token = 'test';
    app.user = {'id': 1, 'name': 'Александр'};
    app.ready = true;
    app.disclaimerAccepted = true;
    app.language = 'ru';
    addTearDown(app.api.close);
    return app;
  }

  Future<void> mount(WidgetTester tester, Widget child) async {
    tester.platformDispatcher.accessibilityFeaturesTestValue =
        const FakeAccessibilityFeatures(disableAnimations: true);
    addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
    await tester.pumpWidget(
      RepaintBoundary(key: const ValueKey('review-root'), child: child),
    );
  }

  testWidgets(
    'fresh launch requires one-time disclaimer before provider sign-in',
    (tester) async {
      final state = await makeState();
      state.api.token = null;
      state.user = null;
      state.disclaimerAccepted = false;
      state.language = 'ru';
      await mount(tester, SilenceApp(state: state));
      await tester.pumpAndSettle();

      expect(find.byType(DisclaimerScreen), findsOneWidget);
      expect(find.text('Продолжить с Google'), findsNothing);
      await tester.ensureVisible(find.byType(FilledButton).last);
      await tester.tap(find.byType(FilledButton).last);
      await tester.pumpAndSettle();

      expect(state.disclaimerAccepted, isTrue);
      expect(find.text('Продолжить с Google'), findsOneWidget);
      expect(find.text('Телефон'), findsNothing);
      expect(find.text('Пароль'), findsNothing);
    },
  );

  void viewport(WidgetTester tester, Size size) {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1;
  }

  Future<void> capture(WidgetTester tester, String name) async {
    const directory = String.fromEnvironment('DESIGN_REVIEW_DIR');
    if (directory.isEmpty) return;
    await tester.runAsync(() async {
      await precacheImage(
        const AssetImage('assets/images/cloudmind_icon.png'),
        tester.element(find.byType(MaterialApp)),
      );
    });
    await tester.pump();
    await tester.runAsync(() async {
      final boundary = tester.renderObject<RenderRepaintBoundary>(
        find.byKey(const ValueKey('review-root')),
      );
      final image = await boundary.toImage();
      final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
      await Directory(directory).create(recursive: true);
      await File(
        '$directory/$name.png',
      ).writeAsBytes(bytes!.buffer.asUint8List());
      image.dispose();
    });
  }

  Future<void> selectSection(WidgetTester tester, String label) async {
    if (find.text(label).hitTestable().evaluate().isEmpty) {
      await tester.tap(find.byTooltip('Открыть меню'));
      await tester.pumpAndSettle();
    }
    await tester.tap(find.text(label).last);
    await tester.pumpAndSettle();
  }

  testWidgets(
    'sidebar collapse and viewport changes preserve the journal draft',
    (tester) async {
      viewport(tester, const Size(1280, 900));
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final state = await makeState();
      await mount(tester, SilenceApp(state: state));
      await tester.pumpAndSettle();
      await capture(tester, 'home-desktop');
      await selectSection(tester, 'Дневник');
      await tester.enterText(find.byType(TextField), 'Сохранить мой черновик');
      await tester.tap(find.byTooltip('Свернуть меню'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await capture(tester, 'journal-desktop');
      viewport(tester, const Size(390, 844));
      await tester.pumpAndSettle();
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller!.text,
        'Сохранить мой черновик',
      );
      await capture(tester, 'journal-mobile');
      await tester.tap(find.byTooltip('Вернуться в чат'));
      await tester.pumpAndSettle();
      await capture(tester, 'home-mobile');
      await selectSection(tester, 'Настройки');
      await capture(tester, 'settings-mobile');
      viewport(tester, const Size(1280, 900));
      await tester.pumpAndSettle();
      await selectSection(tester, 'Дневник');
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller!.text,
        'Сохранить мой черновик',
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'all secondary screens fit mobile, tablet and desktop in both themes',
    (tester) async {
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final state = await makeState();
      final pages = <String, Widget>{
        'auth': const AuthScreen(),
        'disclaimer': const DisclaimerScreen(),
        'wellness-onboarding': const WellnessOnboardingScreen(),
        'privacy': const PrivacyScreen(),
        'safety-about': const SafetyAboutScreen(),
        'tasks': const TasksScreen(),
        'inbox': const InboxScreen(),
        'support': const PanicScreen(),
        'subscription': const SubscriptionScreen(),
        'payment': const PaymentScreen(
          plan: {'id': 1, 'name': 'Plus', 'price_monthly': 499},
        ),
        'profile': const ProfileScreen(),
        'sessions': const SessionsScreen(),
        'language': const LanguageScreen(),
        'reminders': const ReminderScreen(),
        'chat': const ChatScreen(chatId: 1),
      };
      for (final size in [
        const Size(320, 720),
        const Size(768, 1024),
        const Size(1280, 900),
      ]) {
        viewport(tester, size);
        for (final brightness in Brightness.values) {
          for (final page in pages.entries) {
            await mount(
              tester,
              AppScope(
                state: state,
                child: MaterialApp(
                  debugShowCheckedModeBanner: false,
                  theme: auroraTheme(brightness),
                  home: Scaffold(
                    key: ValueKey('${page.key}-$size-$brightness'),
                    body: MediaQuery(
                      data: MediaQueryData(
                        size: size,
                        textScaler: TextScaler.linear(1.15),
                        disableAnimations: true,
                      ),
                      child: page.value,
                    ),
                  ),
                ),
              ),
            );
            await tester.pumpAndSettle();
            expect(
              tester.takeException(),
              isNull,
              reason: '${page.key} $size $brightness',
            );
            if (brightness == Brightness.dark) {
              await capture(tester, '${page.key}-${size.width.toInt()}');
            }
          }
        }
      }
    },
  );

  testWidgets(
    'reduced motion and high contrast dialog supports keyboard dismissal',
    (tester) async {
      final state = await makeState();
      await mount(
        tester,
        AppScope(
          state: state,
          child: MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: auroraTheme(Brightness.dark),
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(
                context,
              ).copyWith(disableAnimations: true, highContrast: true),
              child: child!,
            ),
            home: Scaffold(
              body: Builder(
                builder: (context) => TextButton(
                  onPressed: () => confirm(context, 'Удалить разговор?'),
                  child: const Text('Open'),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      expect(find.text('Удалить разговор?'), findsOneWidget);
      await capture(tester, 'confirmation-dialog');
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(find.text('Удалить разговор?'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
}
