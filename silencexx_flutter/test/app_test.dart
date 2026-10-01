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

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({});
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

  testWidgets(
    'email login reaches the dashboard and sends the expected API body',
    (tester) async {
      tester.view.resetPhysicalSize();
      final app = await state((request) async {
        if (request.url.path.endsWith('/auth/login')) {
          expect(jsonDecode(request.body), {
            'method': 'email',
            'contact': 'test@example.test',
            'password': 'password123',
          });
          return http.Response(
            '{"success":true,"token":"test-token","user":{"id":1,"name":"Test"}}',
            200,
          );
        }
        return http.Response('{"success":true,"chats":[]}', 200);
      });
      await app.restore();
      await tester.pumpWidget(SilenceApp(state: app));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byType(TextFormField).at(0),
        'test@example.test',
      );
      await tester.enterText(find.byType(TextFormField).at(1), 'password123');
      await tester.ensureVisible(find.text('Войти'));
      await tester.tap(find.text('Войти'));
      await tester.pumpAndSettle();
      expect(find.text('Новый разговор'), findsOneWidget);
      expect(app.authenticated, isTrue);
      app.api.close();
    },
  );

  testWidgets('phone login requires OTP before accepting the session', (
    tester,
  ) async {
    final app = await state((request) async {
      if (request.url.path.endsWith('/auth/login')) {
        return http.Response('{"success":true,"requiresOTP":true}', 200);
      }
      if (request.url.path.endsWith('/auth/verify-otp')) {
        expect(jsonDecode(request.body)['code'], '123456');
        return http.Response(
          '{"success":true,"token":"phone-token","user":{"id":2}}',
          200,
        );
      }
      return http.Response('{"success":true,"chats":[]}', 200);
    });
    await app.restore();
    await tester.pumpWidget(SilenceApp(state: app));
    await tester.pumpAndSettle();
    await tester.tap(find.byIcon(Icons.phone));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField), '+40123456789');
    await tester.tap(find.text('Войти'));
    await tester.pumpAndSettle();
    expect(app.authenticated, isFalse);
    expect(find.text('Код подтверждения'), findsOneWidget);
    await tester.enterText(find.byType(TextFormField), '123456');
    await tester.ensureVisible(find.text('Подтвердить'));
    await tester.tap(find.text('Подтвердить'));
    await tester.pumpAndSettle();
    expect(app.authenticated, isTrue);
    app.api.close();
  });
}
