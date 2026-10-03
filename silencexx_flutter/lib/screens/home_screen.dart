import 'package:flutter/material.dart';

import '../core/api.dart';
import '../core/app_state.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_gradients.dart';
import '../core/theme/app_motion.dart';
import '../core/theme/app_radius.dart';
import '../core/theme/app_shadows.dart';
import '../core/theme/app_spacing.dart';
import '../widgets/common.dart';
import '../widgets/glass.dart';
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
      context.tr('Чат', 'Chat'),
      context.tr('Дневник', 'Journal'),
      context.tr('Настройки', 'Settings'),
    ];
    const icons = [
      Icons.auto_awesome_rounded,
      Icons.forum_rounded,
      Icons.calendar_month_rounded,
      Icons.tune_rounded,
    ];
    return Scaffold(
      extendBody: true,
      appBar: tab == 1
          ? null
          : AppBar(
              title: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 31,
                    height: 31,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                      boxShadow: AppShadows.accent,
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                      child: Image.asset(
                        'assets/images/cloudmind_icon.png',
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(tab == 0 ? 'CloudMind' : labels[tab]),
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
        child: AnimatedSwitcher(
          duration: AppMotion.screen,
          switchInCurve: AppMotion.enter,
          switchOutCurve: AppMotion.exit,
          transitionBuilder: (child, animation) => FadeTransition(
            opacity: animation,
            child: SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0, .018),
                end: Offset.zero,
              ).animate(animation),
              child: child,
            ),
          ),
          child: KeyedSubtree(
            key: ValueKey(tab),
            child: switch (tab) {
              0 => Dashboard(
                onTabSelected: (value) => setState(() => tab = value),
              ),
              1 => ChatScreen(onExit: () => setState(() => tab = 0)),
              2 => const JournalScreen(),
              3 => const SettingsScreen(),
              _ => const SettingsScreen(),
            },
          ),
        ),
      ),
      bottomNavigationBar: tab == 1
          ? null
          : SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 6, 16, 10),
                child: GlassSurface(
                  radius: AppRadius.xl,
                  opacity: .34,
                  blur: 9,
                  padding: const EdgeInsets.all(6),
                  child: Row(
                    children: [
                      for (var i = 0; i < labels.length; i++)
                        Expanded(
                          child: _NavigationItem(
                            icon: icons[i],
                            label: labels[i],
                            selected: tab == i,
                            onTap: () => setState(() => tab = i),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
    );
  }
}

class _NavigationItem extends StatelessWidget {
  const _NavigationItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected
        ? Theme.of(context).colorScheme.primary
        : Theme.of(context).colorScheme.onSurface.withValues(alpha: .62);
    return PressScale(
      scale: .96,
      child: Semantics(
        button: true,
        selected: selected,
        label: label,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(18),
            child: AnimatedContainer(
              duration: AppMotion.control,
              curve: AppMotion.enter,
              height: 56,
              decoration: BoxDecoration(
                color: selected
                    ? Theme.of(
                        context,
                      ).colorScheme.primary.withValues(alpha: .13)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(icon, size: 20, color: color),
                  const SizedBox(height: 3),
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: color,
                      fontSize: 10,
                      fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                    ),
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
      return PageBody(
        children: [
          const SizedBox(height: 14),
          Text(
            context.tr('Место для себя', 'A moment for yourself'),
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            context.tr(
              name.isEmpty ? 'Рады вас видеть' : 'Привет, $name',
              name.isEmpty ? 'A little space for you' : 'Welcome back, $name',
            ),
            style: Theme.of(context).textTheme.headlineLarge,
          ),
          const SizedBox(height: 6),
          Text(
            context.tr(
              'Здесь можно выдохнуть и разобраться в своих мыслях.',
              'Take a breath. There is room to sort through your thoughts.',
            ),
          ),
          const SizedBox(height: 20),
          _ConversationHero(onTap: () => widget.onTabSelected(1)),
          const SizedBox(height: 14),
          LayoutBuilder(
            builder: (context, constraints) {
              final width = (constraints.maxWidth - 12) / 2;
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
                      onTap: () => widget.onTabSelected(2),
                    ),
                  ),
                  SizedBox(
                    width: width,
                    child: _BentoTile(
                      icon: Icons.spa_outlined,
                      title: context.tr('Маленькие шаги', 'Small steps'),
                      detail: context.tr('Задания на сегодня', 'Today’s tasks'),
                      accent: AppColors.primaryBright,
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const TasksScreen()),
                      ),
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
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const InboxScreen()),
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 28),
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
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final foreground = dark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final muted = dark ? AppColors.textSecondary : AppColors.lightTextSecondary;
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.xxl),
        gradient: dark
            ? AppGradients.hero
            : const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFFE8EBFC), Color(0xFFF2EDFB)],
              ),
        border: Border.all(
          color: dark ? AppColors.border : const Color(0x203E634B),
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            right: -34,
            top: -45,
            child: Container(
              width: 150,
              height: 150,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.primary.withValues(alpha: dark ? .08 : .10),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: .15),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(
                    Icons.forum_outlined,
                    color: dark
                        ? AppColors.primaryBright
                        : AppColors.primaryPressed,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  context.tr('Можно начать с малого', 'Start wherever you are'),
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: foreground,
                    fontSize: 22,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  context.tr(
                    'Расскажи, что у тебя на душе. Я рядом.',
                    'Tell me what is on your mind. I’m here.',
                  ),
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(color: muted),
                ),
                const SizedBox(height: 18),
                FilledButton.icon(
                  onPressed: onTap,
                  icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                  label: Text(
                    context.tr('Начать разговор', 'Start a conversation'),
                  ),
                ),
                const SizedBox(height: 4),
                TextButton.icon(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const PanicScreen()),
                  ),
                  icon: const Icon(Icons.favorite_border_rounded, size: 17),
                  label: Text(
                    context.tr('Мне нужна поддержка', 'I need support'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
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
  Widget build(BuildContext context) => PressScale(
    child: Material(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        child: Ink(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.border),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                accent.withValues(alpha: .10),
                Theme.of(context).colorScheme.surface,
              ],
            ),
          ),
          child: SizedBox(
            height: 128,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: accent.withValues(alpha: .12),
                        borderRadius: BorderRadius.circular(AppRadius.md),
                      ),
                      child: Icon(icon, color: accent, size: 20),
                    ),
                    const Spacer(),
                    Icon(Icons.arrow_outward_rounded, color: accent, size: 17),
                  ],
                ),
                const Spacer(),
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 3),
                Text(
                  detail,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}
