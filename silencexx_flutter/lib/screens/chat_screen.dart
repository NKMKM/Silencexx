import '../widgets/studio.dart';
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
        if (quickActions.isNotEmpty && input.text.startsWith('/')) {
          applyCommand(quickActions.first);
        } else {
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
      if (follow != followBottom && mounted) {
        setState(() => followBottom = follow);
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_session == null) {
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
      if (mounted && scroll.hasClients) {
        scroll.jumpTo(
          value.scrollOffset.clamp(0, scroll.position.maxScrollExtent),
        );
      }
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
        if (immediate || MediaQuery.disableAnimationsOf(context)) {
          scroll.jumpTo(scroll.position.maxScrollExtent);
        } else {
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
        target.attachments.any((a) => a.isImage)) {
      return;
    }
    final text = (override ?? input.text).trim();
    if (text.isEmpty && target.attachments.isEmpty) return;
    var payload = text;
    if (target.replyTo != null) {
      payload =
          '${context.tr('В ответ на', 'In reply to')}:\n> ${target.replyTo}\n\n$payload';
    }
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
        target.loadError != null) {
      return;
    }
    setState(() {
      voiceWorking = true;
      attachmentMenu = false;
    });
    try {
      if (!recording) {
        await target.checkLimit('Voice');
        final permissionGranted = await recorder.hasPermission();
        if (!mounted) return;
        if (!permissionGranted) {
          throw ApiException(
            context.tr(
              'Разрешите доступ к микрофону.',
              'Allow microphone access.',
            ),
          );
        }
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
        final fileLength = await file.length();
        if (!mounted) return;
        if (fileLength > 200000) {
          throw ApiException(
            context.tr(
              'Выберите текстовый файл до 200 КБ.',
              'Choose a text file up to 200 KB.',
            ),
          );
        }
        final bytes = await file.readAsBytes();
        if (!mounted) return;
        final text = utf8.decode(bytes);
        if (text.length > 24000) {
          throw ApiException(
            context.tr(
              'До 24 000 символов в файле.',
              'Up to 24,000 characters per file.',
            ),
          );
        }
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
        final imageLength = await image.length();
        if (!mounted) return;
        if (imageLength > 10000000) {
          throw ApiException(
            context.tr(
              'Выберите изображение до 10 МБ.',
              'Choose an image up to 10 MB.',
            ),
          );
        }
        target.attachments.add(
          DraftAttachment(name: image.name, bytes: await image.readAsBytes()),
        );
      }
      if (mounted && target == session) {
        setState(() {});
        inputFocus.requestFocus();
      }
    } catch (e) {
      if (mounted) {
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

  Future<void> showChatActions() async {
    inputFocus.unfocus();
    final actions = <({String value, String label, IconData icon})>[
      if (widget.onPrevious != null)
        (
          value: 'previous',
          label: context.tr('Предыдущий чат', 'Previous chat'),
          icon: Icons.history_rounded,
        ),
      (
        value: 'refresh',
        label: context.tr('Обновить сообщения', 'Refresh messages'),
        icon: Icons.refresh_rounded,
      ),
      (
        value: 'voice',
        label: context.tr('Голосовые ответы', 'Spoken replies'),
        icon: voiceReplies ? Icons.volume_up_rounded : Icons.volume_off_rounded,
      ),
      (
        value: 'stop',
        label: context.tr('Остановить озвучивание', 'Stop speaking'),
        icon: Icons.stop_circle_outlined,
      ),
      if (widget.onCommands != null)
        (
          value: 'commands',
          label: context.tr('Быстрые действия', 'Quick actions'),
          icon: Icons.bolt_rounded,
        ),
      (
        value: 'support',
        label: context.tr('Поддержка рядом', 'Find support'),
        icon: Icons.favorite_border_rounded,
      ),
    ];
    final action = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      sheetAnimationStyle: AnimationStyle(
        duration: studioDuration(context, AppMotion.overlay),
      ),
      builder: (sheetContext) => StudioSheet(
        title: context.tr('Действия чата', 'Conversation actions'),
        icon: Icons.tune_rounded,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final item in actions)
              StudioRow(
                leading: StudioGlyph(item.icon, size: 34),
                title: Text(item.label),
                subtitle: item.value == 'voice'
                    ? Text(
                        voiceReplies
                            ? context.tr('Включены', 'On')
                            : context.tr('Выключены', 'Off'),
                      )
                    : null,
                trailing: item.value == 'voice'
                    ? Icon(
                        voiceReplies
                            ? Icons.check_circle_rounded
                            : Icons.circle_outlined,
                        size: 19,
                      )
                    : const Icon(Icons.chevron_right_rounded),
                enabled:
                    item.value != 'refresh' ||
                    !session.busy && !recordingInProgress,
                onTap: () => Navigator.pop(sheetContext, item.value),
              ),
          ],
        ),
      ),
    );
    if (!mounted || action == null) return;
    switch (action) {
      case 'refresh':
        await session.load(refresh: true);
        break;
      case 'voice':
        setState(() => voiceReplies = !voiceReplies);
        break;
      case 'stop':
        await speech.stop();
        break;
      case 'commands':
        widget.onCommands?.call();
        break;
      case 'support':
        widget.onSupport != null
            ? widget.onSupport!()
            : await showSupport(context);
        break;
      case 'previous':
        widget.onPrevious?.call();
        break;
    }
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
                padding: const EdgeInsets.fromLTRB(12, 8, 16, 8),
                child: Row(
                  children: [
                    IconButton(
                      tooltip: widget.onMenu == null
                          ? context.tr('Назад', 'Back')
                          : context.tr(
                              'История разговоров',
                              'Conversation history',
                            ),
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
                    IconButton(
                      tooltip: context.tr('Действия', 'More actions'),
                      onPressed: showChatActions,
                      icon: const Icon(Icons.more_horiz_rounded),
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
                                  : NotificationListener<ScrollNotification>(
                                      onNotification: _dismissOnChatDrag,
                                      child: ListView.builder(
                                        controller: scroll,
                                        physics:
                                            const AlwaysScrollableScrollPhysics(),
                                        keyboardDismissBehavior:
                                            ScrollViewKeyboardDismissBehavior
                                                .onDrag,
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
                                          if (index ==
                                              session.messages.length) {
                                            return Padding(
                                              padding:
                                                  const EdgeInsets.symmetric(
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
                                          }
                                          final message =
                                              session.messages[index];
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
                                                await speak(
                                                  '${message['text']}',
                                                );
                                              } catch (e) {
                                                if (context.mounted) {
                                                  showError(context, e);
                                                }
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
                                      result?['isCrisis'] == true) {
                                    await showSupport(context);
                                  }
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

  void _chooseStarter(String prompt) {
    input.value = TextEditingValue(
      text: prompt,
      selection: TextSelection.collapsed(offset: prompt.length),
    );
    inputFocus.requestFocus();
  }

  bool _dismissOnChatDrag(ScrollNotification notification) {
    final dragging =
        notification is ScrollStartNotification &&
            notification.dragDetails != null ||
        notification is OverscrollNotification &&
            notification.dragDetails != null;
    if (dragging && inputFocus.hasFocus) {
      inputFocus.unfocus();
    }
    return false;
  }

  Widget _emptyChat() => LayoutBuilder(
    builder: (context, constraints) {
      final theme = Theme.of(context);
      final colors = theme.colorScheme;
      final wide = constraints.maxWidth >= 620;
      Widget suggestion(String title, String prompt, IconData icon) => Material(
        color: colors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () => _chooseStarter(prompt),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                Icon(icon, size: 19, color: colors.primary),
                const SizedBox(width: 12),
                Expanded(child: Text(title, style: theme.textTheme.titleSmall)),
                Icon(
                  Icons.north_east_rounded,
                  size: 17,
                  color: colors.onSurfaceVariant,
                ),
              ],
            ),
          ),
        ),
      );

      final suggestions = [
        (
          context.tr('Разгрузить мысли', 'Clear my head'),
          context.tr('Хочу освободить голову', 'I need to clear my mind'),
          Icons.waves_rounded,
        ),
        (
          context.tr('Слишком много всего', 'Too much at once'),
          context.tr('Я перегружен(а)', 'I’m feeling overwhelmed'),
          Icons.spa_outlined,
        ),
        (
          context.tr('Просто поговорить', 'Just talk'),
          context.tr('Просто хочу поговорить', 'I just want to talk'),
          Icons.chat_bubble_outline_rounded,
        ),
      ];
      final content = ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 640),
        child: Padding(
          padding: EdgeInsets.symmetric(
            horizontal: wide ? 32 : 22,
            vertical: 16,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  LivingEmblem(
                    size: 76,
                    icon: session.temporary
                        ? Icons.visibility_off_outlined
                        : Icons.auto_awesome_rounded,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      session.temporary
                          ? context.tr('Временный чат', 'Temporary chat')
                          : context.tr('ТИХОЕ МЕСТО', 'A QUIET PLACE'),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.labelMedium?.copyWith(
                        letterSpacing: 1.0,
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Text(
                context.tr('Что сейчас у тебя?', 'What’s on your mind?'),
                style: theme.textTheme.headlineMedium?.copyWith(
                  height: 1.08,
                  fontSize: wide ? 34 : 28,
                ),
              ),
              const SizedBox(height: 8),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Text(
                  session.temporary
                      ? context.tr(
                          'Этот разговор останется вне истории. Здесь можно быть собой.',
                          'This conversation stays out of your history. You can be yourself here.',
                        )
                      : context.tr(
                          'Не нужно подбирать слова. Начни с того, что чувствуешь сейчас.',
                          'There’s no need to find the perfect words. Start with how you feel right now.',
                        ),
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colors.onSurfaceVariant,
                    height: 1.45,
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Text(
                context.tr('КАК ВЫ СЕЙЧАС?', 'HOW ARE YOU FEELING?'),
                style: theme.textTheme.labelSmall?.copyWith(
                  letterSpacing: .9,
                  color: colors.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final mood in [
                    ('Neutral', context.tr('Нейтрально', 'Neutral')),
                    ('Anxious', context.tr('Тревожно', 'Anxious')),
                    ('Low', context.tr('Нет сил', 'Low energy')),
                  ])
                    StudioChoice(
                      label: Text(mood.$2),
                      selected: session.mood == mood.$1,
                      onSelected: (_) => setState(() => session.mood = mood.$1),
                    ),
                ],
              ),
              const SizedBox(height: 20),
              Text(
                context.tr('МОЖНО НАЧАТЬ ТАК', 'A PLACE TO BEGIN'),
                style: theme.textTheme.labelSmall?.copyWith(
                  letterSpacing: .9,
                  color: colors.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 9),
              if (wide)
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    for (final item in suggestions)
                      SizedBox(
                        width: (constraints.maxWidth - 84) / 2,
                        child: suggestion(item.$1, item.$2, item.$3),
                      ),
                  ],
                )
              else
                Column(
                  children: [
                    StagedEntry(
                      order: 1,
                      child: suggestion(
                        suggestions[0].$1,
                        suggestions[0].$2,
                        suggestions[0].$3,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        for (var i = 1; i < suggestions.length; i++) ...[
                          if (i > 1) const SizedBox(width: 10),
                          Expanded(
                            child: StagedEntry(
                              order: i + 1,
                              child: suggestion(
                                suggestions[i].$1,
                                suggestions[i].$2,
                                suggestions[i].$3,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
            ],
          ),
        ),
      );
      if (constraints.maxHeight < 560 ||
          MediaQuery.textScalerOf(context).scale(14) >= 19) {
        return NotificationListener<ScrollNotification>(
          onNotification: _dismissOnChatDrag,
          child: SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Center(child: content),
          ),
        );
      }
      return GestureDetector(
        behavior: HitTestBehavior.translucent,
        onVerticalDragStart: (_) => inputFocus.unfocus(),
        child: Center(child: content),
      );
    },
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
                              StudioRow(
                                dense: true,
                                leading: Icon(item.$2, size: 20),
                                title: Text(item.$3),
                                onTap: () => attachFile(item.$1),
                              ),
                            StudioRow(
                              dense: true,
                              leading: const Icon(
                                Icons.mic_none_rounded,
                                size: 20,
                              ),
                              title: Text(context.tr('Голос', 'Voice')),
                              onTap: voice,
                            ),
                            StudioRow(
                              leading: const Icon(
                                Icons.mood_outlined,
                                size: 20,
                              ),
                              title: Text(
                                context.tr(
                                  'Как вы сейчас?',
                                  'How are you feeling?',
                                ),
                              ),
                              subtitle: Text(moods[session.mood] ?? ''),
                              onTap: () async {
                                setState(() => attachmentMenu = false);
                                final mood = await showModalBottomSheet<String>(
                                  context: context,
                                  useSafeArea: true,
                                  backgroundColor: Colors.transparent,
                                  sheetAnimationStyle: AnimationStyle(
                                    duration: studioDuration(
                                      context,
                                      AppMotion.overlay,
                                    ),
                                  ),
                                  builder: (sheetContext) => StudioSheet(
                                    title: context.tr(
                                      'Как вы сейчас?',
                                      'How are you feeling?',
                                    ),
                                    icon: Icons.mood_outlined,
                                    child: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        for (final item in moods.entries)
                                          StudioRow(
                                            title: Text(item.value),
                                            selected: session.mood == item.key,
                                            trailing: session.mood == item.key
                                                ? const Icon(
                                                    Icons.check_rounded,
                                                  )
                                                : null,
                                            onTap: () => Navigator.pop(
                                              sheetContext,
                                              item.key,
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                );
                                if (mounted && mood != null) {
                                  setState(() => session.mood = mood);
                                }
                              },
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
                                  StudioRow(
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
                radius: 24,
                opacity: .96,
                blur: 0,
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
                            IconButton.filled(
                              tooltip: context.tr(
                                'Отправить запись',
                                'Send recording',
                              ),
                              onPressed: voiceWorking ? null : voice,
                              icon: const Icon(Icons.arrow_upward_rounded),
                            ),
                          ],
                        ),
                      )
                    else
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
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
                              duration: studioDuration(context, AppMotion.fast),
                              child: const Icon(Icons.add_rounded, size: 22),
                            ),
                          ),
                          Expanded(
                            child: TextField(
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
                          ),
                          if (session.phase != ReplyPhase.revealing)
                            IconButton(
                              tooltip: context.tr(
                                'Записать голос',
                                'Record voice',
                              ),
                              onPressed:
                                  session.busy ||
                                      voiceWorking ||
                                      session.loading ||
                                      session.loadError != null
                                  ? null
                                  : voice,
                              icon: const Icon(
                                Icons.mic_none_rounded,
                                size: 21,
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
                      'ИИ может ошибаться. Это не замена специалисту.',
                      'AI can make mistakes. It does not replace professional care.',
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
  bool loading = false;
  @override
  void dispose() {
    player.dispose();
    super.dispose();
  }

  Future<void> toggle(bool playing) async {
    if (loading) return;
    if (playing) {
      await player.pause();
      return;
    }
    setState(() => loading = true);
    try {
      final bytes = await context.app.api.downloadMedia(widget.url);
      if (!mounted) return;
      await player.play(BytesSource(bytes));
    } catch (error) {
      if (mounted) showError(context, error);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => StreamBuilder<PlayerState>(
    stream: player.onPlayerStateChanged,
    builder: (context, snapshot) {
      final playing = snapshot.data == PlayerState.playing;
      return Padding(
        padding: const EdgeInsets.only(top: 10),
        child: StudioPanel(
          radius: 18,
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          child: Row(
            children: [
              IconButton.filledTonal(
                tooltip: playing
                    ? context.tr('Пауза', 'Pause')
                    : context.tr('Воспроизвести', 'Play'),
                onPressed: loading
                    ? null
                    : () async {
                        try {
                          await toggle(playing);
                        } catch (error) {
                          if (context.mounted) showError(context, error);
                        }
                      },
                icon: loading
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Icon(
                        playing
                            ? Icons.pause_rounded
                            : Icons.play_arrow_rounded,
                      ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  context.tr('Голосовое сообщение', 'Voice message'),
                  style: Theme.of(context).textTheme.labelLarge,
                ),
              ),
              if (playing)
                const Padding(
                  padding: EdgeInsets.only(left: 8),
                  child: Icon(Icons.graphic_eq_rounded, size: 22),
                ),
            ],
          ),
        ),
      );
    },
  );
}
