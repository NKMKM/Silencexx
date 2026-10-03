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
import '../core/theme/app_motion.dart';
import '../core/theme/app_radius.dart';
import '../core/theme/app_spacing.dart';
import '../widgets/common.dart';
import '../widgets/glass.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({
    super.key,
    this.chatId,
    this.temporary = false,
    this.onExit,
  });
  final int? chatId;
  final bool temporary;
  final VoidCallback? onExit;
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final input = TextEditingController();
  final inputFocus = FocusNode();
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
  bool inputFocused = false;

  @override
  void initState() {
    super.initState();
    inputFocus.addListener(_onInputFocusChanged);
  }

  void _onInputFocusChanged() {
    if (mounted) setState(() => inputFocused = inputFocus.hasFocus);
  }

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
              .toList()
              .reversed
              .take(12)
              .toList()
              .reversed
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
    inputFocus.removeListener(_onInputFocusChanged);
    inputFocus.dispose();
    scroll.dispose();
    recorder.dispose();
    speech.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final moods = <String, String>{
      'Happy': context.tr('Хорошо', 'Good'),
      'Neutral': context.tr('Нейтрально', 'Neutral'),
      'Sad': context.tr('Грустно', 'Sad'),
      'Anxious': context.tr('Тревожно', 'Anxious'),
      'Angry': context.tr('Злюсь', 'Angry'),
      'Low': context.tr('Нет сил', 'Low energy'),
      'Stressed': context.tr('Напряжённо', 'Stressed'),
    };

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 4, 12, 8),
              child: Row(
                children: [
                  IconButton(
                    tooltip: context.tr('Назад', 'Back'),
                    onPressed: () {
                      if (widget.onExit != null) {
                        widget.onExit!();
                      } else {
                        Navigator.maybePop(context);
                      }
                    },
                    icon: const Icon(Icons.arrow_back_rounded),
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.temporary
                              ? context.tr('Временный чат', 'Temporary chat')
                              : context.tr('CloudMind', 'CloudMind'),
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          widget.temporary
                              ? context.tr('Без истории', 'No chat history')
                              : context.tr(
                                  'Личное пространство',
                                  'Your private space',
                                ),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: context.tr('Голосовые ответы', 'Spoken replies'),
                    onPressed: () =>
                        setState(() => voiceReplies = !voiceReplies),
                    icon: Icon(
                      voiceReplies
                          ? Icons.headphones
                          : Icons.headphones_outlined,
                      color: voiceReplies
                          ? Theme.of(context).colorScheme.primary
                          : null,
                    ),
                  ),
                  PopupMenuButton<String>(
                    tooltip: context.tr('Действия', 'More actions'),
                    popUpAnimationStyle: const AnimationStyle(
                      duration: AppMotion.menu,
                      reverseDuration: AppMotion.fast,
                      curve: AppMotion.enter,
                      reverseCurve: AppMotion.exit,
                    ),
                    onSelected: (value) {
                      if (value == 'refresh') load();
                      if (value == 'stop') speech.stop();
                    },
                    itemBuilder: (context) => [
                      PopupMenuItem(
                        value: 'refresh',
                        child: Text(
                          context.tr('Обновить сообщения', 'Refresh messages'),
                        ),
                      ),
                      PopupMenuItem(
                        value: 'stop',
                        child: Text(
                          context.tr('Остановить озвучивание', 'Stop speaking'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Align(
              alignment: Alignment.centerLeft,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(18, 0, 16, 10),
                child: PopupMenuButton<String>(
                  initialValue: mood,
                  popUpAnimationStyle: const AnimationStyle(
                    duration: AppMotion.menu,
                    reverseDuration: AppMotion.fast,
                    curve: AppMotion.enter,
                    reverseCurve: AppMotion.exit,
                  ),
                  onSelected: (value) => setState(() => mood = value),
                  itemBuilder: (context) => [
                    for (final entry in moods.entries)
                      PopupMenuItem(value: entry.key, child: Text(entry.value)),
                  ],
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: .10),
                      borderRadius: BorderRadius.circular(AppRadius.pill),
                      border: Border.all(
                        color: AppColors.primary.withValues(alpha: .18),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.mood_outlined,
                          size: 16,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                        const SizedBox(width: 7),
                        Text(
                          '${context.tr('Сейчас', 'Feeling')} · ${moods[mood]}',
                          style: Theme.of(context).textTheme.labelMedium,
                        ),
                        const SizedBox(width: 3),
                        const Icon(Icons.expand_more_rounded, size: 17),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            AnimatedSwitcher(
              duration: AppMotion.control,
              switchInCurve: AppMotion.enter,
              switchOutCurve: AppMotion.exit,
              transitionBuilder: (child, animation) => SizeTransition(
                sizeFactor: animation,
                alignment: AlignmentDirectional.topCenter,
                child: FadeTransition(opacity: animation, child: child),
              ),
              child: error == null
                  ? const SizedBox.shrink(key: ValueKey('no-chat-error'))
                  : Padding(
                      key: const ValueKey('chat-error'),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
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
            ),
            Expanded(
              child: AnimatedSwitcher(
                duration: AppMotion.overlay,
                switchInCurve: AppMotion.enter,
                switchOutCurve: AppMotion.exit,
                transitionBuilder: (child, animation) => FadeTransition(
                  opacity: animation,
                  child: ScaleTransition(
                    scale: Tween<double>(
                      begin: .985,
                      end: 1,
                    ).animate(animation),
                    child: child,
                  ),
                ),
                child: loading
                    ? AppLoadingState(
                        key: const ValueKey('loading'),
                        label: context.tr(
                          'Открываем разговор…',
                          'Opening conversation…',
                        ),
                      )
                    : messages.isEmpty
                    ? Center(
                        key: const ValueKey('empty'),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 36),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 72,
                                height: 72,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  gradient: LinearGradient(
                                    colors: [
                                      AppColors.primary.withValues(alpha: .24),
                                      AppColors.secondary.withValues(
                                        alpha: .12,
                                      ),
                                    ],
                                  ),
                                  border: Border.all(
                                    color: AppColors.primary.withValues(
                                      alpha: .2,
                                    ),
                                  ),
                                ),
                                child: Icon(
                                  Icons.auto_awesome_rounded,
                                  size: 30,
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                              ),
                              const SizedBox(height: 22),
                              Text(
                                context.tr('Я рядом', 'I’m here'),
                                style: Theme.of(
                                  context,
                                ).textTheme.headlineSmall,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                context.tr(
                                  'О чём хочется поговорить сегодня?',
                                  'What would you like to talk about today?',
                                ),
                                textAlign: TextAlign.center,
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                            ],
                          ),
                        ),
                      )
                    : ListView.builder(
                        key: const ValueKey('messages'),
                        controller: scroll,
                        padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
                        itemCount: messages.length,
                        itemBuilder: (context, index) {
                          final message = messages[index];
                          final own = message['role'] == 'user';
                          final text = '${message['text'] ?? ''}';
                          final dark =
                              Theme.of(context).brightness == Brightness.dark;
                          return TweenAnimationBuilder<double>(
                            tween: Tween(begin: .96, end: 1),
                            duration: AppMotion.overlay,
                            curve: AppMotion.enter,
                            builder: (context, value, child) => Opacity(
                              opacity: value,
                              child: Transform.translate(
                                offset: Offset(0, 10 * (1 - value)),
                                child: child,
                              ),
                            ),
                            child: Align(
                              alignment: own
                                  ? Alignment.centerRight
                                  : Alignment.centerLeft,
                              child: Container(
                                constraints: BoxConstraints(
                                  maxWidth:
                                      MediaQuery.sizeOf(context).width * .82,
                                ),
                                margin: const EdgeInsets.only(bottom: 12),
                                padding: const EdgeInsets.fromLTRB(
                                  16,
                                  13,
                                  14,
                                  9,
                                ),
                                decoration: BoxDecoration(
                                  color: own
                                      ? AppColors.primary.withValues(
                                          alpha: dark ? .22 : .12,
                                        )
                                      : Theme.of(context).colorScheme.surface,
                                  border: Border.all(
                                    color: own
                                        ? AppColors.primary.withValues(
                                            alpha: .24,
                                          )
                                        : AppColors.border,
                                  ),
                                  borderRadius: BorderRadius.only(
                                    topLeft: const Radius.circular(20),
                                    topRight: const Radius.circular(20),
                                    bottomLeft: Radius.circular(own ? 20 : 6),
                                    bottomRight: Radius.circular(own ? 6 : 20),
                                  ),
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
                                        context.tr(
                                          'Распознавание…',
                                          'Transcribing…',
                                        ),
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
                                            tooltip: context.tr(
                                              'Копировать',
                                              'Copy',
                                            ),
                                            icon: const Icon(
                                              Icons.copy_rounded,
                                              size: 17,
                                            ),
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
                                              size: 19,
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
                            ),
                          );
                        },
                      ),
              ),
            ),
            if (busy)
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: LinearProgressIndicator(minHeight: 2),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
              child: GlassSurface(
                radius: 28,
                opacity: .34,
                blur: 11,
                focused: inputFocused,
                padding: const EdgeInsets.all(7),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    PressScale(
                      scale: .92,
                      child: IconButton(
                        tooltip: recording
                            ? context.tr(
                                'Остановить и отправить',
                                'Stop and send',
                              )
                            : context.tr('Записать голос', 'Record voice'),
                        onPressed: busy || loading || error != null
                            ? null
                            : voice,
                        style: IconButton.styleFrom(
                          backgroundColor: recording
                              ? AppColors.error.withValues(alpha: .15)
                              : Theme.of(
                                  context,
                                ).colorScheme.primary.withValues(alpha: .12),
                          foregroundColor: recording
                              ? AppColors.error
                              : Theme.of(context).colorScheme.primary,
                          shape: const CircleBorder(),
                        ),
                        icon: Icon(
                          recording
                              ? Icons.stop_rounded
                              : Icons.mic_none_rounded,
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: recording
                          ? Padding(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.graphic_eq_rounded,
                                    color: AppColors.error,
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    context.tr('Идёт запись…', 'Recording…'),
                                  ),
                                ],
                              ),
                            )
                          : TextField(
                              controller: input,
                              focusNode: inputFocus,
                              minLines: 1,
                              maxLines: 5,
                              textCapitalization: TextCapitalization.sentences,
                              decoration: InputDecoration(
                                filled: false,
                                hintText: context.tr(
                                  'Напишите сообщение…',
                                  'Message…',
                                ),
                                border: InputBorder.none,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none,
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 13,
                                ),
                              ),
                              onSubmitted: (_) => send(),
                            ),
                    ),
                    const SizedBox(width: 4),
                    PressScale(
                      scale: .92,
                      child: IconButton.filled(
                        tooltip: context.tr('Отправить', 'Send'),
                        onPressed: busy || loading || recording || error != null
                            ? null
                            : send,
                        style: IconButton.styleFrom(
                          backgroundColor: Theme.of(
                            context,
                          ).colorScheme.primary,
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: Theme.of(
                            context,
                          ).colorScheme.primary.withValues(alpha: .28),
                          shape: const CircleBorder(),
                        ),
                        icon: AnimatedSwitcher(
                          duration: AppMotion.fast,
                          switchInCurve: AppMotion.enter,
                          switchOutCurve: AppMotion.exit,
                          child: busy
                              ? const SizedBox(
                                  key: ValueKey('sending'),
                                  width: 19,
                                  height: 19,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(
                                  Icons.arrow_upward_rounded,
                                  key: ValueKey('send'),
                                ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
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
