import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/semantics.dart';
import '../core/api.dart';
import '../core/app_state.dart';
import '../core/chat_workspace.dart';
import '../core/theme/app_motion.dart';
import 'chat_visuals.dart';
import 'common.dart';
import 'glass.dart';

String destinationLabel(BuildContext context, String id) => switch (id) {
  'chat' => context.tr('Чат', 'Chat'),
  'journal' => context.tr('Дневник', 'Journal'),
  'tasks' => context.tr('Маленькие шаги', 'Small steps'),
  'inbox' => context.tr('Сообщения', 'Messages'),
  _ => context.tr('Настройки', 'Settings'),
};
IconData destinationIcon(String id) => switch (id) {
  'chat' => Icons.chat_bubble_outline_rounded,
  'journal' => Icons.auto_stories_outlined,
  'tasks' => Icons.spa_outlined,
  'inbox' => Icons.mail_outline_rounded,
  _ => Icons.tune_rounded,
};

class ConversationSidebar extends StatefulWidget {
  const ConversationSidebar({
    super.key,
    required this.workspace,
    required this.selected,
    required this.onSelect,
    required this.onChat,
    required this.onNew,
    required this.onSearch,
    required this.onCollapse,
    this.collapsed = false,
  });
  final ChatWorkspace workspace;
  final String selected;
  final ValueChanged<String> onSelect;
  final ValueChanged<int> onChat;
  final VoidCallback onNew, onSearch, onCollapse;
  final bool collapsed;
  @override
  State<ConversationSidebar> createState() => _ConversationSidebarState();
}

class _ConversationSidebarState extends State<ConversationSidebar> {
  bool archived = false;

  Future<void> reorder(int oldIndex, int newIndex) async {
    try {
      await widget.workspace.reorder(oldIndex, newIndex);
      HapticFeedback.selectionClick();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> chatAction(String action, Json chat) async {
    final workspace = widget.workspace;
    final id = (chat['id'] as num).toInt();
    try {
      if (action == 'rename') {
        final controller = TextEditingController(text: workspace.title(chat));
        final name = await showAppDialog<String>(
          context: context,
          builder: (context) => AppDialog(
            title: Text(context.tr('Название разговора', 'Conversation name')),
            content: TextField(
              controller: controller,
              autofocus: true,
              maxLength: 80,
              decoration: InputDecoration(
                hintText: context.tr('Название', 'Name'),
              ),
              onSubmitted: (value) {
                if (value.trim().isNotEmpty)
                  Navigator.pop(context, value.trim());
              },
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text(context.tr('Отмена', 'Cancel')),
              ),
              FilledButton(
                onPressed: () {
                  if (controller.text.trim().isNotEmpty)
                    Navigator.pop(context, controller.text.trim());
                },
                child: Text(context.tr('Сохранить', 'Save')),
              ),
            ],
          ),
        );
        // Wait for the route's exit animation before disposing its field.
        await Future<void>.delayed(AppMotion.overlay);
        controller.dispose();
        if (name != null) await workspace.updateMeta(id, {'title': name});
      } else if (action == 'pin') {
        await workspace.updateMeta(id, {
          'pinned': workspace.meta(id)['pinned'] != true,
        });
      } else if (action == 'archive') {
        await workspace.updateMeta(id, {
          'archived': workspace.meta(id)['archived'] != true,
        });
      } else if (action == 'delete') {
        if (workspace.sessions.any(
          (session) => session.id == id && session.busy,
        )) {
          if (mounted)
            showError(
              context,
              context.tr(
                'Дождитесь окончания ответа.',
                'Wait for the reply to finish.',
              ),
            );
          return;
        }
        if (!mounted ||
            !await confirm(
              context,
              context.tr('Удалить разговор?', 'Delete conversation?'),
            ))
          return;
        await workspace.delete(id);
      } else if (action == 'share') {
        final data = await workspace.app.api.call('/chats/$id/messages');
        final text = rows(data, 'messages')
            .map(
              (m) =>
                  '${m['role'] == 'user' ? 'You' : 'CloudMind'}: ${m['text'] ?? ''}',
            )
            .join('\n\n');
        if (mounted)
          await shareChatText(context, '${workspace.title(chat)}\n\n$text');
      }
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  String group(Json chat) {
    if (widget.workspace.meta((chat['id'] as num).toInt())['pinned'] == true)
      return context.tr('Закреплено', 'Pinned');
    final date = DateTime.tryParse(
      '${chat['last_message_date'] ?? ''}',
    )?.toLocal();
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    if (date == null) return context.tr('Ранее', 'Earlier');
    if (!date.isBefore(today)) return context.tr('Сегодня', 'Today');
    if (!date.isBefore(DateTime(now.year, now.month, now.day - 1)))
      return context.tr('Вчера', 'Yesterday');
    if (!date.isBefore(DateTime(now.year, now.month, now.day - 7)))
      return context.tr('За неделю', 'Previous 7 days');
    return context.tr('Ранее', 'Earlier');
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.workspace,
    builder: (context, _) {
      final w = widget.workspace;
      final chats = w.chats
          .where(
            (chat) =>
                (w.meta((chat['id'] as num).toInt())['archived'] == true) ==
                archived,
          )
          .toList();
      chats.sort((a, b) {
        final pinnedA = w.meta((a['id'] as num).toInt())['pinned'] == true;
        final pinnedB = w.meta((b['id'] as num).toInt())['pinned'] == true;
        if (pinnedA != pinnedB) return pinnedA ? -1 : 1;
        return '${b['last_message_date'] ?? ''}'.compareTo(
          '${a['last_message_date'] ?? ''}',
        );
      });
      final groups = <String, List<Json>>{};
      for (final chat in chats) {
        groups.putIfAbsent(group(chat), () => []).add(chat);
      }
      return GlassSurface(
        radius: 24,
        opacity: .70,
        blur: 12,
        padding: EdgeInsets.all(widget.collapsed ? 6 : 12),
        child: LayoutBuilder(
          builder: (context, constraints) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SizedBox(
                height: 52,
                child: Row(
                  children: [
                    if (!widget.collapsed) ...[
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Image.asset(
                          'assets/images/cloudmind_icon.png',
                          width: 30,
                          height: 30,
                        ),
                      ),
                      const SizedBox(width: 10),
                      const Expanded(
                        child: Text(
                          'CloudMind',
                          maxLines: 1,
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                    IconButton(
                      onPressed: widget.onCollapse,
                      tooltip: widget.collapsed
                          ? context.tr('Развернуть меню', 'Expand sidebar')
                          : context.tr('Свернуть меню', 'Collapse sidebar'),
                      icon: Icon(
                        widget.collapsed
                            ? Icons.chevron_right_rounded
                            : Icons.view_sidebar_outlined,
                        size: 20,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              if (widget.collapsed) ...[
                IconButton(
                  onPressed: widget.onNew,
                  tooltip: context.tr('Новый чат', 'New chat'),
                  icon: const Icon(Icons.edit_square, size: 21),
                ),
                IconButton(
                  onPressed: widget.onSearch,
                  tooltip: context.tr('Поиск', 'Search'),
                  icon: const Icon(Icons.search_rounded, size: 21),
                ),
              ] else ...[
                OutlinedButton.icon(
                  onPressed: widget.onNew,
                  icon: const Icon(Icons.add_rounded, size: 19),
                  label: Text(context.tr('Новый чат', 'New chat')),
                ),
                const SizedBox(height: 6),
                Material(
                  color: Colors.transparent,
                  child: ListTile(
                    dense: true,
                    leading: const Icon(Icons.search_rounded, size: 19),
                    title: Text(
                      context.tr('Найти разговор', 'Find a conversation'),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    onTap: widget.onSearch,
                  ),
                ),
              ],
              const SizedBox(height: 12),
              if (!widget.collapsed)
                Expanded(
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              archived
                                  ? context.tr('Архив', 'Archive')
                                  : context.tr('Разговоры', 'Conversations'),
                              style: Theme.of(context).textTheme.labelMedium,
                            ),
                          ),
                          IconButton(
                            tooltip: archived
                                ? context.tr(
                                    'Все разговоры',
                                    'All conversations',
                                  )
                                : context.tr('Архив', 'Archive'),
                            onPressed: () =>
                                setState(() => archived = !archived),
                            icon: Icon(
                              archived
                                  ? Icons.unarchive_outlined
                                  : Icons.inventory_2_outlined,
                              size: 17,
                            ),
                          ),
                          IconButton(
                            tooltip: context.tr('Обновить', 'Refresh'),
                            onPressed: w.loading ? null : w.refresh,
                            icon: const Icon(Icons.refresh_rounded, size: 17),
                          ),
                        ],
                      ),
                      Expanded(
                        child: w.loading
                            ? const Padding(
                                padding: EdgeInsets.all(8),
                                child: Column(
                                  children: [
                                    AppSkeleton(height: 32),
                                    SizedBox(height: 12),
                                    AppSkeleton(height: 32),
                                    SizedBox(height: 12),
                                    AppSkeleton(height: 32),
                                  ],
                                ),
                              )
                            : ListView(
                                children: [
                                  if (w.error != null)
                                    Padding(
                                      padding: const EdgeInsets.all(12),
                                      child: Column(
                                        children: [
                                          Text(
                                            context.tr(
                                              'История недоступна',
                                              'History is unavailable',
                                            ),
                                            style: Theme.of(
                                              context,
                                            ).textTheme.bodySmall,
                                          ),
                                          TextButton(
                                            onPressed: w.refresh,
                                            child: Text(
                                              context.tr('Повторить', 'Retry'),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  if (chats.isEmpty && w.error == null)
                                    Padding(
                                      padding: const EdgeInsets.symmetric(
                                        vertical: 20,
                                        horizontal: 8,
                                      ),
                                      child: Text(
                                        archived
                                            ? context.tr(
                                                'В архиве пока пусто',
                                                'Your archive is empty',
                                              )
                                            : context.tr(
                                                'Ваши разговоры появятся здесь',
                                                'Your conversations will appear here',
                                              ),
                                        style: Theme.of(
                                          context,
                                        ).textTheme.bodySmall,
                                      ),
                                    ),
                                  for (final entry in groups.entries) ...[
                                    Padding(
                                      padding: const EdgeInsets.fromLTRB(
                                        10,
                                        16,
                                        8,
                                        6,
                                      ),
                                      child: Text(
                                        entry.key,
                                        style: Theme.of(
                                          context,
                                        ).textTheme.labelSmall,
                                      ),
                                    ),
                                    for (final chat in entry.value)
                                      _HistoryRow(
                                        title: w.title(chat),
                                        selected:
                                            widget.selected == 'chat' &&
                                            w.active.id == chat['id'],
                                        onTap: () => widget.onChat(
                                          (chat['id'] as num).toInt(),
                                        ),
                                        onAction: (action) =>
                                            chatAction(action, chat),
                                        pinned:
                                            w.meta(
                                              (chat['id'] as num).toInt(),
                                            )['pinned'] ==
                                            true,
                                        archived: archived,
                                      ),
                                  ],
                                ],
                              ),
                      ),
                    ],
                  ),
                )
              else
                const Spacer(),
              const Divider(height: 24),
              if (constraints.maxHeight >= 480 || widget.collapsed)
                ReorderableListView.builder(
                  key: const ValueKey('reorder-navigation'),
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  buildDefaultDragHandles: false,
                  itemCount: w.order.length,
                  onReorderStart: (_) => HapticFeedback.lightImpact(),
                  onReorder: reorder,
                  proxyDecorator: (child, index, animation) => AnimatedBuilder(
                    animation: animation,
                    builder: (context, _) => Transform.scale(
                      scale:
                          1 + .03 * Curves.easeOut.transform(animation.value),
                      child: GlassSurface(
                        radius: 14,
                        opacity: .96,
                        blur: 10,
                        child: child,
                      ),
                    ),
                  ),
                  itemBuilder: (context, index) {
                    final id = w.order[index];
                    return Semantics(
                      key: ValueKey('nav-$id'),
                      selected: widget.selected == id,
                      customSemanticsActions: {
                        if (index > 0)
                          CustomSemanticsAction(
                            label: context.tr('Переместить выше', 'Move up'),
                          ): () =>
                              reorder(index, index - 1),
                        if (index < w.order.length - 1)
                          CustomSemanticsAction(
                            label: context.tr('Переместить ниже', 'Move down'),
                          ): () =>
                              reorder(index, index + 2),
                      },
                      child: ReorderableDelayedDragStartListener(
                        index: index,
                        child: Tooltip(
                          message: destinationLabel(context, id),
                          child: AnimatedContainer(
                            duration: MediaQuery.disableAnimationsOf(context)
                                ? Duration.zero
                                : AppMotion.control,
                            margin: const EdgeInsets.symmetric(vertical: 2),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(14),
                              color: widget.selected == id
                                  ? Theme.of(
                                      context,
                                    ).colorScheme.primary.withValues(alpha: .14)
                                  : Colors.transparent,
                            ),
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: () => widget.onSelect(id),
                                borderRadius: BorderRadius.circular(14),
                                child: SizedBox(
                                  height: 44,
                                  child: Row(
                                    children: [
                                      SizedBox(
                                        width: 44,
                                        child: Icon(
                                          destinationIcon(id),
                                          size: 19,
                                        ),
                                      ),
                                      if (!widget.collapsed)
                                        Expanded(
                                          child: Text(
                                            destinationLabel(context, id),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: Theme.of(
                                              context,
                                            ).textTheme.labelLarge,
                                          ),
                                        ),
                                      if (!widget.collapsed)
                                        const Padding(
                                          padding: EdgeInsets.only(right: 8),
                                          child: Icon(
                                            Icons.drag_indicator_rounded,
                                            size: 14,
                                            color: Colors.grey,
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                )
              else
                PopupMenuButton<String>(
                  onSelected: widget.onSelect,
                  itemBuilder: (context) => [
                    for (final id in w.order)
                      PopupMenuItem(
                        value: id,
                        child: Text(destinationLabel(context, id)),
                      ),
                  ],
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text(context.tr('Разделы', 'Workspace')),
                  ),
                ),
              if (!widget.collapsed)
                Padding(
                  padding: const EdgeInsets.only(top: 12, bottom: 4),
                  child: Text(
                    context.tr(
                      'Зажмите раздел, чтобы переместить',
                      'Hold a section to rearrange',
                    ),
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                ),
            ],
          ),
        ),
      );
    },
  );
}

class _HistoryRow extends StatefulWidget {
  const _HistoryRow({
    required this.title,
    required this.selected,
    required this.onTap,
    required this.onAction,
    required this.pinned,
    required this.archived,
  });
  final String title;
  final bool selected, pinned, archived;
  final VoidCallback onTap;
  final ValueChanged<String> onAction;
  @override
  State<_HistoryRow> createState() => _HistoryRowState();
}

class _HistoryRowState extends State<_HistoryRow> {
  bool hover = false;
  @override
  Widget build(BuildContext context) => MouseRegion(
    onEnter: (_) => setState(() => hover = true),
    onExit: (_) => setState(() => hover = false),
    child: Material(
      color: widget.selected
          ? Theme.of(context).colorScheme.onSurface.withValues(alpha: .06)
          : Colors.transparent,
      borderRadius: BorderRadius.circular(12),
      child: ListTile(
        dense: true,
        contentPadding: const EdgeInsets.only(left: 10),
        title: Text(
          widget.title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        onTap: widget.onTap,
        trailing: AnimatedOpacity(
          opacity:
              hover || widget.selected || MediaQuery.sizeOf(context).width < 900
              ? 1
              : .35,
          duration: AppMotion.fast,
          child: PopupMenuButton<String>(
            tooltip: context.tr(
              'Действия с разговором',
              'Conversation actions',
            ),
            icon: const Icon(Icons.more_horiz_rounded, size: 18),
            onSelected: widget.onAction,
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'rename',
                child: Text(context.tr('Переименовать', 'Rename')),
              ),
              PopupMenuItem(
                value: 'pin',
                child: Text(
                  widget.pinned
                      ? context.tr('Открепить', 'Unpin')
                      : context.tr('Закрепить', 'Pin'),
                ),
              ),
              PopupMenuItem(
                value: 'archive',
                child: Text(
                  widget.archived
                      ? context.tr('Вернуть из архива', 'Unarchive')
                      : context.tr('В архив', 'Archive'),
                ),
              ),
              PopupMenuItem(
                value: 'share',
                child: Text(context.tr('Поделиться', 'Share')),
              ),
              PopupMenuItem(
                value: 'delete',
                child: Text(context.tr('Удалить', 'Delete')),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
