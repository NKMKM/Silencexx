import '../widgets/studio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../core/app_state.dart';
import '../core/chat_workspace.dart';
import '../core/theme.dart';
import '../widgets/app_navigation.dart';
import '../widgets/chat_visuals.dart';
import '../widgets/command_palette.dart';
import '../widgets/common.dart';
import '../widgets/conversation_sidebar.dart';
import 'chat_screen.dart';
import 'journal_screen.dart';
import 'tasks_screen.dart';
import 'inbox_screen.dart';
import 'settings_screen.dart';
import 'panic_screen.dart';
import 'today_screen.dart';
import '../widgets/product_tour.dart';

/// A daily home, a conversation library, and focused detail workspaces.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final chatKey = GlobalKey<ChatScreenState>();
  final journalKey = GlobalKey<JournalScreenState>();
  final todayScroll = ScrollController();
  final startTourKey = GlobalKey();
  final settingsTourKey = GlobalKey();
  final voiceTourKey = GlobalKey();
  final composerTourKey = GlobalKey();
  final navTourKeys = {
    for (final id in ['today', 'chat', 'journal', 'tasks', 'inbox'])
      id: GlobalKey(),
  };
  ChatWorkspace? _workspace;
  ChatWorkspace get workspace => _workspace!;
  String selected = 'today';
  bool conversationOpen = false;
  bool historyVisible = true;
  final visited = <String>{'today', 'chat'};
  final history = <ConversationSession>[];
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_workspace == null) {
      _workspace = ChatWorkspace(context.app);
      // Do not notify ancestors during the initial widget build.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) workspace.refresh();
      });
    }
  }

  bool canSwitch() {
    if (chatKey.currentState?.recordingInProgress == true) {
      showError(
        context,
        context.tr(
          'Закончите или отмените запись.',
          'Finish or cancel your recording first.',
        ),
      );
      return false;
    }
    return true;
  }

  void select(String id) {
    if (!canSwitch()) return;
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      selected = id;
      if (id == 'chat') conversationOpen = false;
      visited.add(id);
    });
  }

  void openChat(int id) {
    if (!canSwitch()) return;
    if (workspace.active.id != id) history.add(workspace.active);
    workspace.open(id);
    select('chat');
    setState(() => conversationOpen = true);
  }

  void newChat({bool temporary = false}) {
    if (!canSwitch()) return;
    final previous = workspace.active;
    workspace.newChat(temporary: temporary);
    if (previous != workspace.active) history.add(previous);
    select('chat');
    setState(() => conversationOpen = true);
  }

  void previousChat() {
    if (!canSwitch()) return;
    if (selected != 'chat') {
      select('chat');
      return;
    }
    if (history.isEmpty) return;
    final session = history.removeLast();
    if (!session.disposed) {
      workspace.active = session;
      workspace.changed();
    }
    setState(() {});
  }

  void support() => Navigator.push(
    context,
    MaterialPageRoute(builder: (_) => const PanicScreen()),
  );
  void search({bool commands = false}) {
    showWorkspacePalette(
      context,
      workspace,
      [
        WorkspaceCommand(
          context.tr('Новый чат', 'New chat'),
          Icons.add_rounded,
          newChat,
        ),
        WorkspaceCommand(
          context.tr('Временный чат', 'Temporary chat'),
          Icons.visibility_off_outlined,
          () => newChat(temporary: true),
        ),
        WorkspaceCommand(
          context.tr('Выбрать модель', 'Choose model'),
          Icons.auto_awesome_outlined,
          () => showModelPicker(context, workspace.active),
        ),
        for (final id in [
          'today',
          'chat',
          'journal',
          'tasks',
          'inbox',
          'settings',
        ])
          WorkspaceCommand(
            destinationLabel(context, id),
            destinationIcon(id),
            () => select(id),
          ),
        WorkspaceCommand(
          context.tr('Порядок разделов', 'Arrange navigation'),
          Icons.tune_rounded,
          customizeNavigation,
        ),
        WorkspaceCommand(
          context.tr('Поддержка рядом', 'Find support'),
          Icons.spa_outlined,
          support,
        ),
      ],
      openChat,
      searchOnly: !commands,
    );
  }

  Future<void> customizeNavigation() => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    sheetAnimationStyle: AnimationStyle(duration: studioDuration(context)),
    builder: (sheetContext) => StudioSheet(
      title: context.tr('Порядок разделов', 'Arrange navigation'),
      icon: Icons.tune_rounded,
      footer: TextButton(
        onPressed: () => Navigator.pop(sheetContext),
        child: Text(context.tr('Готово', 'Done')),
      ),
      child: SizedBox(
        height: 380,
        child: ListenableBuilder(
          listenable: workspace,
          builder: (context, _) => ReorderableListView.builder(
            itemCount: workspace.order.length,
            onReorderItem: (oldIndex, newIndex) async {
              try {
                await workspace.reorder(
                  oldIndex,
                  newIndex > oldIndex ? newIndex + 1 : newIndex,
                );
              } catch (error) {
                if (context.mounted) showError(context, error);
              }
            },
            itemBuilder: (context, index) {
              final id = workspace.order[index];
              return StudioRow(
                key: ValueKey(id),
                leading: StudioGlyph(destinationIcon(id), size: 34),
                title: Text(destinationLabel(context, id)),
                trailing: const Icon(Icons.drag_handle_rounded),
              );
            },
          ),
        ),
      ),
    ),
  );

  @override
  void dispose() {
    todayScroll.dispose();
    workspace.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final rail = MediaQuery.sizeOf(context).width >= 700;
    final expanded = MediaQuery.sizeOf(context).width >= 1100;
    final destinations = ['today', ...ChatWorkspace.destinations];
    final index = destinations.indexOf(selected);
    final navigationOrder = [
      'today',
      ...workspace.order.where((id) => id != 'settings'),
    ];
    final focusedConversation = selected == 'chat' && conversationOpen;
    Widget navigation() => ListenableBuilder(
      listenable: workspace,
      builder: (context, _) => AppNavigation(
        key: ValueKey(rail ? 'primary-rail' : 'primary-bottom'),
        vertical: rail,
        initiallyExpanded: expanded && selected != 'chat',
        destinationKeys: [for (final id in navigationOrder) navTourKeys[id]!],
        selected: navigationOrder.indexOf(
          selected == 'settings' ? 'today' : selected,
        ),
        onSelected: (value) => select(navigationOrder[value]),
        onCustomize: customizeNavigation,
        labels: [
          for (final id in navigationOrder)
            id == 'tasks'
                ? context.tr('Практики', 'Practice')
                : destinationLabel(context, id),
        ],
        icons: [for (final id in navigationOrder) destinationIcon(id)],
      ),
    );
    final content = CallbackShortcuts(
      bindings: {
        const SingleActivator(LogicalKeyboardKey.keyK, meta: true): search,
        const SingleActivator(LogicalKeyboardKey.keyK, control: true): search,
        const SingleActivator(LogicalKeyboardKey.keyN, meta: true): newChat,
        const SingleActivator(LogicalKeyboardKey.keyN, control: true): newChat,
        const SingleActivator(
          LogicalKeyboardKey.keyP,
          meta: true,
          shift: true,
        ): () =>
            search(commands: true),
        const SingleActivator(
          LogicalKeyboardKey.keyP,
          control: true,
          shift: true,
        ): () =>
            search(commands: true),
        const SingleActivator(LogicalKeyboardKey.escape): () =>
            FocusManager.instance.primaryFocus?.unfocus(),
      },
      child: Focus(
        autofocus: true,
        child: PopScope(
          canPop: selected == 'today',
          onPopInvokedWithResult: (didPop, result) {
            if (!didPop) {
              if (selected == 'journal' &&
                  journalKey.currentState?.closeEntry() == true) {
                return;
              }
              if (focusedConversation) {
                if (canSwitch()) setState(() => conversationOpen = false);
              } else {
                select('today');
              }
            }
          },
          child: Scaffold(
            bottomNavigationBar:
                rail ||
                    focusedConversation ||
                    MediaQuery.viewInsetsOf(context).bottom > 0
                ? null
                : navigation(),
            body: CosmicBackdrop(
              child: Row(
                children: [
                  if (rail) SafeArea(child: navigation()),
                  if (expanded && focusedConversation && historyVisible)
                    SizedBox(
                      key: const ValueKey('desktop-conversation-library'),
                      width: 310,
                      child: SafeArea(
                        child: ConversationSidebar(
                          workspace: workspace,
                          selected: selected,
                          onSelect: select,
                          onChat: openChat,
                          onNew: newChat,
                          onSearch: search,
                          onCollapse: () =>
                              setState(() => historyVisible = false),
                        ),
                      ),
                    ),
                  Expanded(
                    key: const ValueKey('workspace-content'),
                    child: ListenableBuilder(
                      listenable: workspace,
                      builder: (context, _) => RetainedPageStack(
                        index: index,
                        children: [
                          SafeArea(
                            child: TodayScreen(
                              workspace: workspace,
                              scrollController: todayScroll,
                              startTourKey: startTourKey,
                              settingsTourKey: settingsTourKey,
                              onNavigate: select,
                              onNewChat: newChat,
                              onOpenChat: openChat,
                              onSupport: support,
                            ),
                          ),
                          RetainedPageStack(
                            index: conversationOpen ? 1 : 0,
                            children: [
                              SafeArea(
                                child: ConversationSidebar(
                                  fullPage: true,
                                  onResume: () =>
                                      setState(() => conversationOpen = true),
                                  workspace: workspace,
                                  selected: selected,
                                  onSelect: select,
                                  onChat: openChat,
                                  onNew: newChat,
                                  onSearch: search,
                                  onCollapse: () => select('today'),
                                ),
                              ),
                              ChatScreen(
                                key: chatKey,
                                voiceTourKey: voiceTourKey,
                                composerTourKey: composerTourKey,
                                session: workspace.active,
                                onExit: () {
                                  if (canSwitch()) {
                                    setState(() => conversationOpen = false);
                                  }
                                },
                                onNewChat: newChat,
                                onSearch: search,
                                onCommands: () => search(commands: true),
                                onSupport: support,
                                onPrevious: history.isEmpty
                                    ? null
                                    : previousChat,
                              ),
                            ],
                          ),
                          for (final id in [
                            'journal',
                            'tasks',
                            'inbox',
                            'settings',
                          ])
                            if (!visited.contains(id))
                              const SizedBox.shrink()
                            else
                              SafeArea(
                                child: switch (id) {
                                  'journal' => JournalScreen(key: journalKey),
                                  'tasks' => const TasksScreen(),
                                  'inbox' => const InboxScreen(),
                                  _ => const SettingsScreen(),
                                },
                              ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    final app = context.app;
    return Stack(
      fit: StackFit.expand,
      children: [
        ExcludeFocus(excluding: app.needsProductTour, child: content),
        if (app.needsProductTour)
          ProductTour(
            key: ValueKey('tour.${app.user?['id']}'),
            steps: [
              CoachStep(
                target: startTourKey,
                title: context.tr(
                  'Здесь можно быть собой',
                  'A space to be yourself',
                ),
                description: context.tr(
                  'Начни разговор с одной мысли. «Сегодня» собирает короткие пути к тому, что сейчас нужно.',
                  'Start with one thought. Today brings together the things you might need.',
                ),
                prepare: () {
                  select('today');
                  if (todayScroll.hasClients) todayScroll.jumpTo(0);
                },
              ),
              CoachStep(
                target: voiceTourKey,
                title: context.tr(
                  'Познакомься с облачком',
                  'Meet your cloud companion',
                ),
                description: context.tr(
                  'Эта кнопка открывает голосовой разговор. Облачко слушает, моргает и мягко реагирует на смысл твоих слов. Микрофон включается только по твоему нажатию.',
                  'Open voice conversation here. Your cloud listens, blinks and gently reacts to your words. The microphone only starts when you tap record.',
                ),
                prepare: () {
                  if (!canSwitch()) return;
                  select('chat');
                  setState(() => conversationOpen = true);
                },
              ),
              CoachStep(
                target: composerTourKey,
                title: context.tr('Можно и словами', 'Writing works too'),
                description: context.tr(
                  'Пиши в своём темпе. Здесь же — запись голоса и вложения. Черновик остаётся с тобой при смене раздела.',
                  'Write at your own pace. Voice recording and attachments are here too. Your draft stays when switching sections.',
                ),
                prepare: () {},
              ),
              CoachStep(
                target: navTourKeys['chat']!,
                title: context.tr(
                  'Разговоры остаются рядом',
                  'Your conversations stay close',
                ),
                description: context.tr(
                  'Вернись к любому диалогу, найди его по названию или убери в архив.',
                  'Return to a conversation, search its title or move it to the archive.',
                ),
                prepare: () => select('chat'),
              ),
              CoachStep(
                target: navTourKeys['journal']!,
                title: context.tr(
                  'Оставь мысль для себя',
                  'Keep a thought for yourself',
                ),
                description: context.tr(
                  'В дневнике можно сохранить запись дня и перечитать предыдущие. Сохранённые записи доступны в коллекции.',
                  'Keep a daily entry and revisit earlier reflections in your journal collection.',
                ),
                prepare: () => select('journal'),
              ),
              CoachStep(
                target: navTourKeys['tasks']!,
                title: context.tr('Один небольшой шаг', 'One small step'),
                description: context.tr(
                  'Практики предлагают посильное действие на день. А на «Сегодня» есть дыхательная пауза, когда хочется замедлиться.',
                  'Practice offers one manageable daily action. Today also has a breathing pause when you want to slow down.',
                ),
                prepare: () => select('tasks'),
              ),
              CoachStep(
                target: navTourKeys['inbox']!,
                title: context.tr('Немного добрых слов', 'A little kindness'),
                description: context.tr(
                  'В сообщениях можно получать и отправлять анонимные пожелания. Обучение можно повторить в настройках.',
                  'Receive and send anonymous wishes in Messages. You can replay this tour in Settings.',
                ),
                prepare: () => select('inbox'),
              ),
            ],
            onFinished: () async {
              await app.finishProductTour();
              if (mounted) select('today');
            },
          ),
      ],
    );
  }
}
