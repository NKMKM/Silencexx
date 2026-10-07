import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:silencexx/core/api.dart';
import 'package:silencexx/core/app_state.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const channel = MethodChannel('com.silencexx/daily_wish');
  final calls = <MethodCall>[];

  setUp(() {
    calls.clear();
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({'auth_token': 'account-a'});
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          calls.add(call);
          return null;
        });
  });
  tearDown(() {
    debugDefaultTargetPlatformOverride = null;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  test(
    'restoring does not clear widget credentials before reading secure storage',
    () async {
      final app = AppState(
        api: Api(
          client: MockClient(
            (_) async => http.Response('{"user":{"id":1}}', 200),
          ),
        ),
        preferences: await SharedPreferences.getInstance(),
      );
      addTearDown(app.api.close);
      addTearDown(app.dispose);
      await app.restore();
      await Future<void>.delayed(Duration.zero);
      expect(calls, hasLength(1));
      expect(calls.single.arguments['token'], 'account-a');
      await app.setLanguage('en');
      await Future<void>.delayed(Duration.zero);
      expect(calls.last.arguments['language'], 'en');
      await app.logout();
      await Future<void>.delayed(Duration.zero);
      expect(calls.last.arguments['token'], isNull);
    },
  );

  test(
    'account switch and expired session immediately synchronize native widgets',
    () async {
      final app = AppState(
        api: Api(
          client: MockClient(
            (_) async => http.Response('{"user":{"id":1}}', 200),
          ),
        ),
        preferences: await SharedPreferences.getInstance(),
      );
      addTearDown(app.api.close);
      addTearDown(app.dispose);
      await app.restore();
      await app.acceptAuth({
        'token': 'account-b',
        'user': {'id': 2},
      });
      await Future<void>.delayed(Duration.zero);
      expect(calls.last.arguments['token'], 'account-b');
      app.expireSession();
      await Future<void>.delayed(Duration.zero);
      expect(calls.last.arguments['token'], isNull);
    },
  );
}
