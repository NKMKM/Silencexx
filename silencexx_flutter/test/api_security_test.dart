import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:silencexx/core/api.dart';

void main() {
  test('an old request cannot expire a newly signed-in session', () async {
    final pending = Completer<http.Response>();
    var expired = false;
    final api = Api(client: MockClient((_) => pending.future))
      ..token = 'old'
      ..onUnauthorized = () => expired = true;
    final result = api.call('/auth/profile');
    await Future<void>.delayed(Duration.zero);
    api.token = 'new';
    final assertion = expectLater(result, throwsA(isA<ApiException>()));
    pending.complete(http.Response('{"error":"expired"}', 401));
    await assertion;
    expect(expired, isFalse);
    expect(api.token, 'new');
    api.close();
  });

  test(
    'private audio sends credentials only to the configured server',
    () async {
      var calls = 0;
      final api = Api(
        baseUrl: 'https://example.test/api',
        client: MockClient((req) async {
          calls++;
          expect(req.headers['Authorization'], 'Bearer private-token');
          return http.Response.bytes([1, 2, 3], 200);
        }),
      )..token = 'private-token';
      expect(await api.downloadMedia('/uploads/audio'), [1, 2, 3]);
      await expectLater(
        api.downloadMedia('https://external.test/audio'),
        throwsA(isA<ApiException>()),
      );
      expect(calls, 1);
      api.close();
    },
  );
}
