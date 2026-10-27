import 'studio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../core/app_state.dart';
import '../core/chat_workspace.dart';
import 'common.dart';

class WorkspaceCommand {
  const WorkspaceCommand(this.label, this.icon, this.run);
  final String label;
  final IconData icon;
  final VoidCallback run;
}

Future<void> showWorkspacePalette(
  BuildContext context,
  ChatWorkspace workspace,
  List<WorkspaceCommand> commands,
  ValueChanged<int> openChat, {
  bool searchOnly = false,
}) => showAppDialog<void>(
  context: context,
  builder: (context) => _CommandPalette(
    workspace: workspace,
    commands: commands,
    openChat: openChat,
    searchOnly: searchOnly,
  ),
);

class _CommandPalette extends StatefulWidget {
  const _CommandPalette({
    required this.workspace,
    required this.commands,
    required this.openChat,
    required this.searchOnly,
  });
  final ChatWorkspace workspace;
  final List<WorkspaceCommand> commands;
  final ValueChanged<int> openChat;
  final bool searchOnly;
  @override
  State<_CommandPalette> createState() => _CommandPaletteState();
}

class _CommandPaletteState extends State<_CommandPalette> {
  final query = TextEditingController();
  final scroll = ScrollController();
  int selected = 0;
  @override
  void dispose() {
    query.dispose();
    scroll.dispose();
    super.dispose();
  }

  double get rowHeight =>
      52 + (MediaQuery.textScalerOf(context).scale(14) - 14) * 1.6;
  List<WorkspaceCommand> get results =>
      [
            if (!widget.searchOnly) ...widget.commands,
            for (final chat in widget.workspace.chats)
              WorkspaceCommand(
                widget.workspace.title(chat),
                Icons.chat_bubble_outline_rounded,
                () => widget.openChat((chat['id'] as num).toInt()),
              ),
          ]
          .where(
            (item) => item.label.toLowerCase().contains(
              query.text.trim().toLowerCase(),
            ),
          )
          .toList();
  void activateCommand(WorkspaceCommand item) {
    Navigator.pop(context);
    item.run();
  }

  @override
  Widget build(BuildContext context) {
    final items = results;
    return Focus(
      onKeyEvent: (node, event) {
        if (event is! KeyDownEvent || items.isEmpty) {
          return KeyEventResult.ignored;
        }
        if (event.logicalKey == LogicalKeyboardKey.arrowDown ||
            event.logicalKey == LogicalKeyboardKey.arrowUp) {
          setState(
            () => selected =
                (selected +
                    (event.logicalKey == LogicalKeyboardKey.arrowDown
                        ? 1
                        : -1)) %
                items.length,
          );
          if (scroll.hasClients) {
            scroll.animateTo(
              (selected * rowHeight).clamp(0, scroll.position.maxScrollExtent),
              duration: MediaQuery.disableAnimationsOf(context)
                  ? Duration.zero
                  : const Duration(milliseconds: 150),
              curve: Curves.easeOut,
            );
          }
          return KeyEventResult.handled;
        }
        return KeyEventResult.ignored;
      },
      child: AppDialog(
        title: Text(
          widget.searchOnly
              ? context.tr('Поиск разговоров', 'Search conversations')
              : context.tr('Быстрые действия', 'Quick actions'),
        ),
        content: SizedBox(
          width: 440,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: query,
                autofocus: true,
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.search_rounded),
                  hintText: context.tr('Начните вводить…', 'Start typing…'),
                ),
                onChanged: (_) => setState(() => selected = 0),
                onSubmitted: (_) {
                  if (items.isNotEmpty) {
                    activateCommand(items[selected.clamp(0, items.length - 1)]);
                  }
                },
              ),
              const SizedBox(height: 12),
              if (items.isEmpty)
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(context.tr('Ничего не найдено', 'No results')),
                )
              else
                SizedBox(
                  height: (items.length * rowHeight).clamp(rowHeight, 320),
                  child: ListView.builder(
                    controller: scroll,
                    itemCount: items.length,
                    itemExtent: rowHeight,
                    itemBuilder: (context, index) => Semantics(
                      selected: index == selected,
                      child: StudioRow(
                        selected: index == selected,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        selectedTileColor: Theme.of(
                          context,
                        ).colorScheme.primary.withValues(alpha: .12),
                        leading: Icon(items[index].icon, size: 18),
                        title: Text(
                          items[index].label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        onTap: () => activateCommand(items[index]),
                      ),
                    ),
                  ),
                ),
              const SizedBox(height: 8),
              if (MediaQuery.sizeOf(context).width >= 700)
                Text(
                  context.tr(
                    '↑ ↓ выбрать · Enter открыть · Esc закрыть',
                    '↑ ↓ select · Enter open · Esc close',
                  ),
                  style: Theme.of(context).textTheme.labelSmall,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
