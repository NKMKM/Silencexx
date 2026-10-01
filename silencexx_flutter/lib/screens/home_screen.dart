import 'package:flutter/material.dart';

import '../core/api.dart';
import '../core/app_state.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_gradients.dart';
import '../core/theme/app_radius.dart';
import '../core/theme/app_shadows.dart';
import '../core/theme/app_spacing.dart';
import '../widgets/common.dart';
import 'chat_screen.dart';
import 'inbox_screen.dart';
import 'journal_screen.dart';
import 'panic_screen.dart';
import 'settings_screen.dart';
import 'tasks_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int tab = 0;

  @override
  Widget build(BuildContext context) {
    final labels = [
      context.tr('Главная', 'Home'),
      context.tr('Дневник', 'Journal'),
      context.tr('Задания', 'Tasks'),
      context.tr('Почта', 'Inbox'),
      context.tr('Настройки', 'Settings'),
    ];
    const icons = [
      Icons.auto_awesome_rounded,
      Icons.calendar_month_rounded,
      Icons.task_alt_rounded,
      Icons.inbox_outlined,
      Icons.tune_rounded,
    ];
    return Scaffold(
      extendBody: true,
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 31,
              height: 31,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(AppRadius.sm),
                gradient: AppGradients.accent,
                boxShadow: AppShadows.accent,
              ),
              child: const Icon(
                Icons.auto_awesome_rounded,
                size: 18,
                color: Colors.white,
              ),
            ),
            const SizedBox(width: 10),
            Text(tab == 0 ? 'SilenceXX' : labels[tab]),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: AppSpacing.xs),
            child: IconButton.filledTonal(
              tooltip: context.tr('Мне тревожно', 'I feel anxious'),
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const PanicScreen()),
              ),
              icon: const Icon(Icons.favorite_border_rounded),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: switch (tab) {
          0 => Dashboard(onTabSelected: (value) => setState(() => tab = value)),
          1 => const JournalScreen(),
          2 => const TasksScreen(),
          3 => const InboxScreen(),
          _ => const SettingsScreen(),
        },
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.sm,
            AppSpacing.xs,
            AppSpacing.sm,
            AppSpacing.xs,
          ),
          child: Container(
            decoration: BoxDecoration(
              color: AppColors.surface.withValues(alpha: .96),
              borderRadius: BorderRadius.circular(AppRadius.xl),
              border: Border.all(color: AppColors.border),
              boxShadow: AppShadows.ambient,
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.xl),
              child: NavigationBar(
                selectedIndex: tab,
                onDestinationSelected: (value) => setState(() => tab = value),
                destinations: [
                  for (var i = 0; i < labels.length; i++)
                    NavigationDestination(
                      icon: Icon(icons[i]),
                      label: labels[i],
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class Dashboard extends StatefulWidget {
  const Dashboard({super.key, required this.onTabSelected});

  final ValueChanged<int> onTabSelected;

  @override
  State<Dashboard> createState() => _DashboardState();
}

class _DashboardState extends State<Dashboard> {
  int revision = 0;

  Future<void> open({int? id, bool temporary = false}) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ChatScreen(chatId: id, temporary: temporary),
      ),
    );
    if (mounted) setState(() => revision++);
  }

  @override
  Widget build(BuildContext context) => AsyncPanel(
    key: ValueKey(revision),
    load: () => context.app.api.call('/chats/list'),
    builder: (context, data, reload) {
      final name = '${context.app.user?['name'] ?? ''}'.trim();
      final chatList = rows(data, 'chats');
      final wide = MediaQuery.sizeOf(context).width > 620;

      return PageBody(
        children: [
          const SizedBox(height: 8),
          Text(
            context.tr('ВАШЕ ПРОСТРАНСТВО', 'YOUR QUIET SPACE'),
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: AppColors.primaryBright,
              letterSpacing: 2.2,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            context.tr(
              name.isEmpty ? 'Рады вас видеть' : 'Привет, $name',
              name.isEmpty ? 'A little space for you' : 'Welcome back, $name',
            ),
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 6),
          Text(
            context.tr(
              'Здесь можно выдохнуть и разобраться в своих мыслях.',
              'Take a breath. There is room to sort through your thoughts.',
            ),
          ),
          const SizedBox(height: 22),
          _ConversationHero(onTap: () => open()),
          const SizedBox(height: 14),
          LayoutBuilder(
            builder: (context, constraints) {
              final width = wide
                  ? (constraints.maxWidth - 12) / 2
                  : constraints.maxWidth;
              return Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  SizedBox(
                    width: width,
                    child: _BentoTile(
                      icon: Icons.history_rounded,
                      title: context.tr('Дневник', 'Journal'),
                      detail: context.tr(
                        'Мысли и настроение',
                        'Thoughts and mood',
                      ),
                      accent: AppColors.secondary,
                      onTap: () => widget.onTabSelected(1),
                    ),
                  ),
                  SizedBox(
                    width: width,
                    child: _BentoTile(
                      icon: Icons.spa_outlined,
                      title: context.tr('Маленькие шаги', 'Small steps'),
                      detail: context.tr('Задания на сегодня', 'Today’s tasks'),
                      accent: AppColors.primaryBright,
                      onTap: () => widget.onTabSelected(2),
                    ),
                  ),
                  SizedBox(
                    width: width,
                    child: _BentoTile(
                      icon: Icons.hourglass_bottom_rounded,
                      title: context.tr('Без истории', 'Temporary chat'),
                      detail: context.tr(
                        'Разговор останется личным',
                        'A conversation without history',
                      ),
                      accent: AppColors.info,
                      onTap: () => open(temporary: true),
                    ),
                  ),
                  SizedBox(
                    width: width,
                    child: _BentoTile(
                      icon: Icons.mark_email_unread_outlined,
                      title: context.tr('Сообщения', 'Messages'),
                      detail: context.tr('Ваше пространство', 'A note for you'),
                      accent: AppColors.textSecondary,
                      onTap: () => widget.onTabSelected(3),
                    ),
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 26),
          Row(
            children: [
              Expanded(
                child: Text(
                  context.tr('Недавние разговоры', 'Recent conversations'),
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              IconButton(
                onPressed: reload,
                tooltip: context.tr('Обновить', 'Refresh'),
                icon: const Icon(Icons.refresh_rounded),
              ),
            ],
          ),
          if (chatList.isEmpty)
            SectionCard(
              child: Row(
                children: [
                  const Icon(
                    Icons.chat_bubble_outline_rounded,
                    color: AppColors.secondary,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      context.tr(
                        'История ваших разговоров появится здесь.',
                        'Your conversations will appear here.',
                      ),
                    ),
                  ),
                ],
              ),
            ),
          for (final chat in chatList)
            Card(
              clipBehavior: Clip.antiAlias,
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 6,
                ),
                leading: CircleAvatar(
                  backgroundColor: AppColors.secondary.withValues(alpha: .12),
                  child: Icon(
                    Icons.forum_outlined,
                    color: AppColors.primaryBright,
                  ),
                ),
                title: Text(
                  '${chat['last_message'] ?? ''}'.isEmpty
                      ? context.tr('Новый разговор', 'New conversation')
                      : '${chat['last_message']}',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                subtitle: Text(
                  '${chat['last_message_date'] ?? ''}'.split('T').first,
                ),
                onTap: () => open(id: (chat['id'] as num).toInt()),
                trailing: IconButton(
                  icon: const Icon(Icons.delete_outline_rounded),
                  onPressed: () async {
                    final api = context.app.api;
                    if (!await confirm(
                      context,
                      context.tr('Удалить разговор?', 'Delete conversation?'),
                    )) {
                      return;
                    }
                    try {
                      await api.call('/chats/${chat['id']}', method: 'DELETE');
                      reload();
                    } catch (error) {
                      if (context.mounted) showError(context, error);
                    }
                  },
                ),
              ),
            ),
          const SizedBox(height: 20),
          Text(
            context.tr(
              'AI может ошибаться. Приложение не заменяет профессиональную помощь.',
              'AI can make mistakes. This app does not replace professional care.',
            ),
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
        ],
      );
    },
  );
}

class _ConversationHero extends StatelessWidget {
  const _ConversationHero({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(AppSpacing.lg),
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(AppRadius.xxl),
      gradient: AppGradients.hero,
      border: Border.all(color: AppColors.border),
      boxShadow: AppShadows.ambient,
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 46,
          height: 46,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppColors.primary.withValues(alpha: .10),
            border: Border.all(color: AppColors.primary.withValues(alpha: .20)),
          ),
          child: const Icon(
            Icons.nights_stay_outlined,
            color: AppColors.primaryBright,
          ),
        ),
        const SizedBox(height: 18),
        Text(
          context.tr('Давайте поговорим', 'Let’s talk'),
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 7),
        Text(
          context.tr(
            'Поделитесь тем, что чувствуете, в своём темпе.',
            'Share what is on your mind, at your own pace.',
          ),
        ),
        const SizedBox(height: 19),
        Wrap(
          spacing: 10,
          runSpacing: 8,
          children: [
            FilledButton.icon(
              onPressed: onTap,
              icon: const Icon(Icons.arrow_upward_rounded, size: 18),
              label: Text(context.tr('Новый разговор', 'Start a conversation')),
            ),
            OutlinedButton.icon(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const PanicScreen()),
              ),
              icon: const Icon(Icons.favorite_border_rounded, size: 18),
              label: Text(context.tr('Нужна поддержка', 'I need support')),
            ),
          ],
        ),
      ],
    ),
  );
}

class _BentoTile extends StatelessWidget {
  const _BentoTile({
    required this.icon,
    required this.title,
    required this.detail,
    required this.accent,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String detail;
  final Color accent;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
    color: AppColors.surface,
    borderRadius: BorderRadius.circular(AppRadius.lg),
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: Ink(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(color: AppColors.border),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              accent.withValues(alpha: .075),
              AppColors.surface.withValues(alpha: 0),
            ],
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 41,
              height: 41,
              decoration: BoxDecoration(
                color: accent.withValues(alpha: .12),
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Icon(icon, color: accent, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 3),
                  Text(detail, style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
            Icon(
              Icons.arrow_forward_rounded,
              color: accent.withValues(alpha: .8),
              size: 18,
            ),
          ],
        ),
      ),
    ),
  );
}
