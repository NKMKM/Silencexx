import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'api.dart';
import 'app_state.dart';

enum ReplyPhase { idle, thinking, revealing, transcribing, failed }

class DraftAttachment {
  const DraftAttachment({required this.name, required this.bytes, this.text});
  final String name;
  final Uint8List bytes;
  final String? text;
  bool get isImage => text == null;
}

class ChatModel {
  const ChatModel(
    this.id,
    this.name, {
    this.available = false,
    this.images = false,
  });
  final String id, name;
  final bool available, images;
}

/// Capability catalogue: unavailable providers never masquerade as the server.
const chatModels = [
  ChatModel('cloudmind', 'CloudMind', available: true),
  ChatModel('gpt', 'GPT'),
  ChatModel('claude', 'Claude'),
  ChatModel('gemini', 'Gemini'),
  ChatModel('deepseek', 'DeepSeek'),
  ChatModel('local', 'Local Model'),
];

class ConversationSession extends ChangeNotifier {
  ConversationSession(
    this.app, {
    this.id,
    this.temporary = false,
    required this.onChanged,
  });
  final AppState app;
  final bool temporary;
  final VoidCallback onChanged;
  int? id;
  String draft = '';
  String? replyTo;
  bool editing = false;
  double scrollOffset = 0;
  final attachments = <DraftAttachment>[];
  String mood = 'Neutral';
  String modelId = 'cloudmind';
  List<Json> messages = [];
  bool loading = false, loaded = false, disposed = false;
  ReplyPhase phase = ReplyPhase.idle;
  String? error;
  String? loadError;
  Json? crisisData;
  int revision = 0;
  Timer? _reveal, _poll;
  bool _polling = false;
  Future<void>? _creating;
  bool get busy =>
      phase == ReplyPhase.thinking ||
      phase == ReplyPhase.revealing ||
      phase == ReplyPhase.transcribing;
  void changed() {
    if (!disposed) notifyListeners();
  }

  Future<void> load({bool refresh = false}) async {
    if (loading || busy || disposed || (!refresh && loaded)) return;
    if (id == null) {
      loaded = true;
      changed();
      return;
    }
    loading = true;
    loadError = null;
    changed();
    try {
      final result = await app.api.call('/chats/$id/messages');
      if (disposed) return;
      messages = rows(result, 'messages');
      loaded = true;
      revision++;
    } catch (e) {
      loadError = '$e';
    } finally {
      loading = false;
      changed();
    }
  }

  Future<void> ensureCreated() {
    if (id != null) return Future.value();
    return _creating ??= (() async {
      try {
        final response = await app.api.call(
          '/chats/create',
          method: 'POST',
          body: {'isTemporary': temporary},
        );
        id = (response['chatId'] as num).toInt();
        onChanged();
      } finally {
        _creating = null;
      }
    })();
  }

  Future<void> checkLimit(String kind) async {
    final limits =
        (await app.api.call('/subscriptions/limits'))['limits'] as Json? ?? {};
    final limit = (limits['daily${kind}Limit'] as num?)?.toInt() ?? -1;
    final used = (limits['daily${kind}Used'] as num?)?.toInt() ?? 0;
    if (limit >= 0 && used >= limit) {
      throw ApiException(
        app.tr(
          'Дневной лимит исчерпан. Подписка доступна в настройках.',
          'Daily limit reached. See subscriptions in settings.',
        ),
      );
    }
  }

  Future<Json?> send(String text, {bool reduceMotion = false}) async {
    if (text.trim().isEmpty ||
        busy ||
        loading ||
        loadError != null ||
        disposed) {
      return null;
    }
    final history = messages
        .where(
          (m) => m['status'] != 'failed' && '${m['text'] ?? ''}'.isNotEmpty,
        )
        .toList()
        .reversed
        .take(12)
        .toList()
        .reversed
        .map(
          (m) => {
            'role': m['role'] == 'user' ? 'user' : 'assistant',
            'content': m['text'],
          },
        )
        .toList();
    final own = <String, dynamic>{
      'id': 'local-${DateTime.now().microsecondsSinceEpoch}',
      'role': 'user',
      'text': text,
      'status': 'sending',
    };
    messages.add(own);
    draft = '';
    error = null;
    crisisData = null;
    phase = ReplyPhase.thinking;
    revision++;
    changed();
    try {
      await checkLimit('Chat');
      await ensureCreated();
      final response = await app.api.call(
        '/chat',
        method: 'POST',
        body: {
          'message': text,
          'chatId': id,
          'mood': mood,
          'language': app.language,
          'conversationHistory': history,
        },
      );
      if (disposed) return response;
      own['status'] = 'ready';
      final answer = '${response['response'] ?? ''}';
      final reply = <String, dynamic>{
        'id': 'reply-${DateTime.now().microsecondsSinceEpoch}',
        'role': 'assistant',
        'text': answer,
        'status': 'ready',
      };
      messages.add(reply);
      revision++;
      onChanged();
      // The current HTTP API returns a complete response. Presentation is
      // progressive; this is deliberately not described as network streaming.
      if (reduceMotion || response['isCrisis'] == true || answer.isEmpty) {
        phase = ReplyPhase.idle;
      } else {
        final characters = answer.characters.toList();
        final stride = (characters.length / 45).ceil().clamp(2, 500);
        var length = 0;
        reply['displayText'] = '';
        phase = ReplyPhase.revealing;
        _reveal?.cancel();
        _reveal = Timer.periodic(const Duration(milliseconds: 28), (timer) {
          length = (length + stride).clamp(0, characters.length);
          reply['displayText'] = characters.take(length).join();
          if (length == characters.length) {
            timer.cancel();
            reply.remove('displayText');
            phase = ReplyPhase.idle;
          }
          changed();
        });
      }
      changed();
      return response;
    } catch (e) {
      own['status'] = 'failed';
      error = '$e';
      crisisData = e is ApiException && e.data['isCrisis'] == true
          ? e.data
          : null;
      phase = ReplyPhase.failed;
      changed();
      return null;
    }
  }

  void finishReveal() {
    _reveal?.cancel();
    for (final message in messages) {
      message.remove('displayText');
    }
    if (phase == ReplyPhase.revealing) phase = ReplyPhase.idle;
    changed();
  }

  Future<Json?> retry({bool reduceMotion = false}) async {
    if (busy || messages.isEmpty || messages.last['status'] != 'failed') {
      return null;
    }
    final text = '${messages.removeLast()['text']}';
    return send(text, reduceMotion: reduceMotion);
  }

  void pollVoice(int previousReplies, {void Function(String)? onReply}) {
    phase = ReplyPhase.transcribing;
    changed();
    _poll?.cancel();
    var attempts = 0;
    _poll = Timer.periodic(const Duration(seconds: 3), (timer) async {
      if (disposed) {
        timer.cancel();
        return;
      }
      if (_polling) return;
      if (attempts++ >= 60) {
        timer.cancel();
        phase = ReplyPhase.failed;
        error = app.tr(
          'Ответ задерживается. Обновите разговор через минуту.',
          'The reply is taking longer. Refresh the conversation in a minute.',
        );
        changed();
        return;
      }
      _polling = true;
      try {
        final result = await app.api.call('/chats/$id/messages');
        if (disposed) return;
        messages = rows(result, 'messages');
        revision++;
        final replies = messages
            .where((m) => m['role'] == 'assistant')
            .toList();
        if (replies.length > previousReplies) {
          timer.cancel();
          phase = ReplyPhase.idle;
          onChanged();
          onReply?.call('${replies.last['text'] ?? ''}');
        } else if (messages.isNotEmpty && messages.last['status'] == 'error') {
          timer.cancel();
          phase = ReplyPhase.failed;
          error = app.tr(
            'Не удалось распознать запись.',
            'Could not transcribe the recording.',
          );
        }
        changed();
      } catch (e) {
        error = '$e';
        changed();
      } finally {
        _polling = false;
      }
    });
  }

  @override
  void dispose() {
    disposed = true;
    _reveal?.cancel();
    _poll?.cancel();
    super.dispose();
  }
}

class ChatWorkspace extends ChangeNotifier {
  ChatWorkspace(this.app) {
    final saved = app.preferences.getStringList('$prefix.navigation') ?? [];
    order = [
      ...saved.where(destinations.contains).toSet(),
      ...destinations.where((id) => !saved.contains(id)),
    ];
    try {
      metadata = Map<String, dynamic>.from(
        jsonDecode(app.preferences.getString('$prefix.chats') ?? '{}') as Map,
      );
    } catch (_) {
      metadata = {};
    }
    active = _newSession();
  }
  static const destinations = ['chat', 'journal', 'tasks', 'inbox', 'settings'];
  final AppState app;
  String get prefix => 'workspace.${app.user?['id'] ?? 'guest'}';
  late List<String> order;
  late Json metadata;
  late ConversationSession active;
  final sessions = <ConversationSession>[];
  List<Json> chats = [];
  bool disposed = false, loading = false;
  String? error;
  int _listRequest = 0;
  void changed() {
    if (!disposed) notifyListeners();
  }

  ConversationSession _newSession({int? id, bool temporary = false}) {
    final session = ConversationSession(
      app,
      id: id,
      temporary: temporary,
      onChanged: refresh,
    );
    sessions.add(session);
    return session;
  }

  void newChat({bool temporary = false}) {
    if (active.id == null &&
        active.messages.isEmpty &&
        active.draft.isEmpty &&
        active.temporary == temporary) {
      return;
    }
    active = _newSession(temporary: temporary);
    changed();
  }

  void open(int id) {
    active =
        sessions.where((s) => s.id == id).firstOrNull ?? _newSession(id: id);
    changed();
    active.load();
  }

  Future<void> refresh() async {
    final request = ++_listRequest;
    loading = chats.isEmpty;
    error = null;
    changed();
    try {
      final response = await app.api.call('/chats/list');
      if (disposed || request != _listRequest) return;
      chats = rows(response, 'chats');
    } catch (e) {
      if (request == _listRequest) error = '$e';
    } finally {
      if (request == _listRequest) {
        loading = false;
        changed();
      }
    }
  }

  Future<void> reorder(int oldIndex, int newIndex) async {
    if (newIndex > oldIndex) newIndex--;
    final next = [...order];
    next.insert(newIndex, next.removeAt(oldIndex));
    await app.preferences.setStringList('$prefix.navigation', next);
    order = next;
    changed();
  }

  Json meta(int id) => Map<String, dynamic>.from(metadata['$id'] as Map? ?? {});
  String title(Json chat) {
    final renamed = meta((chat['id'] as num).toInt())['title'];
    final text = '${renamed ?? chat['last_message'] ?? ''}'
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
    return text.isEmpty ? app.tr('Новый разговор', 'New conversation') : text;
  }

  Future<void> updateMeta(int id, Json changes) async {
    final next = {
      ...metadata,
      '$id': {...meta(id), ...changes},
    };
    await app.preferences.setString('$prefix.chats', jsonEncode(next));
    metadata = next;
    changed();
  }

  Future<void> delete(int id) async {
    await app.api.call('/chats/$id', method: 'DELETE');
    if (disposed) return;
    if (active.id == id) {
      active = _newSession();
    }
    final removed = sessions.where((s) => s.id == id).toList();
    sessions.removeWhere((s) => s.id == id);
    for (final session in removed) {
      session.dispose();
    }
    chats.removeWhere((chat) => chat['id'] == id);
    changed();
  }

  @override
  void dispose() {
    disposed = true;
    for (final session in sessions) {
      session.dispose();
    }
    super.dispose();
  }
}
