import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:audioplayers/audioplayers.dart';
import '../core/api.dart';
import '../core/app_state.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_radius.dart';
import '../core/theme/app_spacing.dart';
import '../widgets/common.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key, this.chatId, this.temporary = false});
  final int? chatId;
  final bool temporary;
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final input = TextEditingController();
  final scroll = ScrollController();
  final recorder = AudioRecorder();
  final speech = FlutterTts();
  int? chatId;
  List<Json> messages = [];
  bool busy = false, loading = true, recording = false, polling = false;
  String? error;
  String mood = 'Neutral';
  Timer? timer;
  bool initialized = false;
  bool voiceReplies = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!initialized) {
      initialized = true;
      chatId = widget.chatId;
      load();
    }
  }

  Future<void> load() async {
    try {
      final api = context.app.api;
      chatId ??=
          (await api.call(
                '/chats/create',
                method: 'POST',
                body: {'isTemporary': widget.temporary},
              ))['chatId']
              as int;
      final data = await api.call('/chats/$chatId/messages');
      if (!mounted) return;
      setState(() {
        messages = rows(data, 'messages');
        loading = false;
        error = null;
      });
      bottom();
    } catch (e) {
      if (mounted) {
        setState(() {
          error = '$e';
          loading = false;
        });
      }
    }
  }

  void bottom() => WidgetsBinding.instance.addPostFrameCallback((_) {
    if (mounted && scroll.hasClients) {
      scroll.animateTo(
        scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    }
  });

  Future<void> checkLimit(String kind) async {
    final app = context.app;
    final limits =
        (await app.api.call('/subscriptions/limits'))['limits'] as Json;
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

  Future<void> send() async {
    final text = input.text.trim();
    if (text.isEmpty || busy || chatId == null) return;
    final app = context.app;
    setState(() => busy = true);
    try {
      await checkLimit('Chat');
      final response = await app.api.call(
        '/chat',
        method: 'POST',
        body: {
          'message': text,
          'chatId': chatId,
          'mood': mood,
          'language': app.language,
          'conversationHistory': messages
              .where((m) => (m['text'] ?? '').toString().isNotEmpty)
              .map(
                (m) => {
                  'role': m['role'] == 'user' ? 'user' : 'model',
                  'text': m['text'],
                },
              )
              .toList(),
        },
      );
      if (!mounted) return;
      input.clear();
      setState(() {
        messages.addAll([
          {'role': 'user', 'text': text},
          {'role': 'assistant', 'text': response['response']},
        ]);
      });
      bottom();
      if (response['isCrisis'] == true) await showSupport(context);
      if (voiceReplies && mounted) await speak('${response['response']}');
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> voice() async {
    if (busy || chatId == null) return;
    setState(() => busy = true);
    final api = context.app.api;
    try {
      if (!recording) {
        await checkLimit('Voice');
        if (!await recorder.hasPermission()) {
          throw const ApiException('Microphone permission is required');
        }
        final path = kIsWeb
            ? ''
            : '${(await getTemporaryDirectory()).path}/silence_${DateTime.now().millisecondsSinceEpoch}.m4a';
        await recorder.start(
          RecordConfig(
            encoder: kIsWeb ? AudioEncoder.opus : AudioEncoder.aacLc,
          ),
          path: path,
        );
        if (mounted) setState(() => recording = true);
      } else {
        final path = await recorder.stop();
        if (mounted) setState(() => recording = false);
        if (path == null) throw const ApiException('No recording was created');
        final previousReplies = messages
            .where((m) => m['role'] == 'assistant')
            .length;
        await api.upload(
          '/messages/voice',
          field: 'audio',
          bytes: await XFile(path).readAsBytes(),
          filename: kIsWeb ? 'voice.webm' : 'voice.m4a',
          mime: kIsWeb ? 'audio/webm' : 'audio/mp4',
          fields: {'chatId': '$chatId'},
        );
        await load();
        startPolling(previousReplies);
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  void startPolling(int previousReplies) {
    timer?.cancel();
    var attempts = 0;
    timer = Timer.periodic(const Duration(seconds: 3), (t) async {
      if (!mounted || attempts++ >= 60) {
        t.cancel();
        return;
      }
      if (polling || busy) return;
      polling = true;
      await load();
      polling = false;
      // Transcription becomes ready before the server has generated its reply.
      // Wait for the assistant, not only for the recording's ready status.
      final replies = messages.where((m) => m['role'] == 'assistant').toList();
      if (replies.length > previousReplies ||
          (messages.isNotEmpty && messages.last['status'] == 'error')) {
        t.cancel();
        if (voiceReplies && replies.length > previousReplies && mounted) {
          try {
            await speak('${replies.last['text'] ?? ''}');
          } catch (e) {
            if (mounted) showError(context, e);
          }
        }
      }
    });
  }

  Future<void> speak(String text) async {
    final app = context.app;
    final limits =
        (await app.api.call('/subscriptions/limits'))['limits'] as Json;
    if (limits['hasTTS'] != true) {
      throw ApiException(
        app.tr(
          'Озвучивание недоступно в вашем тарифе.',
          'Text to speech is not included in your plan.',
        ),
      );
    }
    await speech.setLanguage(app.language == 'ru' ? 'ru-RU' : 'en-US');
    await speech.speak(text);
  }

  @override
  void dispose() {
    timer?.cancel();
    input.dispose();
    scroll.dispose();
    recorder.dispose();
    speech.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(
        widget.temporary
            ? context.tr('Временный чат', 'Temporary chat')
            : context.tr('Разговор', 'Conversation'),
      ),
      actions: [
        IconButton(
          tooltip: context.tr('Голосовые ответы', 'Spoken replies'),
          onPressed: () => setState(() => voiceReplies = !voiceReplies),
          icon: Icon(
            voiceReplies ? Icons.headphones : Icons.headphones_outlined,
          ),
        ),
        IconButton(
          tooltip: context.tr('Остановить озвучивание', 'Stop speaking'),
          onPressed: () => speech.stop(),
          icon: const Icon(Icons.volume_off_outlined),
        ),
        IconButton(
          tooltip: context.tr('Обновить', 'Refresh'),
          onPressed: busy ? null : load,
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: SafeArea(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            child: DropdownButtonFormField<String>(
              initialValue: mood,
              decoration: InputDecoration(
                labelText: context.tr(
                  'Как вы себя чувствуете?',
                  'How are you feeling?',
                ),
              ),
              items: [
                for (final entry in <String, String>{
                  'Happy': context.tr('Хорошо', 'Happy'),
                  'Neutral': context.tr('Нейтрально', 'Neutral'),
                  'Sad': context.tr('Грустно', 'Sad'),
                  'Anxious': context.tr('Тревожно', 'Anxious'),
                  'Angry': context.tr('Злюсь', 'Angry'),
                  'Low': context.tr('Нет сил', 'Low'),
                  'Stressed': context.tr('Напряжённо', 'Stressed'),
                }.entries)
                  DropdownMenuItem(value: entry.key, child: Text(entry.value)),
              ],
              onChanged: (v) => setState(() => mood = v!),
            ),
          ),
          if (error != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              child: SectionCard(
                child: Row(
                  children: [
                    const Icon(
                      Icons.cloud_off_outlined,
                      color: AppColors.error,
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(child: Text(error!)),
                    IconButton(
                      tooltip: context.tr('Повторить', 'Retry'),
                      onPressed: busy ? null : load,
                      icon: const Icon(Icons.refresh_rounded),
                    ),
                  ],
                ),
              ),
            ),
          Expanded(
            child: loading
                ? AppLoadingState(
                    label: context.tr(
                      'Открываем разговор…',
                      'Opening conversation…',
                    ),
                  )
                : messages.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.xl),
                      child: Text(
                        context.tr(
                          'Я рядом. О чём хочется поговорить?',
                          'I am here. What is on your mind?',
                        ),
                        style: Theme.of(context).textTheme.titleLarge,
                        textAlign: TextAlign.center,
                      ),
                    ),
                  )
                : ListView.builder(
                    controller: scroll,
                    padding: const EdgeInsets.all(AppSpacing.md),
                    itemCount: messages.length,
                    itemBuilder: (context, index) {
                      final message = messages[index];
                      final own = message['role'] == 'user';
                      final text = '${message['text'] ?? ''}';
                      return Align(
                        alignment: own
                            ? Alignment.centerRight
                            : Alignment.centerLeft,
                        child: Container(
                          constraints: const BoxConstraints(maxWidth: 600),
                          margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: own
                                ? AppColors.primary.withValues(alpha: .12)
                                : AppColors.surface,
                            border: Border.all(
                              color: own
                                  ? AppColors.primary.withValues(alpha: .20)
                                  : AppColors.border,
                            ),
                            borderRadius: BorderRadius.circular(AppRadius.lg),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (message['audio_url'] != null)
                                AudioBubble(
                                  url: context.app.api.mediaUrl(
                                    '${message['audio_url']}',
                                  ),
                                ),
                              if (text.isNotEmpty) SelectableText(text),
                              if (message['status'] == 'transcribing' ||
                                  message['status'] == 'uploaded')
                                Text(
                                  context.tr('Распознавание…', 'Transcribing…'),
                                ),
                              if (message['status'] == 'error')
                                Text(
                                  context.tr(
                                    'Не удалось распознать аудио',
                                    'Audio processing failed',
                                  ),
                                ),
                              if (!own && text.isNotEmpty)
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      tooltip: context.tr('Копировать', 'Copy'),
                                      icon: const Icon(Icons.copy, size: 18),
                                      onPressed: () => Clipboard.setData(
                                        ClipboardData(text: text),
                                      ),
                                    ),
                                    IconButton(
                                      tooltip: context.tr(
                                        'Озвучить',
                                        'Read aloud',
                                      ),
                                      icon: const Icon(
                                        Icons.volume_up_outlined,
                                        size: 20,
                                      ),
                                      onPressed: () async {
                                        try {
                                          await speak(text);
                                        } catch (e) {
                                          if (context.mounted) {
                                            showError(context, e);
                                          }
                                        }
                                      },
                                    ),
                                  ],
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
          if (busy)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: AppSpacing.md),
              child: LinearProgressIndicator(minHeight: 2),
            ),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.xs),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                IconButton(
                  tooltip: recording
                      ? context.tr('Остановить и отправить', 'Stop and send')
                      : context.tr('Записать голос', 'Record voice'),
                  onPressed: busy || loading || error != null ? null : voice,
                  icon: Icon(
                    recording ? Icons.stop_circle : Icons.mic_none,
                    color: recording ? Colors.red : null,
                  ),
                ),
                if (recording)
                  Expanded(
                    child: Text(context.tr('Идёт запись…', 'Recording…')),
                  )
                else
                  Expanded(
                    child: TextField(
                      controller: input,
                      minLines: 1,
                      maxLines: 5,
                      decoration: InputDecoration(
                        hintText: context.tr(
                          'Напишите сообщение',
                          'Write a message',
                        ),
                      ),
                    ),
                  ),
                IconButton(
                  tooltip: context.tr('Отправить', 'Send'),
                  onPressed: busy || loading || recording || error != null
                      ? null
                      : send,
                  icon: const Icon(Icons.send_rounded),
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

class AudioBubble extends StatefulWidget {
  const AudioBubble({super.key, required this.url});
  final String url;
  @override
  State<AudioBubble> createState() => _AudioBubbleState();
}

class _AudioBubbleState extends State<AudioBubble> {
  final player = AudioPlayer();
  @override
  void dispose() {
    player.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => StreamBuilder<PlayerState>(
    stream: player.onPlayerStateChanged,
    builder: (context, snapshot) => TextButton.icon(
      icon: Icon(
        snapshot.data == PlayerState.playing ? Icons.pause : Icons.play_arrow,
      ),
      label: Text(context.tr('Голосовое сообщение', 'Voice message')),
      onPressed: () async {
        try {
          if (snapshot.data == PlayerState.playing) {
            await player.pause();
          } else {
            await player.play(UrlSource(widget.url));
          }
        } catch (e) {
          if (context.mounted) showError(context, e);
        }
      },
    ),
  );
}
