import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../core/app_state.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_motion.dart';
import 'glass.dart';

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
    for (var i = 0; i < 4; i++) {
      canvas.save();
      canvas.translate(center.dx, center.dy);
      canvas.rotate(-math.pi / 5 + i * .28);
      canvas.drawOval(
        Rect.fromCenter(
          center: Offset.zero,
          width: radius * (1.1 + i * .19),
          height: radius * (.52 + i * .21),
        ),
        Paint()
          ..color = color.withValues(alpha: .48 - i * .085)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1,
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
      final wide = constraints.maxWidth >= 1000;
      return Row(
        children: [
          if (wide)
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(40),
                child: GlassSurface(
                  opacity: .40,
                  blur: 0,
                  radius: 32,
                  child: Center(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(48),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const QuietOrbit(size: 260),
                          const SizedBox(height: 40),
                          Text(
                            context.tr(
                              'Чуть тише.\nЧуть ближе к себе.',
                              'Less noise.\nMore room for you.',
                            ),
                            style: Theme.of(
                              context,
                            ).textTheme.headlineLarge?.copyWith(fontSize: 44),
                          ),
                          const SizedBox(height: 20),
                          Text(
                            context.tr(
                              'Разговоры, мысли и маленькие шаги.\nВ вашем собственном ритме.',
                              'Conversations, reflections and small steps.\nAt your own pace.',
                            ),
                            style: Theme.of(context).textTheme.bodyLarge,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          Expanded(child: Center(child: child)),
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
