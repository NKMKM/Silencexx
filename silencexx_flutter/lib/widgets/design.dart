import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../core/app_state.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_motion.dart';
import 'studio.dart';

/// A quiet, code-drawn motif shared by the welcome and breathing experiences.
class QuietOrbit extends StatelessWidget {
  const QuietOrbit({super.key, this.size = 160, this.child});
  final double size;
  final Widget? child;

  @override
  Widget build(BuildContext context) => SizedBox.square(
    dimension: size,
    child: CustomPaint(
      painter: _OrbitPainter(Theme.of(context).colorScheme.primary),
      child: Center(child: child),
    ),
  );
}

class _OrbitPainter extends CustomPainter {
  _OrbitPainter(this.color);
  final Color color;
  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = size.shortestSide / 2;
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..shader = RadialGradient(
          colors: [color.withValues(alpha: .22), color.withValues(alpha: 0)],
        ).createShader(Offset.zero & size),
    );
    // Three open, cloud-like ribbons form the product's quiet signature.
    for (var i = 0; i < 3; i++) {
      canvas.save();
      canvas.translate(center.dx, center.dy);
      canvas.rotate(-math.pi / 12 + i * .48);
      final r = radius * (.58 + i * .12);
      final ribbon = Path()
        ..moveTo(-r, r * .12)
        ..cubicTo(-r * 1.1, -r * .55, -r * .3, -r * .9, r * .16, -r * .54)
        ..cubicTo(r * .72, -r * 1.05, r * 1.36, -r * .2, r * .75, r * .28)
        ..cubicTo(r * .18, r * .9, -r * .65, r * .85, -r, r * .12);
      canvas.drawPath(
        ribbon,
        Paint()
          ..color = color.withValues(alpha: .6 - i * .13)
          ..style = PaintingStyle.stroke
          ..strokeWidth = i == 0 ? 1.6 : 1,
      );
      canvas.restore();
    }
    canvas.drawCircle(
      center + Offset(radius * .64, -radius * .28),
      3,
      Paint()..color = AppColors.primaryBright,
    );
  }

  @override
  bool shouldRepaint(_OrbitPainter oldDelegate) => oldDelegate.color != color;
}

class AppBadge extends StatelessWidget {
  const AppBadge({super.key, required this.label, this.icon});
  final String label;
  final IconData? icon;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.primary.withValues(alpha: .10),
      borderRadius: BorderRadius.circular(99),
      border: Border.all(
        color: Theme.of(context).colorScheme.primary.withValues(alpha: .16),
      ),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) ...[Icon(icon, size: 14), const SizedBox(width: 6)],
        Flexible(
          child: Text(label, style: Theme.of(context).textTheme.labelMedium),
        ),
      ],
    ),
  );
}

/// Finite entry motion avoids constantly animating otherwise static pages.
class PageReveal extends StatelessWidget {
  const PageReveal({super.key, required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
    tween: Tween(begin: 0, end: 1),
    duration: MediaQuery.disableAnimationsOf(context)
        ? Duration.zero
        : AppMotion.screen,
    curve: AppMotion.enter,
    builder: (context, value, child) => Opacity(
      opacity: value,
      child: Transform.translate(
        offset: Offset(0, 12 * (1 - value)),
        child: child,
      ),
    ),
    child: child,
  );
}

class AuthFrame extends StatelessWidget {
  const AuthFrame({super.key, required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      if (constraints.maxWidth < 1000) return child;
      return Row(
        children: [
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(28, 24, 0, 24),
              child: StudioPanel(
                tone: StudioTone.accent,
                padding: const EdgeInsets.all(32),
                radius: 32,
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'CLOUDMIND / STUDIO',
                        style: Theme.of(
                          context,
                        ).textTheme.labelSmall?.copyWith(letterSpacing: 1.5),
                      ),
                      const SizedBox(height: 34),
                      const LivingEmblem(size: 156),
                      const SizedBox(height: 24),
                      Text(
                        context.tr(
                          'Чуть тише.\nЧуть ближе к себе.',
                          'Less noise.\nMore room for you.',
                        ),
                        style: Theme.of(context).textTheme.headlineLarge,
                      ),
                      const SizedBox(height: 24),
                      for (final item in [
                        (
                          Icons.forum_outlined,
                          context.tr(
                            'Разговор, в котором можно быть собой',
                            'A conversation where you can be yourself',
                          ),
                        ),
                        (
                          Icons.auto_stories_outlined,
                          context.tr(
                            'Дневник для важных мыслей',
                            'A journal for what matters',
                          ),
                        ),
                        (
                          Icons.spa_outlined,
                          context.tr(
                            'Маленькие шаги в своём темпе',
                            'Small steps at your own pace',
                          ),
                        ),
                      ])
                        StudioRow(
                          leading: Icon(item.$1, size: 18),
                          title: Text(item.$2),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          Expanded(child: child),
        ],
      );
    },
  );
}

class CalmPageTransitions extends PageTransitionsBuilder {
  const CalmPageTransitions();
  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    if (MediaQuery.disableAnimationsOf(context)) return child;
    final enter = animation.drive(CurveTween(curve: AppMotion.enter));
    final leave = secondaryAnimation.drive(CurveTween(curve: AppMotion.enter));
    return SlideTransition(
      position: Tween(
        begin: Offset.zero,
        end: const Offset(-.045, 0),
      ).animate(leave),
      child: FadeTransition(
        opacity: enter,
        child: SlideTransition(
          position: Tween(
            begin: const Offset(.065, 0),
            end: Offset.zero,
          ).animate(enter),
          child: child,
        ),
      ),
    );
  }
}

/// Finite, staggered entrance; stays still when reduced motion is enabled.
class StagedEntry extends StatelessWidget {
  const StagedEntry({super.key, required this.child, this.order = 0});
  final Widget child;
  final int order;
  @override
  Widget build(BuildContext context) {
    if (MediaQuery.disableAnimationsOf(context)) return child;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: 320 + order * 50),
      curve: Curves.easeOutCubic,
      child: child,
      builder: (context, value, child) => Opacity(
        opacity: value,
        child: Transform.translate(
          offset: Offset(0, 22 * (1 - value)),
          child: child,
        ),
      ),
    );
  }
}

class LivingEmblem extends StatelessWidget {
  const LivingEmblem({
    super.key,
    this.size = 88,
    this.icon = Icons.auto_awesome_rounded,
  });
  final double size;
  final IconData icon;
  @override
  Widget build(BuildContext context) => StagedEntry(
    child: TweenAnimationBuilder<double>(
      tween: Tween(
        begin: MediaQuery.disableAnimationsOf(context) ? 1 : 0,
        end: 1,
      ),
      duration: MediaQuery.disableAnimationsOf(context)
          ? Duration.zero
          : const Duration(milliseconds: 700),
      curve: Curves.easeOutCubic,
      builder: (context, value, child) => Transform.rotate(
        angle: (1 - value) * -.6,
        child: Transform.scale(scale: .8 + .2 * value, child: child),
      ),
      child: QuietOrbit(
        size: size,
        child: Container(
          width: size * .46,
          height: size * .46,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Theme.of(context).colorScheme.primary.withValues(alpha: .7),
                Theme.of(context).colorScheme.primary.withValues(alpha: .12),
              ],
            ),
            border: Border.all(
              color: Theme.of(
                context,
              ).colorScheme.primary.withValues(alpha: .5),
            ),
          ),
          child: Icon(
            icon,
            size: size * .23,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
      ),
    ),
  );
}
