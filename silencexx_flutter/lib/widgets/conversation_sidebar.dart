import 'studio.dart';
import 'package:flutter/material.dart';
import '../core/api.dart';
import '../core/app_state.dart';
import '../core/chat_workspace.dart';
import '../core/theme/app_motion.dart';
import 'chat_visuals.dart';
import 'common.dart';

String destinationLabel(BuildContext context, String id) => switch (id) {
  'today' => context.tr('Сегодня', 'Today'),
  'chat' => context.tr('Разговоры', 'Conversations'),
  'journal' => context.tr('Дневник', 'Journal'),
  'tasks' => context.tr('Маленькие шаги', 'Small steps'),
  'inbox' => context.tr('Сообщения', 'Messages'),
  _ => context.tr('Настройки', 'Settings'),
};
IconData destinationIcon(String id) => switch (id) {
  'today' => Icons.space_dashboard_outlined,
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
    this.fullPage = false,
    this.onResume,
  });
  final ChatWorkspace workspace;
  final String selected;
  final ValueChanged<String> onSelect;
  final ValueChanged<int> onChat;
  final VoidCallback onNew, onSearch, onCollapse;
  final bool collapsed;
  final bool fullPage;
  final VoidCallback? onResume;
  @override
  State<ConversationSidebar> createState() => _ConversationSidebarState();
}

class _ConversationSidebarState extends State<ConversationSidebar> {
  bool archived = false;
  String query = '';

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
                if (value.trim().isNotEmpty) {
                  Navigator.pop(context, value.trim());
                }
              },
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text(context.tr('Отмена', 'Cancel')),
              ),
              FilledButton(
                onPressed: () {
                  if (controller.text.trim().isNotEmpty) {
                    Navigator.pop(context, controller.text.trim());
                  }
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
          if (mounted) {
            showError(
              context,
              context.tr(
                'Дождитесь окончания ответа.',
                'Wait for the reply to finish.',
              ),
            );
          }
          return;
        }
        if (!mounted ||
            !await confirm(
              context,
              context.tr('Удалить разговор?', 'Delete conversation?'),
            )) {
          return;
        }
        await workspace.delete(id);
      } else if (action == 'share') {
        final data = await workspace.app.api.call('/chats/$id/messages');
        final text = rows(data, 'messages')
            .map(
              (m) =>
                  '${m['role'] == 'user' ? 'You' : 'CloudMind'}: ${m['text'] ?? ''}',
            )
            .join('\n\n');
        if (mounted) {
          await shareChatText(context, '${workspace.title(chat)}\n\n$text');
        }
      }
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  String group(Json chat) {
    if (widget.workspace.meta((chat['id'] as num).toInt())['pinned'] == true) {
      return context.tr('Закреплено', 'Pinned');
    }
    final date = DateTime.tryParse(
      '${chat['last_message_date'] ?? ''}',
    )?.toLocal();
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    if (date == null) return context.tr('Ранее', 'Earlier');
    if (!date.isBefore(today)) return context.tr('Сегодня', 'Today');
    if (!date.isBefore(DateTime(now.year, now.month, now.day - 1))) {
      return context.tr('Вчера', 'Yesterday');
    }
    if (!date.isBefore(DateTime(now.year, now.month, now.day - 7))) {
      return context.tr('За неделю', 'Previous 7 days');
    }
    return context.tr('Ранее', 'Earlier');
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.workspace,
    builder: (context, _) {
      final w = widget.workspace;
      final chats = w.chats
          .where(
            (chat) => '${w.title(chat)} ${chat['last_message'] ?? ''}'
                .toLowerCase()
                .contains(query.toLowerCase().trim()),
          )
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
      final theme = Theme.of(context);
      final items = <Object>[
        for (final group in groups.entries) ...[group.key, ...group.value],
      ];
      if (widget.collapsed) {
        return Column(
          children: [
            IconButton(
              tooltip: context.tr('История чатов', 'Conversation library'),
              onPressed: widget.onCollapse,
              icon: const Icon(Icons.chevron_right_rounded),
            ),
            IconButton(
              tooltip: context.tr('Новый чат', 'New chat'),
              onPressed: widget.onNew,
              icon: const Icon(Icons.edit_square),
            ),
            IconButton(
              tooltip: context.tr('Поиск', 'Search'),
              onPressed: widget.onSearch,
              icon: const Icon(Icons.search_rounded),
            ),
          ],
        );
      }
      return Material(
        color: theme.scaffoldBackgroundColor,
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            widget.fullPage ? 24 : 18,
            widget.fullPage ? 28 : 18,
            widget.fullPage ? 24 : 18,
            8,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              StudioHeader(
                eyebrow: widget.fullPage
                    ? context.tr('ВАШИ ДИАЛОГИ', 'YOUR CONVERSATIONS')
                    : context.tr('БИБЛИОТЕКА', 'LIBRARY'),
                description:
                    widget.fullPage &&
                        MediaQuery.textScalerOf(context).scale(14) < 19
                    ? context.tr(
                        'Мысли, к которым можно вернуться.',
                        'A place to pick up your thoughts.',
                      )
                    : null,
                title: widget.fullPage
                    ? context.tr('Разговоры', 'Conversations')
                    : context.tr('История', 'History'),
                action: widget.fullPage
                    ? IconButton.filled(
                        tooltip: context.tr('Новый чат', 'New chat'),
                        onPressed: widget.onNew,
                        icon: const Icon(Icons.add_rounded),
                      )
                    : IconButton(
                        tooltip: context.tr('Закрыть историю', 'Close history'),
                        onPressed: widget.onCollapse,
                        icon: const Icon(Icons.close_rounded, size: 20),
                      ),
              ),
              if (!widget.fullPage)
                OutlinedButton.icon(
                  onPressed: widget.onNew,
                  icon: const Icon(Icons.add_rounded, size: 18),
                  label: Text(context.tr('Новый чат', 'New chat')),
                ),
              if (widget.fullPage &&
                  widget.onResume != null &&
                  w.active.draft.trim().isNotEmpty)
                StudioRow(
                  leading: const StudioGlyph(Icons.edit_note_rounded),
                  title: Text(
                    context.tr('Продолжить черновик', 'Continue your draft'),
                  ),
                  subtitle: Text(
                    w.active.draft,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  trailing: const Icon(Icons.north_east_rounded),
                  onTap: widget.onResume,
                ),
              const SizedBox(height: 14),
              TextField(
                onChanged: (value) => setState(() => query = value),
                decoration: InputDecoration(
                  hintText: context.tr('Поиск в истории', 'Search history'),
                  prefixIcon: const Icon(Icons.search_rounded, size: 19),
                  suffixIcon: IconButton(
                    tooltip: context.tr('Расширенный поиск', 'Advanced search'),
                    onPressed: widget.onSearch,
                    icon: const Icon(Icons.manage_search_rounded, size: 20),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              StudioTabs<bool>(
                segments: [
                  ButtonSegment(
                    value: false,
                    label: Text(context.tr('Недавние', 'Recent')),
                  ),
                  ButtonSegment(
                    value: true,
                    label: Text(context.tr('Архив', 'Archive')),
                  ),
                ],
                selected: {archived},
                onSelectionChanged: (values) =>
                    setState(() => archived = values.first),
              ),
              const SizedBox(height: 10),
              if (w.loading) const LinearProgressIndicator(minHeight: 2),
              if (w.error != null)
                StudioNotice(
                  error: true,
                  message: context.tr(
                    'История недоступна',
                    'History is unavailable',
                  ),
                  action: TextButton(
                    onPressed: w.refresh,
                    child: Text(context.tr('Повторить', 'Retry')),
                  ),
                ),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: w.refresh,
                  child: ListView.builder(
                    physics: const AlwaysScrollableScrollPhysics(),
                    keyboardDismissBehavior:
                        ScrollViewKeyboardDismissBehavior.onDrag,
                    itemCount: items.isEmpty ? 1 : items.length,
                    itemBuilder: (context, index) {
                      if (items.isEmpty) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 26),
                          child: w.loading
                              ? const AppSkeleton(height: 60)
                              : AppEmptyState(
                                  icon: Icons.forum_outlined,
                                  title: query.trim().isNotEmpty
                                      ? context.tr(
                                          'Ничего не найдено',
                                          'No conversations found',
                                        )
                                      : context.tr(
                                          'Пока пусто',
                                          'Nothing here yet',
                                        ),
                                  description: query.trim().isNotEmpty
                                      ? context.tr(
                                          'Попробуйте другое слово.',
                                          'Try another word.',
                                        )
                                      : archived
                                      ? context.tr(
                                          'В архиве пока пусто',
                                          'Your archive is empty',
                                        )
                                      : context.tr(
                                          'Ваши разговоры появятся здесь',
                                          'Your conversations will appear here',
                                        ),
                                ),
                        );
                      }
                      final item = items[index];
                      if (item is String) {
                        return Padding(
                          padding: const EdgeInsets.fromLTRB(8, 18, 8, 8),
                          child: Text(
                            item,
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                        );
                      }
                      final chat = item as Json;
                      return _HistoryRow(
                        spacious: widget.fullPage,
                        title: w.title(chat),
                        preview: '${chat['last_message'] ?? ''}',
                        selected:
                            widget.selected == 'chat' &&
                            w.active.id == chat['id'],
                        onTap: () => widget.onChat((chat['id'] as num).toInt()),
                        onAction: (action) => chatAction(action, chat),
                        pinned:
                            w.meta((chat['id'] as num).toInt())['pinned'] ==
                            true,
                        archived: archived,
                      );
                    },
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    },
  );
}

class _HistoryRow extends StatelessWidget {
  const _HistoryRow({
    required this.title,
    required this.preview,
    required this.selected,
    required this.onTap,
    required this.onAction,
    required this.pinned,
    required this.archived,
    this.spacious = false,
  });
  final String title, preview;
  final bool selected, pinned, archived, spacious;
  final VoidCallback onTap;
  final ValueChanged<String> onAction;
  Future<void> actions(BuildContext context) async {
    final action = await showModalBottomSheet<String>(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      sheetAnimationStyle: AnimationStyle(
        duration: studioDuration(context, AppMotion.overlay),
      ),
      builder: (context) => StudioSheet(
        title: title,
        icon: Icons.forum_outlined,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final item in [
              (
                'rename',
                Icons.edit_outlined,
                context.tr('Переименовать', 'Rename'),
              ),
              (
                'pin',
                Icons.push_pin_outlined,
                pinned
                    ? context.tr('Открепить', 'Unpin')
                    : context.tr('Закрепить', 'Pin'),
              ),
              (
                'archive',
                Icons.archive_outlined,
                archived
                    ? context.tr('Вернуть из архива', 'Unarchive')
                    : context.tr('В архив', 'Archive'),
              ),
              (
                'share',
                Icons.ios_share_rounded,
                context.tr('Поделиться', 'Share'),
              ),
              (
                'delete',
                Icons.delete_outline_rounded,
                context.tr('Удалить', 'Delete'),
              ),
            ])
              StudioRow(
                leading: Icon(
                  item.$2,
                  color: item.$1 == 'delete'
                      ? Theme.of(context).colorScheme.error
                      : null,
                ),
                title: Text(
                  item.$3,
                  style: item.$1 == 'delete'
                      ? TextStyle(color: Theme.of(context).colorScheme.error)
                      : null,
                ),
                onTap: () => Navigator.pop(context, item.$1),
              ),
          ],
        ),
      ),
    );
    if (action != null) onAction(action);
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(bottom: spacious ? 16 : 4),
    child: StudioRow(
      selected: selected,
      contentPadding: EdgeInsets.only(
        left: spacious ? 0 : 12,
        top: spacious ? 14 : 6,
        bottom: spacious ? 14 : 6,
      ),
      leading: spacious
          ? null
          : Icon(
              pinned
                  ? Icons.push_pin_outlined
                  : Icons.chat_bubble_outline_rounded,
              size: 17,
              color: selected
                  ? Theme.of(context).colorScheme.primary
                  : Theme.of(context).colorScheme.onSurfaceVariant,
            ),
      title: Text(
        title,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: spacious ? Theme.of(context).textTheme.titleLarge : null,
      ),
      subtitle: preview.trim().isEmpty || preview.trim() == title.trim()
          ? null
          : Text(
              preview,
              maxLines: spacious ? 2 : 1,
              overflow: TextOverflow.ellipsis,
            ),
      trailing: IconButton(
        tooltip: context.tr('Действия с разговором', 'Conversation actions'),
        icon: const Icon(Icons.more_horiz_rounded, size: 18),
        onPressed: () => actions(context),
      ),
      onTap: onTap,
      onLongPress: () => actions(context),
    ),
  );
}
