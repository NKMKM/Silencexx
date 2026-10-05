import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../core/app_state.dart';
import '../core/chat_workspace.dart';
import '../core/theme/app_motion.dart';
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

/// The application's root is a conversation workspace, with no dashboard route.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}
class _HomeScreenState extends State<HomeScreen> {
  final scaffold = GlobalKey<ScaffoldState>();
  final chatKey = GlobalKey<ChatScreenState>();
  ChatWorkspace? _workspace;
  ChatWorkspace get workspace => _workspace!;
  String selected = 'chat';
  bool collapsed = false;
  final visited = <String>{'chat'};
  final history = <ConversationSession>[];
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_workspace == null) {
      _workspace = ChatWorkspace(context.app);
      // Do not notify ancestors during the initial widget build.
      WidgetsBinding.instance.addPostFrameCallback((_) { if (mounted) workspace.refresh(); });
    }
  }
  bool canSwitch() {
    if (chatKey.currentState?.recordingInProgress == true) {
      showError(context, context.tr('Закончите или отмените запись.', 'Finish or cancel your recording first.'));
      return false;
    }
    return true;
  }
  void select(String id) {
    if (!canSwitch()) return;
    FocusManager.instance.primaryFocus?.unfocus();
    scaffold.currentState?.closeDrawer();
    setState(() { selected = id; visited.add(id); });
  }
  void openChat(int id) {
    if (!canSwitch()) return;
    if (workspace.active.id != id) history.add(workspace.active);
    workspace.open(id);
    select('chat');
  }
  void newChat({bool temporary = false}) {
    if (!canSwitch()) return;
    final previous = workspace.active;
    workspace.newChat(temporary: temporary);
    if (previous != workspace.active) history.add(previous);
    select('chat');
  }
  void previousChat() {
    if (!canSwitch()) return;
    if (selected != 'chat') { select('chat'); return; }
    if (history.isEmpty) return;
    final session = history.removeLast();
    if (!session.disposed) { workspace.active = session; workspace.changed(); }
    setState(() {});
  }
  void support() => Navigator.push(context, MaterialPageRoute(builder: (_) => const PanicScreen()));
  void search({bool commands = false}) {
    scaffold.currentState?.closeDrawer();
    showWorkspacePalette(context, workspace, [
      WorkspaceCommand(context.tr('Новый чат', 'New chat'), Icons.add_rounded, newChat),
      WorkspaceCommand(context.tr('Временный чат', 'Temporary chat'), Icons.visibility_off_outlined, () => newChat(temporary: true)),
      WorkspaceCommand(context.tr('Выбрать модель', 'Choose model'), Icons.auto_awesome_outlined, () => showModelPicker(context, workspace.active)),
      for (final id in ['journal', 'tasks', 'inbox', 'settings'])
        WorkspaceCommand(destinationLabel(context, id), destinationIcon(id), () => select(id)),
      WorkspaceCommand(context.tr('Поддержка рядом', 'Find support'), Icons.spa_outlined, support),
    ], openChat, searchOnly: !commands);
  }
  void menu() {
    if (MediaQuery.sizeOf(context).width >= 900) setState(() => collapsed = !collapsed);
    else { FocusManager.instance.primaryFocus?.unfocus(); scaffold.currentState?.openDrawer(); }
  }
  @override
  void dispose() { workspace.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 900;
    Widget sidebar({bool compact = false}) => ConversationSidebar(
      workspace: workspace, selected: selected, onSelect: select, onChat: openChat,
      onNew: newChat, onSearch: search, collapsed: compact,
      onCollapse: wide ? menu : () => scaffold.currentState?.closeDrawer(),
    );
    final index = ChatWorkspace.destinations.indexOf(selected);
    return CallbackShortcuts(bindings: {
      const SingleActivator(LogicalKeyboardKey.keyK, meta: true): search,
      const SingleActivator(LogicalKeyboardKey.keyK, control: true): search,
      const SingleActivator(LogicalKeyboardKey.keyN, meta: true): newChat,
      const SingleActivator(LogicalKeyboardKey.keyN, control: true): newChat,
      const SingleActivator(LogicalKeyboardKey.keyP, meta: true, shift: true): () => search(commands: true),
      const SingleActivator(LogicalKeyboardKey.keyP, control: true, shift: true): () => search(commands: true),
      const SingleActivator(LogicalKeyboardKey.escape): () => scaffold.currentState?.closeDrawer(),
    }, child: Focus(autofocus: true, child: PopScope(
      canPop: selected == 'chat' && history.isEmpty,
      onPopInvokedWithResult: (didPop, result) { if (!didPop) previousChat(); },
      child: Scaffold(key: scaffold,
        drawerEdgeDragWidth: 32,
        drawer: wide ? null : Drawer(backgroundColor: Colors.transparent, elevation: 0,
          width: (MediaQuery.sizeOf(context).width - 24).clamp(260, 340),
          child: SafeArea(child: Padding(padding: const EdgeInsets.fromLTRB(8, 8, 4, 8), child: sidebar()))),
        body: Row(children: [
          if (wide) SafeArea(child: AnimatedContainer(duration: MediaQuery.disableAnimationsOf(context) ? Duration.zero : AppMotion.screen,
            curve: AppMotion.enter, width: collapsed ? 88 : 304,
            padding: const EdgeInsets.fromLTRB(12, 12, 0, 12),
            // Clip during the resize so labels never push the conversation.
            child: ClipRect(child: sidebar(compact: collapsed)))),
          Expanded(key: const ValueKey('workspace-content'), child: ListenableBuilder(
            listenable: workspace,
            builder: (context, _) => RetainedPageStack(index: index, children: [
              ChatScreen(key: chatKey, session: workspace.active, onMenu: menu,
                onNewChat: newChat, onSearch: search, onCommands: () => search(commands: true),
                onSupport: support, onPrevious: history.isEmpty ? null : previousChat),
              for (final id in ['journal', 'tasks', 'inbox', 'settings'])
                if (!visited.contains(id)) const SizedBox.shrink()
                else Scaffold(backgroundColor: Colors.transparent,
                  appBar: AppBar(leading: IconButton(tooltip: context.tr('Открыть меню', 'Open sidebar'),
                    onPressed: menu, icon: const Icon(Icons.menu_rounded)),
                    title: Text(destinationLabel(context, id)),
                    actions: [IconButton(tooltip: context.tr('Вернуться в чат', 'Back to chat'),
                      onPressed: () => select('chat'), icon: const Icon(Icons.chat_bubble_outline_rounded))]),
                  body: SafeArea(top: false, child: switch (id) {
                    'journal' => const JournalScreen(), 'tasks' => const TasksScreen(),
                    'inbox' => const InboxScreen(), _ => const SettingsScreen(),
                  })),
            ]),
          )),
        ]),
      ),
    )));
  }
}
