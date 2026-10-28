import 'package:flutter/material.dart';
import '../core/app_state.dart';
import '../core/chat_workspace.dart';
import '../widgets/common.dart';
import '../widgets/design.dart';
import '../widgets/studio.dart';

/// An action-led daily entrance. It makes no additional backend requests.
class TodayScreen extends StatelessWidget {
  const TodayScreen({
    super.key,
    required this.workspace,
    this.scrollController,
    this.startTourKey,
    this.settingsTourKey,
    required this.onNavigate,
    required this.onNewChat,
    required this.onOpenChat,
    required this.onSupport,
  });
  final ScrollController? scrollController;
  final GlobalKey? startTourKey, settingsTourKey;
  final ChatWorkspace workspace;
  final ValueChanged<String> onNavigate;
  final VoidCallback onNewChat, onSupport;
  final ValueChanged<int> onOpenChat;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final now = DateTime.now();
    final greeting = now.hour < 12
        ? context.tr('Доброе утро', 'Good morning')
        : now.hour < 18
        ? context.tr('Добрый день', 'Good afternoon')
        : context.tr('Добрый вечер', 'Good evening');
    final recent = workspace.chats
        .where(
          (chat) =>
              workspace.metadata['${chat['id']}'] is! Map ||
              (workspace.metadata['${chat['id']}'] as Map)['archived'] != true,
        )
        .firstOrNull;
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 760;
        final conversation = StudioPanel(
          tone: StudioTone.accent,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const LivingEmblem(size: 48),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Text(
                      context.tr('ТВОЁ ПРОСТРАНСТВО', 'YOUR SPACE'),
                      style: theme.textTheme.labelSmall,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                context.tr(
                  'Можно просто\nбыть собой.',
                  'Room to be\nyourself.',
                ),
                style: theme.textTheme.headlineLarge,
              ),
              const SizedBox(height: 12),
              Text(
                context.tr(
                  'Расскажи, что сейчас на душе. С любого места.',
                  'Tell me what is on your mind. Start anywhere.',
                ),
                style: theme.textTheme.bodyLarge,
              ),
              const SizedBox(height: 16),
              ActionButton(
                key: startTourKey,
                label: context.tr('Начать разговор', 'Start a conversation'),
                icon: Icons.north_east_rounded,
                action: () async => onNewChat(),
              ),
              if (recent != null)
                TextButton.icon(
                  onPressed: () => onOpenChat((recent['id'] as num).toInt()),
                  icon: const Icon(Icons.history_rounded, size: 18),
                  label: Text(
                    context.tr('Продолжить: ', 'Continue: ') +
                        workspace.title(recent),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
            ],
          ),
        );
        final rituals = Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              context.tr('Маленькое время для себя', 'A little time for you'),
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            _DailyPath(
              number: '01',
              title: context.tr('Сохранить мысль', 'Keep a thought'),
              detail: context.tr('Личный дневник', 'Your private journal'),
              icon: Icons.edit_note_rounded,
              onTap: () => onNavigate('journal'),
            ),
            const Divider(height: 24),
            _DailyPath(
              number: '02',
              title: context.tr('Сделать маленький шаг', 'Take a small step'),
              detail: context.tr('Практика на сегодня', 'Today’s practice'),
              icon: Icons.spa_outlined,
              onTap: () => onNavigate('tasks'),
            ),
            const Divider(height: 24),
            _DailyPath(
              number: '03',
              title: context.tr('Выдохнуть', 'Take a breath'),
              detail: context.tr('Когда нужна опора', 'Find a moment of calm'),
              icon: Icons.air_rounded,
              onTap: onSupport,
            ),
          ],
        );
        return PageBody(
          controller: scrollController,
          children: [
            StudioHeader(
              eyebrow:
                  '${now.day.toString().padLeft(2, '0')}.${now.month.toString().padLeft(2, '0')}',
              title: greeting,
              action: IconButton(
                key: settingsTourKey,
                tooltip: context.tr('Настройки', 'Settings'),
                onPressed: () => onNavigate('settings'),
                icon: const Icon(Icons.tune_rounded),
              ),
            ),
            const SizedBox(height: 18),
            if (wide)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 6,
                    child: StagedEntry(order: 0, child: conversation),
                  ),
                  const SizedBox(width: 28),
                  Expanded(
                    flex: 5,
                    child: StagedEntry(order: 1, child: rituals),
                  ),
                ],
              )
            else ...[
              StagedEntry(order: 0, child: conversation),
              const SizedBox(height: 16),
              StagedEntry(order: 1, child: rituals),
            ],
            const SizedBox(height: 16),
          ],
        );
      },
    );
  }
}

class _DailyPath extends StatelessWidget {
  const _DailyPath({
    required this.number,
    required this.title,
    required this.detail,
    required this.icon,
    required this.onTap,
  });
  final String number, title, detail;
  final IconData icon;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => StudioRow(
    contentPadding: EdgeInsets.zero,
    leading: Text(
      number,
      style: Theme.of(context).textTheme.labelLarge?.copyWith(
        color: Theme.of(context).colorScheme.primary,
      ),
    ),
    title: Text(title),
    subtitle: Text(detail),
    trailing: Icon(icon),
    onTap: onTap,
  );
}
