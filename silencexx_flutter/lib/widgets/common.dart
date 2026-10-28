import 'studio.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/api.dart';
import '../core/app_state.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_motion.dart';
import '../core/theme/app_gradients.dart';
import '../core/theme/app_radius.dart';
import '../core/theme/app_spacing.dart';
import 'design.dart';

class AppDialog extends StatelessWidget {
  const AppDialog({
    super.key,
    required this.title,
    this.content,
    this.icon,
    this.actions = const [],
  });
  final Widget title;
  final Widget? content, icon;
  final List<Widget> actions;
  @override
  Widget build(BuildContext context) => Dialog(
    backgroundColor: Colors.transparent,
    surfaceTintColor: Colors.transparent,
    insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
    elevation: 0,
    child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 480),
      child: StudioPanel(
        tone: StudioTone.elevated,
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                if (icon != null) icon!,
                const Spacer(),
                IconButton(
                  tooltip: context.tr('Закрыть', 'Close'),
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded, size: 19),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Flexible(
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    DefaultTextStyle(
                      style: Theme.of(context).textTheme.headlineSmall!,
                      child: title,
                    ),
                    if (content != null) ...[
                      const SizedBox(height: 16),
                      DefaultTextStyle(
                        style: Theme.of(context).textTheme.bodyMedium!,
                        child: content!,
                      ),
                    ],
                  ],
                ),
              ),
            ),
            if (actions.isNotEmpty) ...[
              const SizedBox(height: 24),
              const Divider(height: 1),
              const SizedBox(height: 12),
              OverflowBar(
                alignment: MainAxisAlignment.end,
                spacing: 8,
                overflowSpacing: 8,
                children: actions,
              ),
            ],
          ],
        ),
      ),
    ),
  );
}

Future<T?> showAppDialog<T>({
  required BuildContext context,
  required WidgetBuilder builder,
  AnimationStyle? animationStyle,
}) {
  final reduced = MediaQuery.disableAnimationsOf(context);
  return showGeneralDialog<T>(
    context: context,
    barrierDismissible: true,
    barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
    barrierColor: Colors.black.withValues(alpha: .46),
    transitionDuration: reduced
        ? Duration.zero
        : (animationStyle?.duration ?? AppMotion.overlay),
    pageBuilder: (context, animation, secondaryAnimation) =>
        SafeArea(child: builder(context)),
    transitionBuilder: (context, animation, secondaryAnimation, child) {
      final curved = animation.drive(CurveTween(curve: AppMotion.enter));
      return FadeTransition(
        opacity: curved,
        child: SlideTransition(
          position: Tween(
            begin: const Offset(0, .015),
            end: Offset.zero,
          ).animate(curved),
          child: ScaleTransition(
            scale: Tween(begin: .96, end: 1.0).animate(curved),
            child: child,
          ),
        ),
      );
    },
  );
}

void showError(BuildContext context, Object error) {
  if (!context.mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Row(
        children: [
          const Icon(
            Icons.error_outline_rounded,
            color: AppColors.error,
            size: 20,
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(child: Text('$error')),
        ],
      ),
    ),
  );
  if (error is ApiException && error.data['isCrisis'] == true) {
    showSupport(
      context,
      resources: error.data['helplines'] as List? ?? const [],
    );
  }
}

Future<void> showSupport(
  BuildContext context, {
  List resources = const [],
}) => showAppDialog<void>(
  context: context,
  animationStyle: const AnimationStyle(
    duration: AppMotion.overlay,
    reverseDuration: AppMotion.control,
    curve: AppMotion.enter,
    reverseCurve: AppMotion.exit,
  ),
  builder: (context) => AppDialog(
    icon: const Icon(
      Icons.favorite_outline_rounded,
      color: AppColors.primaryBright,
    ),
    title: Text(context.tr('Ты не один(одна)', 'You’re not alone')),
    content: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          context.tr(
            'Мне жаль, что сейчас так тяжело. Если тебе угрожает непосредственная опасность, обратись в местную экстренную службу. Если можешь, позови близкого человека и побудь рядом с ним.',
            'I’m sorry this feels so hard right now. If you may be in immediate danger, contact your local emergency service. If you can, reach someone you trust and stay with them.',
          ),
        ),
        if (resources.isNotEmpty) ...[
          const SizedBox(height: 16),
          for (final item in resources.whereType<Map>())
            StudioRow(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.open_in_new_rounded),
              title: Text(
                '${item['name'] ?? context.tr('Ресурс поддержки', 'Support resource')}',
              ),
              subtitle: Text('${item['number'] ?? item['url'] ?? ''}'),
              onTap: () async {
                final number = '${item['number'] ?? ''}'.trim();
                final url = '${item['url'] ?? ''}'.trim();
                final uri = Uri.tryParse(url.isNotEmpty ? url : 'tel:$number');
                if (uri != null && await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              },
            ),
        ],
        const SizedBox(height: 8),
        Text(
          context.tr(
            'Это приложение не заменяет помощь квалифицированного специалиста или экстренную службу.',
            'This app is not a replacement for qualified professional or emergency help.',
          ),
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: Text(context.tr('Продолжить разговор', 'Continue talking')),
      ),
    ],
  ),
);

Future<bool> confirm(BuildContext context, String title) async =>
    await showAppDialog<bool>(
      context: context,
      animationStyle: const AnimationStyle(
        duration: AppMotion.overlay,
        reverseDuration: AppMotion.control,
        curve: AppMotion.enter,
        reverseCurve: AppMotion.exit,
      ),
      builder: (context) => AppDialog(
        icon: const Icon(Icons.help_outline_rounded, color: AppColors.info),
        title: Text(title),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(context.tr('Отмена', 'Cancel')),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(context.tr('Подтвердить', 'Confirm')),
          ),
        ],
      ),
    ) ??
    false;

class PageBody extends StatelessWidget {
  const PageBody({
    super.key,
    required this.children,
    this.compact = false,
    this.controller,
  });

  final List<Widget> children;
  final bool compact;
  final ScrollController? controller;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final horizontal = constraints.maxWidth >= 760
          ? 40.0
          : AppSpacing.screenHorizontal;
      return Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1000),
          child: ListView(
            controller: controller,
            padding: EdgeInsets.fromLTRB(
              horizontal,
              compact ? 8 : 12,
              horizontal,
              compact ? 20 : 32,
            ),
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            children: children,
          ),
        ),
      );
    },
  );
}

class AppEmptyState extends StatelessWidget {
  const AppEmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.description,
    this.action,
  });

  final IconData icon;
  final String title;
  final String description;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 20),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        StudioGlyph(icon, size: 58),
        const SizedBox(height: 20),
        Text(title, style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 8),
        Text(description, style: Theme.of(context).textTheme.bodyMedium),
        if (action != null) ...[const SizedBox(height: 18), action!],
      ],
    ),
  );
}

class AppLoadingState extends StatelessWidget {
  const AppLoadingState({super.key, this.label});
  final String? label;
  @override
  Widget build(BuildContext context) => Semantics(
    label: label ?? context.tr('Загрузка', 'Loading'),
    liveRegion: true,
    child: Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Row(
                children: [
                  AppSkeleton(width: 42, height: 42),
                  SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        AppSkeleton(width: 120, height: 12),
                        SizedBox(height: 8),
                        AppSkeleton(height: 18),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),
              for (var i = 0; i < 3; i++)
                const Padding(
                  padding: EdgeInsets.only(bottom: 18),
                  child: Row(
                    children: [
                      AppSkeleton(width: 32, height: 32),
                      SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            AppSkeleton(height: 12),
                            SizedBox(height: 8),
                            FractionallySizedBox(
                              widthFactor: .65,
                              child: AppSkeleton(height: 9),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              if (label != null) ...[
                const SizedBox(height: 20),
                Text(
                  label!,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ],
          ),
        ),
      ),
    ),
  );
}

class AppSkeleton extends StatefulWidget {
  const AppSkeleton({super.key, required this.height, this.width});
  final double height;
  final double? width;
  @override
  State<AppSkeleton> createState() => _AppSkeletonState();
}

class _AppSkeletonState extends State<AppSkeleton>
    with SingleTickerProviderStateMixin {
  late final controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  );
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context) ||
        !TickerMode.valuesOf(context).enabled) {
      controller.stop();
    } else {
      controller.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: AnimatedBuilder(
      animation: controller,
      builder: (context, _) => Opacity(
        opacity: .45 + controller.value * .30,
        child: Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            color: Theme.of(
              context,
            ).colorScheme.onSurface.withValues(alpha: .09),
            borderRadius: BorderRadius.circular(
              widget.height > 24 ? 12 : widget.height / 2,
            ),
          ),
        ),
      ),
    ),
  );
}

class AsyncPanel extends StatefulWidget {
  const AsyncPanel({super.key, required this.load, required this.builder});

  final Future<Json> Function() load;
  final Widget Function(BuildContext, Json, VoidCallback) builder;

  @override
  State<AsyncPanel> createState() => _AsyncPanelState();
}

class _AsyncPanelState extends State<AsyncPanel> {
  late Future<Json> future = widget.load();
  Json? lastData;

  void reload() {
    if (!mounted) return;
    final request = widget.load();
    setState(() {
      future = request;
    });
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<Json>(
    future: future,
    builder: (context, snapshot) {
      final loading = snapshot.connectionState != ConnectionState.done;
      if (!loading && snapshot.hasData && !snapshot.hasError) {
        lastData = snapshot.data;
      }
      if (lastData != null) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (loading) const LinearProgressIndicator(minHeight: 2),
            if (!loading && snapshot.hasError)
              StudioNotice(
                error: true,
                message: context.tr(
                  'Не удалось обновить. Показаны сохранённые данные.',
                  'Could not refresh. Showing your previous data.',
                ),
                action: TextButton(
                  onPressed: reload,
                  child: Text(context.tr('Повторить', 'Retry')),
                ),
              ),
            Expanded(
              key: const ValueKey('loaded-content'),
              child: PageReveal(
                child: widget.builder(context, lastData!, reload),
              ),
            ),
          ],
        );
      }
      if (loading) return const AppLoadingState();
      if (snapshot.hasError) {
        return SingleChildScrollView(
          padding: EdgeInsets.zero,
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.xl),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: AppEmptyState(
                  icon: Icons.cloud_off_outlined,
                  title: context.tr(
                    'Не удалось загрузить данные',
                    'Could not load data',
                  ),
                  description: context.tr(
                    'Проверьте подключение и попробуйте ещё раз.',
                    'Check your connection and try again.',
                  ),
                  action: FilledButton.icon(
                    onPressed: reload,
                    icon: const Icon(Icons.refresh_rounded, size: 18),
                    label: Text(context.tr('Повторить', 'Try again')),
                  ),
                ),
              ),
            ),
          ),
        );
      }
      return PageReveal(child: widget.builder(context, snapshot.data!, reload));
    },
  );
}

class PressScale extends StatefulWidget {
  const PressScale({super.key, required this.child, this.scale = .975});

  final Widget child;
  final double scale;

  @override
  State<PressScale> createState() => _PressScaleState();
}

class _PressScaleState extends State<PressScale> {
  bool pressed = false;
  bool hovered = false;

  @override
  Widget build(BuildContext context) => MouseRegion(
    onEnter: (_) => setState(() => hovered = true),
    onExit: (_) => setState(() {
      hovered = false;
      pressed = false;
    }),
    child: Listener(
      behavior: HitTestBehavior.translucent,
      onPointerDown: (_) => setState(() => pressed = true),
      onPointerUp: (_) => setState(() => pressed = false),
      onPointerCancel: (_) => setState(() => pressed = false),
      child: AnimatedScale(
        scale: MediaQuery.disableAnimationsOf(context)
            ? 1
            : pressed
            ? widget.scale
            : hovered
            ? 1.012
            : 1,
        duration: AppMotion.press,
        curve: AppMotion.spring,
        child: widget.child,
      ),
    ),
  );
}

class ActionButton extends StatefulWidget {
  const ActionButton({
    super.key,
    required this.label,
    required this.action,
    this.icon,
    this.secondary = false,
    this.destructive = false,
  });

  final bool secondary, destructive;
  final String label;
  final Future<void> Function() action;
  final IconData? icon;

  @override
  State<ActionButton> createState() => _ActionButtonState();
}

class _ActionButtonState extends State<ActionButton> {
  bool busy = false;

  @override
  Widget build(BuildContext context) => PressScale(
    child: DecoratedBox(
      decoration: BoxDecoration(
        gradient: widget.secondary || widget.destructive || busy
            ? null
            : AppGradients.accent,
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: FilledButton.icon(
        style: widget.destructive
            ? FilledButton.styleFrom(
                backgroundColor: Theme.of(
                  context,
                ).colorScheme.error.withValues(alpha: .10),
                foregroundColor: Theme.of(context).colorScheme.error,
              )
            : widget.secondary
            ? FilledButton.styleFrom(
                backgroundColor: Theme.of(
                  context,
                ).colorScheme.surfaceContainerHighest,
                foregroundColor: Theme.of(context).colorScheme.onSurface,
              )
            : FilledButton.styleFrom(
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
              ),
        onPressed: busy
            ? null
            : () async {
                setState(() => busy = true);
                try {
                  await widget.action();
                } catch (error) {
                  if (context.mounted) showError(context, error);
                } finally {
                  if (mounted) setState(() => busy = false);
                }
              },
        icon: AnimatedSwitcher(
          duration: MediaQuery.disableAnimationsOf(context)
              ? Duration.zero
              : AppMotion.control,
          switchInCurve: AppMotion.enter,
          switchOutCurve: AppMotion.exit,
          child: busy
              ? SizedBox(
                  key: const ValueKey('busy'),
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: widget.secondary || widget.destructive
                        ? Theme.of(context).colorScheme.onSurface
                        : Colors.white,
                  ),
                )
              : Icon(
                  widget.icon ?? Icons.check_rounded,
                  key: const ValueKey('icon'),
                ),
        ),
        label: Text(widget.label, textAlign: TextAlign.center),
      ),
    ),
  );
}

String dateKey(DateTime date) =>
    '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
