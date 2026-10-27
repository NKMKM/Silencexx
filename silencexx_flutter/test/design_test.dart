import 'dart:convert';
import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:silencexx/core/api.dart';
import 'package:silencexx/core/chat_workspace.dart';
import 'package:silencexx/core/app_state.dart';
import 'package:silencexx/core/theme.dart';
import 'package:silencexx/main.dart';
import 'package:silencexx/screens/auth_screen.dart';
import 'package:silencexx/screens/home_screen.dart';
import 'package:silencexx/screens/chat_screen.dart';
import 'package:silencexx/screens/disclaimer_screen.dart';
import 'package:silencexx/screens/inbox_screen.dart';
import 'package:silencexx/screens/panic_screen.dart';
import 'package:silencexx/screens/settings_screen.dart';
import 'package:silencexx/screens/subscription_screen.dart';
import 'package:silencexx/screens/tasks_screen.dart';
import 'package:silencexx/screens/wellness_onboarding_screen.dart';
import 'package:silencexx/widgets/common.dart';
import 'package:silencexx/widgets/app_navigation.dart';
import 'package:silencexx/widgets/conversation_sidebar.dart';
import 'package:silencexx/widgets/glass.dart';

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

  Future<AppState> makeState({bool populated = false}) async {
    SharedPreferences.setMockInitialValues({});
    String? savedJournal;
    final app = AppState(
      preferences: await SharedPreferences.getInstance(),
      api: Api(
        client: MockClient((request) async {
          if (request.url.path.endsWith('/journal/entry') &&
              request.method == 'POST') {
            savedJournal =
                (jsonDecode(request.body) as Json)['content'] as String?;
          }
          return http.Response(
            jsonEncode({
              'chats': [
                {
                  'id': 1,
                  'last_message': 'Пауза после долгого дня',
                  'last_message_date': '2026-10-10T17:30:00Z',
                },
              ],
              'dates': populated
                  ? [
                      {
                        'date': dateKey(
                          DateTime.now().subtract(const Duration(days: 1)),
                        ),
                      },
                    ]
                  : [],
              'entry': savedJournal != null
                  ? {'diary_content': savedJournal}
                  : populated &&
                        request.url.queryParameters['date'] != null &&
                        request.url.queryParameters['date'] !=
                            dateKey(DateTime.now())
                  ? {
                      'diary_content':
                          'Сегодня удалось остановиться и заметить, что поддерживает меня. Иногда достаточно одного спокойного шага.',
                    }
                  : null,
              'messages': request.url.path.contains('/chats/1/messages')
                  ? [
                      {
                        'id': 'messages:1',
                        'role': 'user',
                        'type': 'text',
                        'text':
                            'Сегодня было много дел. Хочется немного выдохнуть.',
                        'created_at': '2026-10-10T17:30:00Z',
                      },
                      {
                        'id': 'messages:2',
                        'role': 'assistant',
                        'type': 'text',
                        'text':
                            'Давай оставим эту минуту только для тебя. Что сейчас больше всего занимает мысли?',
                        'created_at': '2026-10-10T17:30:05Z',
                      },
                    ]
                  : populated &&
                        (request.url.path.endsWith('/inbox/received') ||
                            request.url.path.endsWith('/inbox/can-send'))
                  ? [
                      {
                        'id': 21,
                        'message':
                            'Пусть сегодня найдётся место для того, что радует именно тебя. Тебе не нужно успевать всё сразу.',
                        'sent_at': DateTime.now().toIso8601String(),
                        'is_read': false,
                      },
                    ]
                  : [],
              'canSend': true,
              'aiFeedback':
                  populated &&
                      request.url.path.endsWith('/journal/entry') &&
                      request.method == 'POST'
                  ? 'Мысли сохранены. Спасибо, что нашли время для себя.'
                  : null,
              'sessionId': 'visual-review',
              'initialMessage': 'Давай сделаем небольшую паузу.',
              'aiResponse':
                  'Почувствуй, что помогает тебе быть здесь и сейчас.',
              'task': {
                'id': 42,
                'status': 'locked',
                'streak': 3,
                'title': 'Прогулка без спешки',
                'description':
                    'Пройдись в комфортном темпе и обрати внимание на три приятные детали вокруг. Можно начать с нескольких шагов.',
              },
              'subscription': {'name': 'Free', 'slug': 'free'},
              'limits': {
                'dailyChatUsed': 4,
                'dailyChatLimit': 20,
                'dailyVoiceUsed': 1,
                'dailyVoiceLimit': 3,
                'dailyAnalysisUsed': 0,
                'dailyAnalysisLimit': 2,
                'dailyJournalUsed': 0,
                'dailyJournalLimit': 1,
              },
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
              'sessions': [
                {
                  'id': 1,
                  'device_type': 'iPhone',
                  'is_current': true,
                  'last_active': '2026-10-10',
                  'session_ip': '192.0.2.1',
                },
                {
                  'id': 2,
                  'device_type': 'Browser',
                  'is_current': false,
                  'last_active': '2026-10-09',
                  'session_ip': '192.0.2.2',
                },
              ],
              'user': {'name': 'Александр'},
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }),
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
      expect(find.text('Пароль'), findsOneWidget);
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

  testWidgets(
    'daily entrance, library and focused conversation form distinct routes',
    (tester) async {
      viewport(tester, const Size(390, 844));
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await mount(tester, SilenceApp(state: await makeState(populated: true)));
      await tester.pumpAndSettle();
      expect(find.byType(ChatScreen), findsNothing);
      await capture(tester, 'today-mobile');
      await selectSection(tester, 'Разговоры');
      expect(find.byType(ConversationSidebar), findsOneWidget);
      expect(find.byType(ChatScreen), findsNothing);
      await capture(tester, 'conversations-mobile');
      await tester.tap(find.byTooltip('Новый чат'));
      await tester.pumpAndSettle();
      expect(find.byType(AppNavigation), findsNothing);
      final input = find.byKey(const ValueKey('chat-input'));
      await tester.enterText(input, 'Черновик отдельного разговора');
      tester.testTextInput.hide();
      await tester.pumpAndSettle();
      await capture(tester, 'conversation-focused-mobile');
      await tester.tap(find.byTooltip('Назад'));
      await tester.pumpAndSettle();
      expect(find.byType(AppNavigation), findsOneWidget);
      await tester.tap(find.text('Продолжить черновик'));
      await tester.pumpAndSettle();
      expect(
        tester.widget<TextField>(input).controller!.text,
        'Черновик отдельного разговора',
      );
      await selectSection(tester, 'Дневник');
      expect(find.byType(TextField), findsNothing);
      await capture(tester, 'journal-collection-mobile');
      await writeJournal(tester);
      expect(find.byType(TextField), findsOneWidget);
      await capture(tester, 'journal-writing-mobile');
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(find.text('История записей'), findsOneWidget);
      expect(find.byTooltip('Дневник'), findsWidgets);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('new entry screens fit all widths, themes and large type', (
    tester,
  ) async {
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    for (final size in [
      const Size(320, 720),
      const Size(390, 844),
      const Size(768, 1024),
      const Size(1280, 900),
    ]) {
      viewport(tester, size);
      for (final light in [false, true]) {
        tester.platformDispatcher.textScaleFactorTestValue = size.width == 320
            ? 2
            : 1;
        final state = await makeState(populated: true);
        await state.setTheme(light ? ThemeMode.light : ThemeMode.dark);
        await tester.pumpWidget(const SizedBox.shrink());
        await mount(tester, SilenceApp(state: state));
        await tester.pumpAndSettle();
        final suffix = '${size.width.toInt()}-${light ? 'light' : 'dark'}';
        await capture(tester, 'today-$suffix');
        expect(tester.takeException(), isNull, reason: 'today $suffix');
        await selectSection(tester, 'Разговоры');
        await capture(tester, 'conversations-$suffix');
        expect(tester.takeException(), isNull, reason: 'library $suffix');
        await selectSection(tester, 'Дневник');
        await capture(tester, 'journal-collection-$suffix');
        expect(tester.takeException(), isNull, reason: 'journal $suffix');
      }
    }
  });

  testWidgets('desktop library filters conversations and opens a result', (
    tester,
  ) async {
    viewport(tester, const Size(1280, 900));
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await mount(tester, SilenceApp(state: await makeState()));
    await tester.pumpAndSettle();
    expect(find.text('Можно просто\nбыть собой.'), findsOneWidget);
    await selectSection(tester, 'Разговоры');
    final search = find.widgetWithText(TextField, 'Поиск в истории');
    await tester.enterText(search, 'несуществующий разговор');
    await tester.pumpAndSettle();
    expect(find.text('Пауза после долгого дня'), findsNothing);
    await tester.enterText(search, 'пауза');
    await tester.pumpAndSettle();
    expect(find.text('Пауза после долгого дня'), findsWidgets);
    await tester.tap(find.text('Пауза после долгого дня').first);
    await tester.pumpAndSettle();
    expect(
      find.text('Сегодня было много дел. Хочется немного выдохнуть.'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

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
      await writeJournal(tester);
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
      await selectSection(tester, 'Чат');
      await tester.pumpAndSettle();
      await capture(tester, 'home-mobile');
      await selectSection(tester, 'Настройки');
      await capture(tester, 'settings-mobile');
      await selectSection(tester, 'Практики');
      await capture(tester, 'tasks-mobile');
      await selectSection(tester, 'Сообщения');
      await capture(tester, 'inbox-mobile');
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
      final previousErrorHandler = FlutterError.onError;
      FlutterError.onError = (details) {
        debugPrint(details.toString());
        previousErrorHandler?.call(details);
      };
      addTearDown(() => FlutterError.onError = previousErrorHandler);

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
        const Size(390, 844),
        const Size(844, 390),
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
                  locale: const Locale('ru'),
                  supportedLocales: const [Locale('ru'), Locale('en')],
                  localizationsDelegates: GlobalMaterialLocalizations.delegates,
                  theme: auroraTheme(brightness),
                  home: Scaffold(
                    key: ValueKey('${page.key}-$size-$brightness'),
                    body: MediaQuery(
                      data: MediaQueryData(
                        size: size,
                        textScaler: TextScaler.linear(
                          size.width == 320 ? 2.0 : 1.15,
                        ),
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
            if (brightness == Brightness.light && size.width == 390) {
              await capture(tester, '${page.key}-390-light');
            }
            if (brightness == Brightness.dark) {
              await capture(tester, '${page.key}-${size.width.toInt()}');
              if (size.width == 390) {
                if (page.key == 'auth') {
                  await tester.ensureVisible(find.text('Вход'));
                  await tester.tap(find.text('Вход'));
                  await tester.pumpAndSettle();
                  await capture(tester, 'auth-login-390');
                  await tester.ensureVisible(find.text('Войти по email'));
                  await tester.tap(find.text('Войти по email'));
                  await tester.pumpAndSettle();
                  await capture(tester, 'auth-validation-error-390');
                }
                if (page.key == 'profile') {
                  await tester.scrollUntilVisible(
                    find.text('Смена пароля'),
                    200,
                    scrollable: find
                        .byWidgetPredicate(
                          (w) =>
                              w is Scrollable &&
                              w.axisDirection == AxisDirection.down,
                        )
                        .last,
                  );
                  await tester.tap(find.text('Смена пароля'));
                  await tester.pumpAndSettle();
                  await capture(tester, 'profile-security-390');
                }
                if (page.key == 'inbox') {
                  await tester.tap(find.text('Написать'));
                  await tester.pumpAndSettle();
                  await capture(tester, 'inbox-compose-390');
                }
                if (page.key == 'subscription') {
                  await tester.scrollUntilVisible(
                    find.text('Сравнить тарифы'),
                    200,
                    scrollable: find
                        .byWidgetPredicate(
                          (w) =>
                              w is Scrollable &&
                              w.axisDirection == AxisDirection.down,
                        )
                        .last,
                  );
                  await tester.pumpAndSettle();
                  await capture(tester, 'subscription-plans-390');
                }
                expect(
                  tester.takeException(),
                  isNull,
                  reason: 'Expanded ${page.key}',
                );
              }
            }
          }
        }
      }
    },
  );

  testWidgets(
    'full visual walkthrough of editors, menus, archives and support stages',
    (tester) async {
      viewport(tester, const Size(390, 844));
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final state = await makeState(populated: true);
      await mount(tester, SilenceApp(state: state));
      await tester.pumpAndSettle();
      if (find.byType(ChatScreen).evaluate().isEmpty) {
        await tester.tap(find.text('Начать разговор'));
        await tester.pumpAndSettle();
      }
      final chat = tester.state<ChatScreenState>(find.byType(ChatScreen));
      final logo = await rootBundle.load('assets/images/cloudmind_icon.png');
      chat.session.attachments.add(
        DraftAttachment(name: 'image.png', bytes: logo.buffer.asUint8List()),
      );
      chat.sessionChanged();
      await tester.pumpAndSettle();
      await capture(tester, 'chat-image-preview-unsupported');
      await tester.tap(find.byTooltip('Удалить вложение'));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Добавить вложение'));
      await tester.pumpAndSettle();
      await capture(tester, 'chat-attachment-tools');
      await tester.tap(find.text('Как вы сейчас?'));
      await tester.pumpAndSettle();
      await capture(tester, 'chat-mood-picker');
      await tester.tap(find.text('Тревожно').last);
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Назад'));
      await tester.pumpAndSettle();
      await capture(tester, 'chat-library-populated');
      await tester.tap(find.byTooltip('Действия с разговором').first);
      await tester.pumpAndSettle();
      await capture(tester, 'chat-library-actions');
      await tester.tap(find.text('Переименовать'));
      await tester.pumpAndSettle();
      await capture(tester, 'chat-rename-dialog');
      await tester.tap(find.text('Отмена'));
      await tester.pumpAndSettle();

      await selectSection(tester, 'Дневник');
      await capture(tester, 'journal-archive-populated');
      await tester.tap(
        find.text(dateKey(DateTime.now().subtract(const Duration(days: 1)))),
      );
      await tester.pumpAndSettle();
      await capture(tester, 'journal-archive-reading');
      await capture(tester, 'journal-saved-entry');
      await tester.tap(find.text('${DateTime.now().day}').last);
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byType(TextField),
        'Одна важная мысль на сегодня.',
      );
      await tester.tap(find.text('Сохранить запись'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 350));
      await capture(tester, 'journal-save-feedback');
      await tester.tap(find.text('OK'));
      await tester.pumpAndSettle();
      await capture(tester, 'journal-save-success');

      await selectSection(tester, 'Практики');
      final press = await tester.startGesture(
        tester.getCenter(find.text('Начать практику')),
      );
      await tester.pump(const Duration(milliseconds: 90));
      await capture(tester, 'practice-action-pressed');
      await press.cancel();
      await tester.pumpAndSettle();
      await tester.tap(find.text('Начать практику'));
      await tester.pumpAndSettle();
      await capture(tester, 'practice-opened');
      await tester.tap(find.text('Завершить практику'));
      await tester.pumpAndSettle();
      await capture(tester, 'practice-completed');

      await selectSection(tester, 'Сообщения');
      await capture(tester, 'inbox-populated');
      await tester.tap(find.text('Открыть пожелание'));
      await tester.pumpAndSettle();
      await capture(tester, 'inbox-letter-reading');
      await tester.tap(find.byTooltip('Закрыть').last);
      await tester.pumpAndSettle();
      await capture(tester, 'inbox-read-state');

      Navigator.of(
        tester.element(find.byType(HomeScreen)),
      ).push(MaterialPageRoute<void>(builder: (_) => const PanicScreen()));
      await tester.pumpAndSettle();
      await capture(tester, 'support-intro');
      await tester.tap(find.text('Начать паузу'));
      await tester.pumpAndSettle();
      for (var step = 0; step < 10; step++) {
        await capture(tester, 'support-stage-$step');
        await tester.tap(find.text(step == 9 ? 'Завершить' : 'Дальше'));
        await tester.pumpAndSettle();
      }
      await capture(tester, 'support-complete');
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  if (const String.fromEnvironment('DESIGN_REVIEW_DIR').isNotEmpty) {
    testWidgets('capture real navigation animation frames', (tester) async {
      viewport(tester, const Size(390, 844));
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final state = await makeState(populated: true);
      await mount(tester, SilenceApp(state: state));
      await tester.pumpAndSettle();
      tester.platformDispatcher.accessibilityFeaturesTestValue =
          const FakeAccessibilityFeatures(disableAnimations: false);
      await tester.pumpAndSettle();
      await tester.tap(
        find
            .descendant(
              of: find.byType(AppNavigation),
              matching: find.byTooltip('Практики'),
            )
            .last,
      );
      await tester.pump();
      for (var frame = 0; frame < 9; frame++) {
        if (frame > 0) await tester.pump(const Duration(milliseconds: 50));
        await capture(
          tester,
          'motion-navigation-${frame.toString().padLeft(2, '0')}',
        );
      }
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  }

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
  testWidgets(
    'mobile navigation adapts to large text and keyboard without losing draft',
    (tester) async {
      viewport(tester, const Size(320, 720));
      tester.platformDispatcher.textScaleFactorTestValue = 2;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetViewInsets);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      final state = await makeState();
      await mount(tester, SilenceApp(state: state));
      await tester.pumpAndSettle();
      expect(find.byType(AppNavigation), findsOneWidget);
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
      await tester.enterText(find.byType(TextField), 'Черновик с клавиатурой');
      tester.view.viewInsets = const FakeViewPadding(bottom: 280);
      await tester.pumpAndSettle();
      expect(find.byType(AppNavigation), findsNothing);
      expect(tester.takeException(), isNull);
      tester.view.resetViewInsets();
      await tester.pumpAndSettle();
      await selectSection(tester, 'Настройки');
      await selectSection(tester, 'Дневник');
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller!.text,
        'Черновик с клавиатурой',
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('async panel exposes loading, error and successful retry', (
    tester,
  ) async {
    final state = await makeState();
    final pending = Completer<Map<String, dynamic>>();
    var calls = 0;
    await mount(
      tester,
      AppScope(
        state: state,
        child: MaterialApp(
          theme: auroraTheme(Brightness.dark),
          home: Scaffold(
            body: AsyncPanel(
              load: () {
                calls++;
                return calls == 1
                    ? pending.future
                    : Future.value({'ready': true});
              },
              builder: (context, data, reload) =>
                  Text(data['ready'] == true ? 'Loaded' : 'Missing'),
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    expect(find.byType(AppLoadingState), findsOneWidget);
    await capture(tester, 'state-loading');
    pending.completeError(StateError('Connection unavailable'));
    await tester.pumpAndSettle();
    expect(find.text('Не удалось загрузить данные'), findsOneWidget);
    await capture(tester, 'state-error');
    await tester.tap(find.text('Повторить'));
    await tester.pumpAndSettle();
    expect(find.text('Loaded'), findsOneWidget);
    await capture(tester, 'state-retry-success');
    expect(calls, 2);
    expect(tester.takeException(), isNull);
  });

  testWidgets('chat actions open a styled sheet and keep commands reachable', (
    tester,
  ) async {
    final state = await makeState();
    var openedCommands = false;
    await mount(
      tester,
      AppScope(
        state: state,
        child: MaterialApp(
          theme: auroraTheme(Brightness.dark),
          home: Scaffold(
            body: ChatScreen(
              chatId: 1,
              onCommands: () => openedCommands = true,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Действия'));
    await tester.pumpAndSettle();
    expect(find.text('Действия чата'), findsOneWidget);
    expect(find.text('Быстрые действия'), findsOneWidget);
    expect(find.text('Поддержка рядом'), findsOneWidget);
    await tester.tap(find.text('Быстрые действия'));
    await tester.pumpAndSettle();
    expect(openedCommands, isTrue);
    expect(tester.takeException(), isNull);
  });

  testWidgets('dragging the conversation dismisses the keyboard', (
    tester,
  ) async {
    addTearDown(tester.view.resetViewInsets);
    final state = await makeState();
    await mount(
      tester,
      AppScope(
        state: state,
        child: MaterialApp(
          theme: auroraTheme(Brightness.dark),
          home: Scaffold(body: ChatScreen(chatId: 1)),
        ),
      ),
    );
    await tester.pumpAndSettle();
    final chat = tester.state<ChatScreenState>(find.byType(ChatScreen));
    chat.session.messages.addAll([
      for (var i = 0; i < 12; i++)
        {
          'id': 'extra-$i',
          'role': i.isEven ? 'user' : 'assistant',
          'type': 'text',
          'text': List.filled(
            5,
            'Дополнительное тестовое сообщение номер $i.',
          ).join(' '),
          'created_at': '2026-10-10T17:31:00Z',
        },
    ]);
    chat.sessionChanged();
    await tester.pumpAndSettle();
    final composer = find.byType(TextField).last;
    await tester.tap(composer);
    await tester.showKeyboard(composer);
    tester.view.viewInsets = const FakeViewPadding(bottom: 260);
    await tester.pumpAndSettle();
    expect(chat.inputFocus.hasFocus, isTrue);
    await tester.drag(find.byType(ListView).first, const Offset(0, -240));
    await tester.pumpAndSettle();
    expect(chat.inputFocus.hasFocus, isFalse);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'dragging the empty welcome also dismisses the keyboard without losing the draft',
    (tester) async {
      viewport(tester, const Size(390, 844));
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetViewInsets);
      final state = await makeState();
      await mount(tester, SilenceApp(state: state));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Начать разговор'));
      await tester.pumpAndSettle();
      final input = find.byKey(const ValueKey('chat-input'));
      await tester.enterText(input, 'Не потерять эту мысль');
      await tester.showKeyboard(input);
      tester.view.viewInsets = const FakeViewPadding(bottom: 260);
      await tester.pumpAndSettle();
      final chat = tester.state<ChatScreenState>(find.byType(ChatScreen));
      expect(chat.inputFocus.hasFocus, isTrue);
      await tester.drag(find.text('Что сейчас у тебя?'), const Offset(0, 120));
      await tester.pumpAndSettle();
      expect(chat.inputFocus.hasFocus, isFalse);
      expect(chat.input.text, 'Не потерять эту мысль');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'one primary navigator at every breakpoint and contextual history only',
    (tester) async {
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final state = await makeState();
      for (final size in [
        const Size(390, 844),
        const Size(768, 1024),
        const Size(1280, 900),
      ]) {
        viewport(tester, size);
        await mount(tester, SilenceApp(state: state));
        await tester.pumpAndSettle();
        expect(find.byType(AppNavigation), findsOneWidget);
        expect(
          tester.widget<AppNavigation>(find.byType(AppNavigation)).vertical,
          size.width >= 700,
        );
        if (size.width < 700) {
          final dock = find.byKey(const ValueKey('mobile-primary-dock'));
          expect(dock, findsOneWidget);
          expect(tester.getSize(dock).width, size.width - 28);
          expect(
            find.descendant(of: dock, matching: find.byType(GlassSurface)),
            findsNothing,
          );
        }
        await selectSection(tester, 'Чат');
        if (size.width == 390) {
          await capture(tester, 'chat-empty-390');
        }

        final library = find.byType(ConversationSidebar);
        expect(library, findsOneWidget);
        for (final title in ['Дневник', 'Практики', 'Сообщения', 'Настройки']) {
          expect(
            find.descendant(of: library, matching: find.text(title)),
            findsNothing,
          );
        }
        await capture(tester, 'history-${size.width.toInt()}');

        if (size.width == 390) {
          await tester.tap(find.text('Пауза после долгого дня').first);
          await tester.pumpAndSettle();
          await capture(tester, 'chat-active-390');
        }
        expect(tester.takeException(), isNull);
      }
    },
  );
}
