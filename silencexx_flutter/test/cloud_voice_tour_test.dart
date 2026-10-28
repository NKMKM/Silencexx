import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:silencexx/core/api.dart';
import 'package:silencexx/core/app_state.dart';
import 'package:silencexx/core/chat_workspace.dart';
import 'package:silencexx/core/theme.dart';
import 'package:silencexx/main.dart';
import 'package:silencexx/screens/chat_screen.dart';
import 'package:silencexx/widgets/cloud_companion.dart';
import 'package:silencexx/widgets/product_tour.dart';
import 'package:silencexx/widgets/app_navigation.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async {
    const font = String.fromEnvironment('DESIGN_REVIEW_FONT');
    if (font.isNotEmpty) {
      final bytes = await File(font).readAsBytes();
      for (final family in ['Roboto', 'Ahem']) {
        await (FontLoader(
          family,
        )..addFont(Future.value(ByteData.sublistView(bytes)))).load();
      }
      await (FontLoader(
        'MaterialIcons',
      )..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'))).load();
    }
  });
  Future<AppState> state() async {
    FlutterSecureStorage.setMockInitialValues({});
    SharedPreferences.setMockInitialValues({});
    final app = AppState(
      api: Api(
        client: MockClient(
          (req) async => http.Response(
            jsonEncode({
              'success': true,
              'chats': [],
              'messages': [],
              'dates': [],
              'entry': null,
              'task': null,
              'receivedMessages': [],
              'canSend': true,
              'canReceive': true,
              'user': {'id': 2},
            }),
            200,
            headers: {'content-type': 'application/json'},
          ),
        ),
      ),
      preferences: await SharedPreferences.getInstance(),
    );
    app.user = {'id': 1, 'name': 'Test'};
    app.api.token = 'fixture';
    app.ready = true;
    app.disclaimerAccepted = true;
    app.language = 'ru';
    addTearDown(app.api.close);
    return app;
  }

  void viewport(WidgetTester tester, Size size) {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    tester.platformDispatcher.accessibilityFeaturesTestValue =
        const FakeAccessibilityFeatures(disableAnimations: true);
    addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
    final messenger =
        TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
    messenger.setMockMethodCallHandler(
      const MethodChannel('flutter_tts'),
      (_) async => 1,
    );
    messenger.setMockMethodCallHandler(
      const MethodChannel('com.llfbandit.record/messages'),
      (_) async => null,
    );
  }

  Future<void> mount(WidgetTester tester, Widget child) => tester.pumpWidget(
    RepaintBoundary(key: const ValueKey('cloud-review'), child: child),
  );
  Future<void> capture(WidgetTester tester, String name) async {
    const dir = String.fromEnvironment('CLOUD_REVIEW_DIR');
    if (dir.isEmpty) return;
    await tester.pump();
    await tester.runAsync(() async {
      final box = tester.renderObject<RenderRepaintBoundary>(
        find.byKey(const ValueKey('cloud-review')),
      );
      final pic = await box.toImage();
      final bytes = await pic.toByteData(format: ui.ImageByteFormat.png);
      await Directory(dir).create(recursive: true);
      await File('$dir/$name.png').writeAsBytes(bytes!.buffer.asUint8List());
      pic.dispose();
    });
  }

  test(
    'new accounts on the same device each receive resumable onboarding and a tour',
    () async {
      final app = await state();
      await app.acceptAuth({
        'token': 'first',
        'isNewUser': true,
        'user': {'id': 1},
      });
      expect(app.needsOnboarding, isTrue);
      await app.finishOnboarding();
      expect(app.needsProductTour, isTrue);
      await app.finishProductTour();
      expect(app.needsProductTour, isFalse);
      await app.acceptAuth({
        'token': 'second',
        'isNewUser': true,
        'user': {'id': 2},
      });
      expect(
        app.needsOnboarding,
        isTrue,
        reason: 'A global completion flag must not skip a new account',
      );
      await app.restore();
      expect(app.needsOnboarding, isTrue);
      await app.finishOnboarding();
      await app.restore();
      expect(app.needsProductTour, isTrue);
      await app.finishProductTour();
      await app.restore();
      expect(app.needsProductTour, isFalse);
    },
  );
  testWidgets(
    'tour visits actual controls, can go back, finishes and stays dismissed',
    (tester) async {
      viewport(tester, const Size(390, 844));
      final app = await state();
      await app.acceptAuth({
        'token': 'first',
        'isNewUser': true,
        'user': {'id': 1},
      });
      await app.finishOnboarding();
      await mount(tester, SilenceApp(state: app));
      await tester.pumpAndSettle();
      expect(find.byType(ProductTour), findsOneWidget);
      for (var i = 0; i < 7; i++) {
        await capture(tester, 'tour-${i + 1}-mobile');
        expect(tester.takeException(), isNull, reason: 'tour step ${i + 1}');
        if (i == 1) {
          expect(find.byType(ChatScreen), findsOneWidget);
          expect(find.byType(AppNavigation), findsNothing);
          await tester.tap(find.text('Назад'));
          await tester.pumpAndSettle();
          await tester.tap(find.text('Дальше'));
          await tester.pumpAndSettle();
        }
        await tester.tap(find.text(i == 6 ? 'Начать' : 'Дальше'));
        await tester.pumpAndSettle();
      }
      expect(find.byType(ProductTour), findsNothing);
      expect(app.needsProductTour, isFalse);
      final retainedChat = tester.state<ChatScreenState>(
        find.byType(ChatScreen, skipOffstage: false),
      );
      retainedChat.input.text = 'Сохранить мой черновик при обучении';
      await app.restartProductTour();
      await tester.pumpAndSettle();
      await tester.tap(find.text('Дальше'));
      await tester.pumpAndSettle();
      expect(retainedChat.input.text, 'Сохранить мой черновик при обучении');
      await tester.tap(find.text('Пропустить'));
      await tester.pumpAndSettle();
      expect(find.byType(ProductTour), findsNothing);
    },
  );
  testWidgets(
    'tour fits tablet desktop and 2x text, including voice control pointer',
    (tester) async {
      for (final size in [
        const Size(320, 720),
        const Size(844, 390),
        const Size(768, 1024),
        const Size(1280, 900),
      ]) {
        viewport(tester, size);
        tester.platformDispatcher.textScaleFactorTestValue = size.width == 320
            ? 2
            : 1;
        addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
        final app = await state();
        app.needsProductTour = true;
        await tester.pumpWidget(const SizedBox.shrink());
        await mount(tester, SilenceApp(state: app));
        await tester.pumpAndSettle();
        await capture(tester, 'tour-${size.width.toInt()}');
        expect(tester.takeException(), isNull);
        await tester.tap(find.text('Дальше'));
        await tester.pumpAndSettle();
        await capture(tester, 'tour-voice-${size.width.toInt()}');
        expect(tester.takeException(), isNull);
        await tester.tap(find.text('Пропустить'));
        await tester.pumpAndSettle();
      }
    },
  );
  testWidgets(
    'voice stage reflects saved transcript tone and returns to the same chat',
    (tester) async {
      viewport(tester, const Size(390, 844));
      final app = await state();
      final session = ConversationSession(app, onChanged: () {});
      addTearDown(session.dispose);
      session.loaded = true;
      session.messages = [
        {
          'role': 'user',
          'type': 'voice',
          'text': 'Сегодня мне тревожно.',
          'voice_emotion': 'anxious',
        },
        {
          'role': 'assistant',
          'type': 'text',
          'text': 'Я рядом. Давай сделаем спокойный выдох.',
        },
      ];
      await mount(
        tester,
        AppScope(
          state: app,
          child: MaterialApp(
            theme: auroraTheme(Brightness.dark),
            debugShowCheckedModeBanner: false,
            home: Scaffold(body: ChatScreen(session: session)),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Голосовой разговор'));
      await tester.pumpAndSettle();
      expect(
        tester.widget<CloudCompanion>(find.byType(CloudCompanion)).emotion,
        CloudEmotion.anxious,
      );
      await capture(tester, 'voice-conversation');
      for (final emotion in CloudEmotion.values) {
        session.messages.first['voice_emotion'] = emotion.name;
        session.changed();
        await tester.pumpAndSettle();
        await capture(tester, 'emotion-${emotion.name}');
        expect(tester.takeException(), isNull);
      }
      session.messages.addAll([
        {'role': 'user', 'type': 'text', 'text': 'A later text turn'},
        {'role': 'assistant', 'type': 'text', 'text': 'Unrelated later answer'},
      ]);
      session.changed();
      await tester.pumpAndSettle();
      expect(
        find.text('Unrelated later answer'),
        findsNothing,
        reason:
            'A text answer must not be paired with an older voice transcript',
      );
      final chat = tester.state<ChatScreenState>(find.byType(ChatScreen));
      chat.recording = true;
      session.changed();
      await tester.pumpAndSettle();
      expect(
        tester.widget<CloudCompanion>(find.byType(CloudCompanion)).activity,
        CloudActivity.listening,
      );
      await capture(tester, 'voice-listening');
      chat.recording = false;
      session.changed();
      session.phase = ReplyPhase.transcribing;
      session.changed();
      await tester.pumpAndSettle();
      await capture(tester, 'voice-thinking');
      session.phase = ReplyPhase.idle;
      chat.speaking = true;
      session.changed();
      session.changed();
      await tester.pumpAndSettle();
      await capture(tester, 'voice-speaking');
      chat.speaking = false;
      session.changed();
      await tester.tap(find.text('Показать переписку'));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('chat-input')), findsOneWidget);
      expect(session.messages.first['text'], 'Сегодня мне тревожно.');
    },
  );
  testWidgets(
    'cloud motion stops for reduced motion, hidden routes and background',
    (tester) async {
      viewport(tester, const Size(390, 844));
      Widget scene(
        bool enabled,
        bool reduced, {
        CloudEmotion emotion = CloudEmotion.neutral,
      }) => MaterialApp(
        home: MediaQuery(
          data: MediaQueryData(disableAnimations: reduced),
          child: TickerMode(
            enabled: enabled,
            child: CloudCompanion(emotion: emotion),
          ),
        ),
      );
      await tester.pumpWidget(scene(true, true));
      await tester.pump();
      expect(tester.binding.transientCallbackCount, 0);
      await tester.pumpWidget(scene(true, false));
      await tester.pump();
      expect(tester.binding.transientCallbackCount, greaterThan(0));
      await tester.pumpWidget(scene(false, false));
      await tester.pump();
      expect(tester.binding.transientCallbackCount, 0);
      await tester.pumpWidget(scene(true, false));
      await tester.pump();
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await tester.pump();
      expect(tester.binding.transientCallbackCount, 0);
      await tester.pumpWidget(scene(true, false, emotion: CloudEmotion.happy));
      await tester.pump();
      expect(
        tester.binding.transientCallbackCount,
        0,
        reason: 'A response arriving in the background must not restart motion',
      );
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pump();
      expect(tester.binding.transientCallbackCount, greaterThan(0));
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
      expect(tester.binding.transientCallbackCount, 0);
    },
  );
  if (const String.fromEnvironment('CLOUD_REVIEW_DIR').isNotEmpty) {
    testWidgets('capture actual animated cloud frames', (tester) async {
      viewport(tester, const Size(390, 844));
      final emotion = ValueNotifier(CloudEmotion.neutral);
      addTearDown(emotion.dispose);
      tester.platformDispatcher.accessibilityFeaturesTestValue =
          const FakeAccessibilityFeatures(disableAnimations: false);
      await mount(
        tester,
        MaterialApp(
          theme: auroraTheme(Brightness.dark),
          home: Scaffold(
            body: Center(
              child: ValueListenableBuilder(
                valueListenable: emotion,
                builder: (context, value, _) => CloudCompanion(
                  size: 310,
                  emotion: value,
                  activity: CloudActivity.idle,
                  level: .5,
                ),
              ),
            ),
          ),
        ),
      );
      for (var frame = 0; frame < 48; frame++) {
        await tester.pump(const Duration(milliseconds: 100));
        await capture(tester, 'motion-${frame.toString().padLeft(2, '0')}');
        if (frame == 10) await capture(tester, 'gaze-left');
        if (frame == 31) await capture(tester, 'gaze-right');
      }
      await tester.pumpWidget(const SizedBox.shrink());
    });
  }
}
