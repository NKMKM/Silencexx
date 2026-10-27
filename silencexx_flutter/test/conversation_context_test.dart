import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:silencexx/core/api.dart';
import 'package:silencexx/core/app_state.dart';
import 'package:silencexx/core/chat_workspace.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test(
    'reopened conversation sends preceding user and assistant turns',
    () async {
      SharedPreferences.setMockInitialValues({});
      final sent = <Json>[];
      final api = Api(
        client: MockClient((request) async {
          if (request.url.path.endsWith('/messages')) {
            return http.Response(
              jsonEncode({
                'messages': [
                  {
                    'id': 'messages:1',
                    'role': 'user',
                    'text': 'I feel anxious',
                    'status': 'ready',
                  },
                  {
                    'id': 'messages:2',
                    'role': 'assistant',
                    'text': 'What worries you?',
                    'status': 'ready',
                  },
                ],
              }),
              200,
            );
          }
          if (request.url.path.endsWith('/chat')) {
            sent.add(jsonDecode(request.body) as Json);
            return http.Response('{"response":"I understand"}', 200);
          }
          return http.Response('{"limits":{}}', 200);
        }),
      );
      final app = AppState(
        api: api,
        preferences: await SharedPreferences.getInstance(),
      );
      final session = ConversationSession(app, id: 7, onChanged: () {});
      await session.load();
      await session.send('Tomorrow’s exam', reduceMotion: true);
      expect(sent.single['conversationHistory'], [
        {'role': 'user', 'content': 'I feel anxious'},
        {'role': 'assistant', 'content': 'What worries you?'},
      ]);
      expect(session.messages.length, 4);
      session.dispose();
      app.dispose();
      api.close();
    },
  );
}
