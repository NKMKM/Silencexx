import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:silencexx/core/api.dart';

void main() {
  test(
    'sends UTF-8 JSON with the bearer token to the existing chat endpoint',
    () async {
      final api = Api(
        baseUrl: 'https://example.test/api/',
        client: MockClient((request) async {
          expect(request.url.toString(), 'https://example.test/api/chat');
          expect(request.method, 'POST');
          expect(request.headers['Authorization'], 'Bearer private-token');
          expect(jsonDecode(request.body), {'message': 'Привет', 'chatId': 7});
          return http.Response(
            jsonEncode({'success': true, 'response': 'Я рядом'}),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }),
      )..token = 'private-token';
      expect(
        (await api.call(
          '/chat',
          method: 'POST',
          body: {'message': 'Привет', 'chatId': 7},
        ))['response'],
        'Я рядом',
      );
      api.close();
    },
  );

  test('401 expires authenticated sessions while 429 preserves them', () async {
    var expired = 0;
    var status = 429;
    final api =
        Api(
            client: MockClient(
              (_) async =>
                  http.Response('{"error":"limit or session"}', status),
            ),
          )
          ..token = 'token'
          ..onUnauthorized = () => expired++;
    await expectLater(
      api.call('/chat'),
      throwsA(isA<ApiException>().having((e) => e.status, 'status', 429)),
    );
    expect(expired, 0);
    status = 401;
    await expectLater(api.call('/auth/profile'), throwsA(isA<ApiException>()));
    expect(expired, 1);
    api.close();
  });

  test('crisis details survive failed journal requests', () async {
    final api = Api(
      client: MockClient(
        (_) async => http.Response(
          '{"success":false,"isCrisis":true,"error":"support"}',
          422,
        ),
      ),
    );
    await expectLater(
      api.call('/journal/entry', method: 'POST', body: {'content': 'test'}),
      throwsA(
        isA<ApiException>().having((e) => e.data['isCrisis'], 'isCrisis', true),
      ),
    );
    api.close();
  });

  test('HTTP 200 with success false is still an error', () async {
    final api = Api(
      client: MockClient(
        (_) async =>
            http.Response('{"success":false,"error":"Payment declined"}', 200),
      ),
    );
    await expectLater(
      api.call('/payments/confirm'),
      throwsA(isA<ApiException>()),
    );
    api.close();
  });

  test('normalizes upload paths across Windows and server relative paths', () {
    final api = Api(baseUrl: 'https://example.test/api');
    expect(
      api.mediaUrl(r'C:\app\backend\uploads\voice.m4a'),
      'https://example.test/uploads/voice.m4a',
    );
    expect(
      api.mediaUrl('/uploads/avatar.png'),
      'https://example.test/uploads/avatar.png',
    );
    expect(
      api.mediaUrl('https://cdn.example.test/audio.m4a'),
      'https://cdn.example.test/audio.m4a',
    );
    api.close();
  });

  test('multipart upload includes audio and chatId', () async {
    final api = Api(
      baseUrl: 'https://example.test/api',
      client: MockClient((request) async {
        expect(request.url.path, '/api/messages/voice');
        expect(
          request.headers['content-type'],
          startsWith('multipart/form-data; boundary='),
        );
        expect(request.body, contains('name="chatId"'));
        expect(request.body, contains('name="audio"; filename="voice.m4a"'));
        expect(request.body, contains('content-type: audio/mp4'));
        return http.Response('{"messageId":9,"status":"uploaded"}', 200);
      }),
    );
    final data = await api.upload(
      '/messages/voice',
      field: 'audio',
      bytes: [1, 2, 3],
      filename: 'voice.m4a',
      mime: 'audio/mp4',
      fields: {'chatId': '7'},
    );
    expect(data['messageId'], 9);
    api.close();
  });
}
