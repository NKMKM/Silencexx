import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_selector/file_selector.dart' as files;
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:audioplayers/audioplayers.dart';
import '../core/api.dart';
import '../core/app_state.dart';
import '../core/chat_workspace.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_motion.dart';
import '../widgets/common.dart';
import '../widgets/design.dart';
import '../widgets/glass.dart';
import '../widgets/chat_visuals.dart';
import '../widgets/conversation_message.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({
    super.key,
    this.chatId,
    this.temporary = false,
    this.onExit,
    this.session,
    this.onMenu,
    this.onNewChat,
    this.onSearch,
    this.onCommands,
    this.onSupport,
    this.onPrevious,
  });
  final int? chatId;
  final bool temporary;
  final ConversationSession? session;
  final VoidCallback? onExit,
      onMenu,
      onNewChat,
      onSearch,
      onCommands,
      onSupport,
      onPrevious;
  @override
  State<ChatScreen> createState() => ChatScreenState();
}

class ChatScreenState extends State<ChatScreen> {
  final input = TextEditingController();
  final inputFocus = FocusNode();
  final scroll = ScrollController();
  final recorder = AudioRecorder();
  final speech = FlutterTts();
  ConversationSession? _session;
  ConversationSession get session => _session!;
  bool recording = false, voiceWorking = false, voiceReplies = false;
  bool focused = false, followBottom = true, attachmentMenu = false;
  bool get recordingInProgress => recording || voiceWorking;
  bool get desktop =>
      kIsWeb ||
      [
        TargetPlatform.macOS,
        TargetPlatform.windows,
        TargetPlatform.linux,
      ].contains(defaultTargetPlatform);
  @override
  void initState() {
    super.initState();
    input.addListener(draftChanged);
    inputFocus.addListener(() {
      if (mounted) setState(() => focused = inputFocus.hasFocus);
    });
    inputFocus.onKeyEvent = (node, event) {
      if (desktop &&
          event is KeyDownEvent &&
          event.logicalKey == LogicalKeyboardKey.enter &&
          !HardwareKeyboard.instance.isShiftPressed) {
        if (quickActions.isNotEmpty && input.text.startsWith('/'))
          applyCommand(quickActions.first);
        else {
          send();
        }
        return KeyEventResult.handled;
      }
      return KeyEventResult.ignored;
    };
    scroll.addListener(() {
      if (!scroll.hasClients || _session == null) return;
      session.scrollOffset = scroll.offset;
      final follow = scroll.position.extentAfter < 120;
      if (follow != followBottom && mounted)
        setState(() => followBottom = follow);
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_session == null)
      attach(
        widget.session ??
            ConversationSession(
              context.app,
              id: widget.chatId,
              temporary: widget.temporary,
              onChanged: () {},
            ),
      );
  }

  @override
  void didUpdateWidget(ChatScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.session != null && widget.session != _session) {
      _session?.removeListener(sessionChanged);
      attach(widget.session!);
      attachmentMenu = false;
      followBottom = true;
    }
  }

  void attach(ConversationSession value) {
    _session = value;
    input.value = TextEditingValue(
      text: value.draft,
      selection: TextSelection.collapsed(offset: value.draft.length),
    );
    value.addListener(sessionChanged);
    value.load();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && scroll.hasClients)
        scroll.jumpTo(
          value.scrollOffset.clamp(0, scroll.position.maxScrollExtent),
        );
    });
  }

  void draftChanged() {
    _session?.draft = input.text;
    if (mounted) setState(() {});
  }

  void sessionChanged() {
    if (!mounted) return;
    setState(() {});
    if (followBottom) bottom(immediate: session.phase == ReplyPhase.revealing);
  }

  void bottom({bool immediate = false}) =>
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted || !scroll.hasClients) return;
        if (immediate || MediaQuery.disableAnimationsOf(context))
          scroll.jumpTo(scroll.position.maxScrollExtent);
        else {
          scroll.animateTo(
            scroll.position.maxScrollExtent,
            duration: AppMotion.control,
            curve: AppMotion.enter,
          );
        }
      });

  Future<void> send({String? override}) async {
    final target = session;
    if (target.busy ||
        target.loading ||
        recordingInProgress ||
        target.loadError != null ||
        target.attachments.any((a) => a.isImage))
      return;
    final text = (override ?? input.text).trim();
    if (text.isEmpty && target.attachments.isEmpty) return;
    var payload = text;
    if (target.replyTo != null)
      payload =
          '${context.tr('В ответ на', 'In reply to')}:\n> ${target.replyTo}\n\n$payload';
    for (final attachment in target.attachments) {
      payload += '\n\n--- ${attachment.name} ---\n${attachment.text}';
    }
    target.attachments.clear();
    target.replyTo = null;
    target.editing = false;
    input.clear();
    followBottom = true;
    final result = await target.send(
      payload,
      reduceMotion: MediaQuery.disableAnimationsOf(context),
    );
    if (!mounted || session != target) return;
    final safetyData = result?['isCrisis'] == true ? result : target.crisisData;
    target.crisisData = null;
    if (safetyData?['isCrisis'] == true) {
      await showSupport(
        context,
        resources: safetyData?['helplines'] as List? ?? const [],
      );
    }
    if (voiceReplies && result != null) {
      try {
        await speak('${result['response'] ?? ''}');
      } catch (e) {
        if (mounted) showError(context, e);
      }
    }
  }

  Future<void> voice() async {
    final target = session;
    if (target.busy ||
        target.loading ||
        voiceWorking ||
        target.loadError != null)
      return;
    setState(() {
      voiceWorking = true;
      attachmentMenu = false;
    });
    try {
      if (!recording) {
        await target.checkLimit('Voice');
        if (!await recorder.hasPermission())
          throw ApiException(
            context.tr(
              'Разрешите доступ к микрофону.',
              'Allow microphone access.',
            ),
          );
        await target.ensureCreated();
        final path = kIsWeb
            ? ''
            : '${(await getTemporaryDirectory()).path}/cloudmind_${DateTime.now().millisecondsSinceEpoch}.m4a';
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
        final previous = target.messages
            .where((m) => m['role'] == 'assistant')
            .length;
        await target.app.api.upload(
          '/messages/voice',
          field: 'audio',
          bytes: await XFile(path).readAsBytes(),
          filename: kIsWeb ? 'voice.webm' : 'voice.m4a',
          mime: kIsWeb ? 'audio/webm' : 'audio/mp4',
          fields: {'chatId': '${target.id}'},
        );
        await target.load(refresh: true);
        target.pollVoice(
          previous,
          onReply: (text) async {
            if (mounted && session == target && voiceReplies) {
              try {
                await speak(text);
              } catch (e) {
                if (mounted) showError(context, e);
              }
            }
          },
        );
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => voiceWorking = false);
    }
  }

  Future<void> cancelRecording() async {
    try {
      await recorder.cancel();
      if (mounted) setState(() => recording = false);
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> speak(String text) async {
    final app = context.app;
    final limits =
        (await app.api.call('/subscriptions/limits'))['limits'] as Json? ?? {};
    if (limits['hasTTS'] != true)
      throw ApiException(
        app.tr(
          'Озвучивание недоступно в вашем тарифе.',
          'Text to speech is not included in your plan.',
        ),
      );
    await speech.setLanguage(app.language == 'ru' ? 'ru-RU' : 'en-US');
    await speech.speak(text);
  }

  Future<void> attachFile(String source) async {
    final target = session;
    setState(() => attachmentMenu = false);
    if (target.attachments.length >= 3) {
      showError(
        context,
        context.tr(
          'До трёх вложений в сообщении.',
          'Up to three attachments per message.',
        ),
      );
      return;
    }
    try {
      if (source == 'file') {
        final file = await files.openFile(
          acceptedTypeGroups: [
            const files.XTypeGroup(
              label: 'Text',
              extensions: [
                'txt',
                'md',
                'csv',
                'json',
                'dart',
                'py',
                'js',
                'ts',
              ],
              uniformTypeIdentifiers: [
                'public.text',
                'public.json',
                'public.source-code',
              ],
            ),
          ],
        );
        if (file == null) return;
        if (await file.length() > 200000)
          throw ApiException(
            context.tr(
              'Выберите текстовый файл до 200 КБ.',
              'Choose a text file up to 200 KB.',
            ),
          );
        final bytes = await file.readAsBytes();
        final text = utf8.decode(bytes);
        if (text.length > 24000)
          throw ApiException(
            context.tr(
              'До 24 000 символов в файле.',
              'Up to 24,000 characters per file.',
            ),
          );
        target.attachments.add(
          DraftAttachment(name: file.name, bytes: bytes, text: text),
        );
      } else {
        final image = await ImagePicker().pickImage(
          source: source == 'camera' ? ImageSource.camera : ImageSource.gallery,
          maxWidth: 1600,
          maxHeight: 1600,
          imageQuality: 80,
        );
        if (image == null) return;
        if (await image.length() > 10000000)
          throw ApiException(
            context.tr(
              'Выберите изображение до 10 МБ.',
              'Choose an image up to 10 MB.',
            ),
          );
        target.attachments.add(
          DraftAttachment(name: image.name, bytes: await image.readAsBytes()),
        );
      }
      if (mounted && target == session) {
        setState(() {});
        inputFocus.requestFocus();
      }
    } catch (e) {
      if (mounted)
        showError(
          context,
          e is FormatException
              ? context.tr(
                  'Нужен текстовый файл UTF-8.',
                  'Choose a UTF-8 text file.',
                )
              : e,
        );
    }
  }

  List<String> get quickActions =>
      ['/write', '/code', '/analyze', '/summarize', '/search']
          .where(
            (command) =>
                input.text.startsWith('/') &&
                !input.text.contains(' ') &&
                command.startsWith(input.text.toLowerCase()),
          )
          .toList();
  String commandLabel(String command) => switch (command) {
    '/write' => context.tr('Написать текст', 'Write something'),
    '/code' => context.tr('Разобрать код', 'Explore code'),
    '/analyze' => context.tr('Разобрать вопрос', 'Think it through'),
    '/summarize' => context.tr('Выделить главное', 'Summarize'),
    _ => context.tr('Найти разговор', 'Find a conversation'),
  };
  void applyCommand(String command) {
    if (command == '/search') {
      input.clear();
      widget.onSearch?.call();
      return;
    }
    final prompt = switch (command) {
      '/write' => context.tr('Помоги написать текст: ', 'Help me write: '),
      '/code' => context.tr(
        'Помоги разобраться в этом коде:\n',
        'Help me understand this code:\n',
      ),
      '/analyze' => context.tr(
        'Давай разберём по шагам: ',
        'Let’s think through this step by step: ',
      ),
      _ => context.tr(
        'Выдели главные мысли в этом тексте:\n',
        'Summarize the key points in this text:\n',
      ),
    };
    input.value = TextEditingValue(
      text: prompt,
      selection: TextSelection.collapsed(offset: prompt.length),
    );
    inputFocus.requestFocus();
  }

  void replyTo(Json message) {
    HapticFeedback.selectionClick();
    setState(() {
      session.replyTo = '${message['text'] ?? ''}';
      session.editing = false;
    });
    inputFocus.requestFocus();
  }

  void edit(Json message) {
    if (recordingInProgress || session.busy) return;
    setState(() {
      session.editing = true;
      session.replyTo = null;
    });
    input.text = '${message['text'] ?? ''}';
    input.selection = TextSelection.collapsed(offset: input.text.length);
    inputFocus.requestFocus();
  }

  @override
  void dispose() {
    _session?.removeListener(sessionChanged);
    if (widget.session == null) _session?.dispose();
    input.removeListener(draftChanged);
    input.dispose();
    inputFocus.dispose();
    scroll.dispose();
    recorder.dispose();
    speech.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduced = MediaQuery.disableAnimationsOf(context);
    final moods = {
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
      body: ChatAtmosphere(
        phase: session.phase,
        recording: recording,
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 4, 12, 4),
                child: Row(
                  children: [
                    IconButton(
                      tooltip: widget.onMenu == null
                          ? context.tr('Назад', 'Back')
                          : context.tr('Открыть меню', 'Open sidebar'),
                      onPressed:
                          widget.onMenu ??
                          widget.onExit ??
                          () => Navigator.maybePop(context),
                      icon: Icon(
                        widget.onMenu == null
                            ? Icons.arrow_back_rounded
                            : Icons.menu_rounded,
                      ),
                    ),
                    Expanded(
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: TextButton(
                          onPressed: () => showModelPicker(context, session),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Flexible(
                                child: Text(
                                  session.temporary
                                      ? context.tr(
                                          'Временный чат',
                                          'Temporary chat',
                                        )
                                      : 'CloudMind',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(
                                    context,
                                  ).textTheme.titleMedium,
                                ),
                              ),
                              const SizedBox(width: 4),
                              const Icon(
                                Icons.keyboard_arrow_down_rounded,
                                size: 17,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    if (widget.onNewChat != null)
                      IconButton(
                        tooltip: context.tr('Новый чат', 'New chat'),
                        onPressed: recordingInProgress
                            ? null
                            : widget.onNewChat,
                        icon: const Icon(Icons.edit_square, size: 21),
                      ),
                    PopupMenuButton<String>(
                      tooltip: context.tr('Действия', 'More actions'),
                      onSelected: (value) {
                        if (value == 'refresh') session.load(refresh: true);
                        if (value == 'voice')
                          setState(() => voiceReplies = !voiceReplies);
                        if (value == 'stop') speech.stop();
                        if (value == 'commands') widget.onCommands?.call();
                        if (value == 'support')
                          widget.onSupport != null
                              ? widget.onSupport!()
                              : showSupport(context);
                        if (value == 'previous') widget.onPrevious?.call();
                      },
                      itemBuilder: (context) => [
                        if (widget.onPrevious != null)
                          PopupMenuItem(
                            value: 'previous',
                            child: Text(
                              context.tr('Предыдущий чат', 'Previous chat'),
                            ),
                          ),
                        PopupMenuItem(
                          value: 'refresh',
                          enabled: !session.busy && !recordingInProgress,
                          child: Text(
                            context.tr(
                              'Обновить сообщения',
                              'Refresh messages',
                            ),
                          ),
                        ),
                        CheckedPopupMenuItem(
                          value: 'voice',
                          checked: voiceReplies,
                          child: Text(
                            context.tr('Голосовые ответы', 'Spoken replies'),
                          ),
                        ),
                        PopupMenuItem(
                          value: 'stop',
                          child: Text(
                            context.tr(
                              'Остановить озвучивание',
                              'Stop speaking',
                            ),
                          ),
                        ),
                        if (widget.onCommands != null)
                          PopupMenuItem(
                            value: 'commands',
                            child: Text(
                              context.tr('Быстрые действия', 'Quick actions'),
                            ),
                          ),
                        PopupMenuItem(
                          value: 'support',
                          child: Text(
                            context.tr('Поддержка рядом', 'Find support'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 860),
                    child: Stack(
                      children: [
                        Positioned.fill(
                          child: AnimatedSwitcher(
                            duration: reduced
                                ? Duration.zero
                                : AppMotion.screen,
                            transitionBuilder: (child, animation) =>
                                FadeTransition(
                                  opacity: animation,
                                  child: SlideTransition(
                                    position: Tween(
                                      begin: const Offset(.035, 0),
                                      end: Offset.zero,
                                    ).animate(animation),
                                    child: child,
                                  ),
                                ),
                            child: KeyedSubtree(
                              key: ObjectKey(session),
                              child: session.loading && session.messages.isEmpty
                                  ? const AppLoadingState()
                                  : session.loadError != null &&
                                        session.messages.isEmpty
                                  ? Center(
                                      child: SingleChildScrollView(
                                        padding: const EdgeInsets.all(24),
                                        child: AppEmptyState(
                                          icon: Icons.cloud_off_outlined,
                                          title: context.tr(
                                            'Не удалось открыть разговор',
                                            'Could not open conversation',
                                          ),
                                          description: session.loadError!,
                                          action: FilledButton(
                                            onPressed: () =>
                                                session.load(refresh: true),
                                            child: Text(
                                              context.tr('Повторить', 'Retry'),
                                            ),
                                          ),
                                        ),
                                      ),
                                    )
                                  : session.messages.isEmpty
                                  ? _emptyChat()
                                  : ListView.builder(
                                      controller: scroll,
                                      padding: const EdgeInsets.fromLTRB(
                                        24,
                                        24,
                                        24,
                                        32,
                                      ),
                                      itemCount:
                                          session.messages.length +
                                          (session.phase ==
                                                      ReplyPhase.thinking ||
                                                  session.phase ==
                                                      ReplyPhase.transcribing
                                              ? 1
                                              : 0),
                                      itemBuilder: (context, index) {
                                        if (index == session.messages.length)
                                          return Padding(
                                            padding: const EdgeInsets.symmetric(
                                              vertical: 24,
                                            ),
                                            child: AiActivity(
                                              label:
                                                  session.phase ==
                                                      ReplyPhase.transcribing
                                                  ? context.tr(
                                                      'Распознаю и готовлю ответ',
                                                      'Transcribing and preparing a reply',
                                                    )
                                                  : context.tr(
                                                      'Думаю',
                                                      'Thinking',
                                                    ),
                                            ),
                                          );
                                        final message = session.messages[index];
                                        return ConversationMessage(
                                          key: ValueKey(
                                            '${session.id}-${message['role']}-${message['id'] ?? index}',
                                          ),
                                          message: message,
                                          chatId: session.id,
                                          enabled:
                                              !session.busy &&
                                              !recordingInProgress,
                                          onReply: () => replyTo(message),
                                          onEdit: () => edit(message),
                                          onRegenerate: () => send(
                                            override: context.tr(
                                              'Предложи другой вариант ответа на мой последний запрос.',
                                              'Offer another answer to my last request.',
                                            ),
                                          ),
                                          onSpeak: () async {
                                            try {
                                              await speak('${message['text']}');
                                            } catch (e) {
                                              if (context.mounted)
                                                showError(context, e);
                                            }
                                          },
                                          audio: message['audio_url'] == null
                                              ? null
                                              : AudioBubble(
                                                  url: context.app.api.mediaUrl(
                                                    '${message['audio_url']}',
                                                  ),
                                                ),
                                        );
                                      },
                                    ),
                            ),
                          ),
                        ),
                        if (!followBottom && session.messages.isNotEmpty)
                          Positioned(
                            bottom: 8,
                            right: 12,
                            child: IconButton.filledTonal(
                              tooltip: context.tr(
                                'К последнему сообщению',
                                'Jump to latest',
                              ),
                              onPressed: () {
                                followBottom = true;
                                bottom();
                              },
                              icon: const Icon(
                                Icons.arrow_downward_rounded,
                                size: 20,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
              if (session.error != null ||
                  session.loadError != null && session.messages.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.info_outline_rounded,
                        size: 18,
                        color: AppColors.error,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          session.error ?? session.loadError!,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                      TextButton(
                        onPressed: session.busy
                            ? null
                            : () async {
                                if (session.messages.isNotEmpty &&
                                    session.messages.last['status'] ==
                                        'failed') {
                                  final result = await session.retry(
                                    reduceMotion: reduced,
                                  );
                                  if (context.mounted &&
                                      result?['isCrisis'] == true)
                                    await showSupport(context);
                                } else {
                                  await session.load(refresh: true);
                                }
                              },
                        child: Text(context.tr('Повторить', 'Retry')),
                      ),
                    ],
                  ),
                ),
              _composer(moods),
            ],
          ),
        ),
      ),
    );
  }

  Widget _emptyChat() => LayoutBuilder(
    builder: (context, constraints) => SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          minHeight: (constraints.maxHeight - 40).clamp(0, double.infinity),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            QuietOrbit(
              size: constraints.maxHeight < 360 ? 76 : 128,
              child: const Icon(
                Icons.auto_awesome_outlined,
                color: AppColors.primaryBright,
                size: 28,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              context.tr('Сделай вдох.', 'Take a breath.'),
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 10),
            Text(
              session.temporary
                  ? context.tr(
                      'Этот разговор не появится в истории. О чём хочется поговорить?',
                      'This conversation won’t appear in history. What would you like to talk about?',
                    )
                  : context.tr(
                      'Я рядом и готов выслушать. Что у тебя на уме?',
                      'I’m here to listen. What’s on your mind?',
                    ),
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 28),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 560),
              child: Wrap(
                alignment: WrapAlignment.center,
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final prompt in [
                    context.tr(
                      'Хочу освободить голову',
                      'I need to clear my mind',
                    ),
                    context.tr('Я перегружен(а)', 'I’m feeling overwhelmed'),
                    context.tr('Просто хочу поговорить', 'I just want to talk'),
                  ])
                    PressScale(
                      child: ActionChip(
                        label: Text(prompt),
                        onPressed: () {
                          input.value = TextEditingValue(
                            text: prompt,
                            selection: TextSelection.collapsed(
                              offset: prompt.length,
                            ),
                          );
                          inputFocus.requestFocus();
                        },
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    ),
  );

  Widget _composer(Map<String, String> moods) {
    final blockedImage = session.attachments.any((a) => a.isImage);
    final canSend =
        !session.busy &&
        !session.loading &&
        !recordingInProgress &&
        session.loadError == null &&
        !blockedImage &&
        (input.text.trim().isNotEmpty || session.attachments.isNotEmpty);
    final reduced = MediaQuery.disableAnimationsOf(context);
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 860),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 6, 16, 10),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedSwitcher(
                duration: reduced ? Duration.zero : AppMotion.control,
                transitionBuilder: (child, animation) => SizeTransition(
                  sizeFactor: animation,
                  child: FadeTransition(opacity: animation, child: child),
                ),
                child: attachmentMenu
                    ? Padding(
                        key: const ValueKey('attachment-menu'),
                        padding: const EdgeInsets.only(bottom: 8),
                        child: FloatingActionMenu(
                          children: [
                            for (final item in [
                              (
                                'photo',
                                Icons.photo_outlined,
                                context.tr('Фото', 'Photo'),
                              ),
                              (
                                'camera',
                                Icons.camera_alt_outlined,
                                context.tr('Камера', 'Camera'),
                              ),
                              (
                                'file',
                                Icons.description_outlined,
                                context.tr('Текстовый файл', 'Text file'),
                              ),
                            ])
                              ListTile(
                                dense: true,
                                leading: Icon(item.$2, size: 20),
                                title: Text(item.$3),
                                onTap: () => attachFile(item.$1),
                              ),
                            ListTile(
                              dense: true,
                              leading: const Icon(
                                Icons.mic_none_rounded,
                                size: 20,
                              ),
                              title: Text(context.tr('Голос', 'Voice')),
                              onTap: voice,
                            ),
                          ],
                        ),
                      )
                    : quickActions.isNotEmpty
                    ? Padding(
                        key: const ValueKey('slash-menu'),
                        padding: const EdgeInsets.only(bottom: 8),
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxHeight: 190),
                          child: SingleChildScrollView(
                            child: FloatingActionMenu(
                              children: [
                                for (final action in quickActions)
                                  ListTile(
                                    dense: true,
                                    title: Text(commandLabel(action)),
                                    trailing: Text(action),
                                    onTap: () => applyCommand(action),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      )
                    : const SizedBox.shrink(),
              ),
              GlassSurface(
                radius: 26,
                opacity: .80,
                blur: 14,
                focused: focused,
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 6),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (session.replyTo != null || session.editing)
                      Row(
                        children: [
                          const Icon(Icons.reply_rounded, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              session.editing
                                  ? context.tr(
                                      'Изменённый запрос · новое сообщение',
                                      'Edited prompt · new message',
                                    )
                                  : session.replyTo!,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ),
                          IconButton(
                            tooltip: context.tr(
                              'Убрать контекст',
                              'Clear context',
                            ),
                            onPressed: () => setState(() {
                              session.replyTo = null;
                              session.editing = false;
                            }),
                            icon: const Icon(Icons.close_rounded, size: 16),
                          ),
                        ],
                      ),
                    if (session.attachments.isNotEmpty)
                      SizedBox(
                        height: 66,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          children: [
                            for (final attachment in session.attachments)
                              Container(
                                margin: const EdgeInsets.only(right: 8),
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: Theme.of(context).colorScheme.surface,
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    if (attachment.isImage)
                                      ClipRRect(
                                        borderRadius: BorderRadius.circular(8),
                                        child: Image.memory(
                                          attachment.bytes,
                                          width: 44,
                                          height: 44,
                                          fit: BoxFit.cover,
                                          errorBuilder: (_, error, stack) =>
                                              const Icon(
                                                Icons.broken_image_outlined,
                                              ),
                                        ),
                                      )
                                    else
                                      const Icon(
                                        Icons.description_outlined,
                                        size: 22,
                                      ),
                                    const SizedBox(width: 8),
                                    SizedBox(
                                      width: 120,
                                      child: Text(
                                        attachment.name,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: Theme.of(
                                          context,
                                        ).textTheme.bodySmall,
                                      ),
                                    ),
                                    IconButton(
                                      tooltip: context.tr(
                                        'Удалить вложение',
                                        'Remove attachment',
                                      ),
                                      onPressed: () => setState(
                                        () => session.attachments.remove(
                                          attachment,
                                        ),
                                      ),
                                      icon: const Icon(
                                        Icons.close_rounded,
                                        size: 16,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ),
                    if (blockedImage)
                      Padding(
                        padding: const EdgeInsets.symmetric(
                          vertical: 8,
                          horizontal: 4,
                        ),
                        child: Text(
                          context.tr(
                            'Фото готово к просмотру. Текущая модель не принимает изображения — удалите фото, чтобы отправить текст.',
                            'Photo preview is ready. This model cannot read images — remove the photo to send text.',
                          ),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    if (recording)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        child: Row(
                          children: [
                            Expanded(
                              child: AiActivity(
                                label: context.tr('Идёт запись…', 'Recording…'),
                                wave: true,
                              ),
                            ),
                            IconButton(
                              onPressed: cancelRecording,
                              tooltip: context.tr(
                                'Отменить запись',
                                'Cancel recording',
                              ),
                              icon: const Icon(Icons.close_rounded),
                            ),
                          ],
                        ),
                      )
                    else
                      TextField(
                        key: const ValueKey('chat-input'),
                        controller: input,
                        focusNode: inputFocus,
                        minLines: 1,
                        maxLines: 5,
                        textCapitalization: TextCapitalization.sentences,
                        decoration: InputDecoration(
                          filled: false,
                          hintText: context.tr(
                            'Можно не спешить…',
                            'Take your time…',
                          ),
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          contentPadding: const EdgeInsets.fromLTRB(
                            8,
                            10,
                            8,
                            12,
                          ),
                        ),
                      ),
                    Row(
                      children: [
                        IconButton(
                          tooltip: context.tr(
                            'Добавить вложение',
                            'Add attachment',
                          ),
                          onPressed: session.busy || recordingInProgress
                              ? null
                              : () {
                                  inputFocus.unfocus();
                                  setState(
                                    () => attachmentMenu = !attachmentMenu,
                                  );
                                },
                          icon: AnimatedRotation(
                            turns: attachmentMenu ? .125 : 0,
                            duration: reduced ? Duration.zero : AppMotion.fast,
                            child: const Icon(Icons.add_rounded, size: 23),
                          ),
                        ),
                        Expanded(
                          child: Align(
                            alignment: Alignment.centerLeft,
                            child: TextButton(
                              onPressed: () =>
                                  showModelPicker(context, session),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Flexible(
                                    child: Text(
                                      'CloudMind',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: Theme.of(
                                        context,
                                      ).textTheme.labelMedium,
                                    ),
                                  ),
                                  const Icon(
                                    Icons.keyboard_arrow_down_rounded,
                                    size: 15,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        PopupMenuButton<String>(
                          tooltip: context.tr(
                            'Как вы сейчас?',
                            'How are you feeling?',
                          ),
                          icon: const Icon(Icons.mood_outlined, size: 20),
                          initialValue: session.mood,
                          onSelected: (value) =>
                              setState(() => session.mood = value),
                          itemBuilder: (context) => [
                            for (final entry in moods.entries)
                              CheckedPopupMenuItem(
                                value: entry.key,
                                checked: session.mood == entry.key,
                                child: Text(entry.value),
                              ),
                          ],
                        ),
                        if (session.phase != ReplyPhase.revealing)
                          IconButton(
                            tooltip: recording
                                ? context.tr(
                                    'Отправить запись',
                                    'Send recording',
                                  )
                                : context.tr('Записать голос', 'Record voice'),
                            onPressed:
                                session.busy ||
                                    voiceWorking ||
                                    session.loading ||
                                    session.loadError != null
                                ? null
                                : voice,
                            icon: Icon(
                              recording
                                  ? Icons.stop_circle_outlined
                                  : Icons.mic_none_rounded,
                              size: 22,
                            ),
                          ),
                        PressScale(
                          child: IconButton.filled(
                            tooltip: session.phase == ReplyPhase.revealing
                                ? context.tr(
                                    'Показать весь ответ',
                                    'Show full reply',
                                  )
                                : context.tr('Отправить', 'Send'),
                            onPressed: session.phase == ReplyPhase.revealing
                                ? session.finishReveal
                                : canSend
                                ? send
                                : null,
                            style: IconButton.styleFrom(
                              shape: const CircleBorder(),
                              minimumSize: const Size(44, 44),
                            ),
                            icon: Icon(
                              session.phase == ReplyPhase.revealing
                                  ? Icons.stop_rounded
                                  : Icons.arrow_upward_rounded,
                              size: 22,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (MediaQuery.viewInsetsOf(context).bottom == 0)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    context.tr(
                      'Тёплое место для обычных разговоров и размышлений.',
                      'A gentle space for everyday conversations and reflection.',
                    ),
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                ),
            ],
          ),
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
