import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/api.dart';
import '../core/app_state.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_motion.dart';
import '../core/theme/app_radius.dart';
import '../core/theme/app_spacing.dart';
import 'design.dart';
import 'glass.dart';

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
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
    elevation: 0,
    child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 480),
      child: GlassSurface(
        radius: 28,
        opacity: .94,
        blur: 12,
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                if (icon != null) ...[icon!, const SizedBox(width: 12)],
                Expanded(
                  child: DefaultTextStyle(
                    style: Theme.of(context).textTheme.titleLarge!,
                    child: title,
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  tooltip: context.tr('Закрыть', 'Close'),
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded, size: 20),
                ),
              ],
            ),
            if (content != null) ...[
              const SizedBox(height: 20),
              Flexible(
                child: SingleChildScrollView(
                  child: DefaultTextStyle(
                    style: Theme.of(context).textTheme.bodyMedium!,
                    child: content!,
                  ),
                ),
              ),
            ],
            if (actions.isNotEmpty) ...[
              const SizedBox(height: 28),
              OverflowBar(
                alignment: MainAxisAlignment.end,
                spacing: 12,
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
    pageBuilder: (context, animation, secondaryAnimation) => Stack(
      children: [
        if (!MediaQuery.highContrastOf(context))
          Positioned.fill(
            child: IgnorePointer(
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
                child: const SizedBox.expand(),
              ),
            ),
          ),
        builder(context),
      ],
    ),
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
            ListTile(
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
  const PageBody({super.key, required this.children});

  final List<Widget> children;

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
            padding: EdgeInsets.fromLTRB(horizontal, 12, horizontal, 40),
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            children: children,
          ),
        ),
      );
    },
  );
}

class SectionCard extends StatefulWidget {
  const SectionCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(24),
    this.onTap,
  });
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  @override
  State<SectionCard> createState() => _SectionCardState();
}

class _SectionCardState extends State<SectionCard> {
  bool hovered = false;
  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final interactive = widget.onTap != null;
    return MouseRegion(
      onEnter: (_) {
        if (interactive) setState(() => hovered = true);
      },
      onExit: (_) {
        if (interactive) setState(() => hovered = false);
      },
      child: AnimatedContainer(
        duration: MediaQuery.disableAnimationsOf(context)
            ? Duration.zero
            : AppMotion.control,
        curve: AppMotion.enter,
        transform: Matrix4.translationValues(0, hovered ? -2 : 0, 0),
        margin: const EdgeInsets.symmetric(vertical: 6),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: dark ? .10 : .025),
              blurRadius: hovered ? 20 : 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Material(
          color: hovered
              ? Theme.of(context).colorScheme.surfaceContainerHigh
              : Theme.of(context).colorScheme.surface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
            side: BorderSide(
              color: dark ? AppColors.border : const Color(0x102D3554),
            ),
          ),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: widget.onTap,
            child: Padding(padding: widget.padding, child: widget.child),
          ),
        ),
      ),
    );
  }
}

class AppSectionHeader extends StatelessWidget {
  const AppSectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.action,
  });

  final String title;
  final String? subtitle;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: AppSpacing.sm, bottom: AppSpacing.xs),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: Theme.of(context).textTheme.titleLarge),
              if (subtitle != null) ...[
                const SizedBox(height: AppSpacing.xxs),
                Text(subtitle!, style: Theme.of(context).textTheme.bodySmall),
              ],
            ],
          ),
        ),
        if (action != null) action!,
      ],
    ),
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
  Widget build(BuildContext context) => SectionCard(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: .10),
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
          child: Icon(icon, color: AppColors.primaryBright),
        ),
        const SizedBox(height: AppSpacing.md),
        Text(title, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: AppSpacing.xs),
        Text(
          description,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        if (action != null) ...[const SizedBox(height: AppSpacing.md), action!],
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
              const Align(
                alignment: Alignment.centerLeft,
                child: AppSkeleton(width: 140, height: 16),
              ),
              const SizedBox(height: 16),
              const AppSkeleton(height: 36),
              const SizedBox(height: 28),
              const AppSkeleton(height: 140),
              const SizedBox(height: 16),
              const AppSkeleton(height: 72),
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
    if (MediaQuery.disableAnimationsOf(context)) {
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
            borderRadius: BorderRadius.circular(16),
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
      if (snapshot.connectionState != ConnectionState.done) {
        return const AppLoadingState();
      }
      if (snapshot.hasError) {
        return Center(
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
                description: '${snapshot.error}',
                action: FilledButton.icon(
                  onPressed: reload,
                  icon: const Icon(Icons.refresh_rounded, size: 18),
                  label: Text(context.tr('Повторить', 'Try again')),
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
  });

  final bool secondary;
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
    child: FilledButton.icon(
      style: widget.secondary
          ? FilledButton.styleFrom(
              backgroundColor: Theme.of(
                context,
              ).colorScheme.surfaceContainerHighest,
              foregroundColor: Theme.of(context).colorScheme.onSurface,
            )
          : null,
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
        duration: AppMotion.control,
        switchInCurve: AppMotion.enter,
        switchOutCurve: AppMotion.exit,
        child: busy
            ? const SizedBox(
                key: ValueKey('busy'),
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : Icon(
                widget.icon ?? Icons.check_rounded,
                key: const ValueKey('icon'),
              ),
      ),
      label: Text(widget.label),
    ),
  );
}

String dateKey(DateTime date) =>
    '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

/// Shared page hierarchy: introduction, grouped content, then a primary action.
class PageIntro extends StatelessWidget {
  const PageIntro({
    super.key,
    required this.title,
    required this.description,
    this.eyebrow,
  });
  final String title, description;
  final String? eyebrow;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 16, bottom: 28),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (eyebrow != null) ...[
          Text(
            eyebrow!,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
          const SizedBox(height: 10),
        ],
        Text(title, style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 10),
        Text(description, style: Theme.of(context).textTheme.bodyMedium),
      ],
    ),
  );
}

class FormGroup extends StatelessWidget {
  const FormGroup({super.key, required this.title, required this.children});
  final String title;
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 24),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 10),
          child: Text(title, style: Theme.of(context).textTheme.titleMedium),
        ),
        SectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: children,
          ),
        ),
      ],
    ),
  );
}

/// The action stays reachable while the content scrolls, including with a keyboard.
class ActionPage extends StatelessWidget {
  const ActionPage({super.key, required this.children, required this.action});
  final List<Widget> children;
  final Widget action;
  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      if (constraints.maxHeight <
          280 * MediaQuery.textScalerOf(context).scale(14) / 14) {
        return PageBody(
          children: [...children, const SizedBox(height: 20), action],
        );
      }
      return Column(
        children: [
          Expanded(child: PageBody(children: children)),
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 800),
              child: GlassSurface(
                radius: 24,
                opacity: .8,
                blur: 10,
                margin: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                child: SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
                    child: Center(
                      heightFactor: 1,
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 680),
                        child: SizedBox(width: double.infinity, child: action),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      );
    },
  );
}
