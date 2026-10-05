import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:silencexx/core/api.dart';
import 'package:silencexx/core/app_state.dart';
import 'package:silencexx/main.dart';
import 'package:silencexx/screens/auth_screen.dart';
import 'package:silencexx/screens/chat_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({});
    TestWidgetsFlutterBinding
        .instance
        .platformDispatcher
        .accessibilityFeaturesTestValue = const FakeAccessibilityFeatures(
      disableAnimations: true,
    );
  });

  Future<AppState> state(
    Future<http.Response> Function(http.Request) handler,
  ) async => AppState(
    api: Api(client: MockClient(handler)),
    preferences: await SharedPreferences.getInstance(),
  );

  test(
    'restores an existing session and persists language and theme',
    () async {
      FlutterSecureStorage.setMockInitialValues({'auth_token': 'saved-token'});
      final app = await state((request) async {
        expect(request.headers['Authorization'], 'Bearer saved-token');
        return http.Response(
          '{"success":true,"user":{"id":1,"name":"Test"}}',
          200,
        );
      });
      await app.restore();
      expect(app.authenticated, isTrue);
      expect(app.user?['id'], 1);
      await app.setLanguage('en');
      await app.setTheme(ThemeMode.light);
      expect(app.preferences.getString('language'), 'en');
      expect(app.preferences.getString('theme'), 'light');
      app.api.close();
    },
  );

  test('expired token does not leave the user signed in', () async {
    FlutterSecureStorage.setMockInitialValues({'auth_token': 'expired'});
    final app = await state(
      (_) async => http.Response('{"error":"expired"}', 401),
    );
    await app.restore();
    expect(app.authenticated, isFalse);
    expect(app.startupError, isNull);
    app.api.close();
  });

  test('network failure keeps the saved session and offers retry', () async {
    FlutterSecureStorage.setMockInitialValues({'auth_token': 'saved'});
    final app = await state((_) async => throw http.ClientException('offline'));
    await app.restore();
    expect(app.authenticated, isTrue);
    expect(app.startupError, isNotNull);
    app.api.close();
  });

  testWidgets('provider sign-in has no legacy phone, email or password form', (
    tester,
  ) async {
    final app = await state(
      (_) async => http.Response('{"success":true}', 200),
    );
    await app.preferences.setBool('disclaimer_accepted', true);
    app.disclaimerAccepted = true;
    await app.restore();
    await tester.pumpWidget(SilenceApp(state: app));
    await tester.pumpAndSettle();
    expect(find.byType(AuthScreen), findsOneWidget);
    expect(find.text('Продолжить с Google'), findsOneWidget);
    expect(find.byType(TextFormField), findsNothing);
    expect(find.text('Телефон'), findsNothing);
    expect(find.text('Пароль'), findsNothing);
    app.api.close();
  });

  testWidgets('a restored accepted session opens the chat directly', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({'disclaimer_accepted': true});
    FlutterSecureStorage.setMockInitialValues({'auth_token': 'saved-token'});
    final app = await state((request) async {
      if (request.url.path.endsWith('/auth/profile')) {
        return http.Response(
          '{"success":true,"user":{"id":1,"name":"Test"}}',
          200,
        );
      }
      return http.Response('{"success":true,"chats":[],"messages":[]}', 200);
    });
    await app.restore();
    await tester.pumpWidget(SilenceApp(state: app));
    await tester.pumpAndSettle();
    expect(find.byType(ChatScreen), findsOneWidget);
    expect(find.byType(AuthScreen), findsNothing);
    expect(find.text('Твоё пространство для себя'), findsNothing);
    app.api.close();
  });

  test('logout removes the locally saved session', () async {
    FlutterSecureStorage.setMockInitialValues({'auth_token': 'saved-token'});
    final app = await state((request) async {
      expect(request.url.path, endsWith('/auth/logout'));
      return http.Response('{"success":true}', 200);
    });
    await app.restore();
    await app.logout();
    expect(app.authenticated, isFalse);
    expect(await const FlutterSecureStorage().read(key: 'auth_token'), isNull);
    app.api.close();
  });

  test(
    'new account onboarding is optional and account deletion clears local state',
    () async {
      final app = await state(
        (_) async => http.Response('{"success":true}', 200),
      );
      await app.acceptAuth({
        'token': 'new-user-token',
        'isNewUser': true,
        'user': {'id': 3},
      });
      expect(app.needsOnboarding, isTrue);
      await app.finishOnboarding(interests: ['reflection', 'talk']);
      expect(app.preferences.getStringList('wellness_interests'), [
        'reflection',
        'talk',
      ]);
      await app.preferences.setBool('reminder_enabled', true);

      await app.accountDeleted();
      expect(app.authenticated, isFalse);
      expect(app.preferences.getStringList('wellness_interests'), isNull);
      expect(app.preferences.getBool('reminder_enabled'), isNull);
      app.api.close();
    },
  );
}
