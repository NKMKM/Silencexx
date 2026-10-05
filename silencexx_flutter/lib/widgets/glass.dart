import 'dart:ui';

import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_motion.dart';
import '../core/theme/app_radius.dart';

class GlassSurface extends StatelessWidget {
  const GlassSurface({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.radius = AppRadius.lg,
    this.opacity = .36,
    this.blur = 10,
    this.focused = false,
  });

  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double radius;
  final double opacity;
  final double blur;
  final bool focused;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final highContrast = MediaQuery.highContrastOf(context);
    final borderRadius = BorderRadius.circular(radius);
    final tint = dark ? AppColors.surfaceRaised : const Color(0xFFF9FAFF);
    return RepaintBoundary(
      child: Container(
        margin: margin,
        decoration: BoxDecoration(
          borderRadius: borderRadius,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: dark ? .30 : .08),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
            BoxShadow(
              color: AppColors.primary.withValues(alpha: dark ? .08 : .05),
              blurRadius: 24,
              spreadRadius: -8,
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: borderRadius,
          child: BackdropFilter(
            filter: ImageFilter.blur(
              sigmaX: highContrast ? 0 : blur,
              sigmaY: highContrast ? 0 : blur,
            ),
            child: AnimatedContainer(
              duration: MediaQuery.disableAnimationsOf(context)
                  ? Duration.zero
                  : AppMotion.control,
              curve: AppMotion.enter,
              decoration: BoxDecoration(
                color: tint.withValues(
                  alpha: highContrast
                      ? 1
                      : (opacity + (focused ? .06 : 0)).clamp(0, 1),
                ),
                borderRadius: borderRadius,
                border: Border.all(
                  color: focused
                      ? AppColors.primary.withValues(alpha: dark ? .56 : .46)
                      : dark
                      ? Colors.white.withValues(alpha: .13)
                      : const Color(0x55FFFFFF),
                  width: focused ? 1.25 : 1,
                ),
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: dark
                      ? [
                          Colors.white.withValues(alpha: .065),
                          AppColors.primary.withValues(alpha: .035),
                          AppColors.secondary.withValues(alpha: .045),
                        ]
                      : [
                          Colors.white.withValues(alpha: .70),
                          AppColors.primary.withValues(alpha: .025),
                          AppColors.secondary.withValues(alpha: .045),
                        ],
                ),
              ),
              child: Stack(
                fit: StackFit.loose,
                clipBehavior: Clip.hardEdge,
                children: [
                  Padding(padding: padding ?? EdgeInsets.zero, child: child),
                  Positioned.fill(
                    child: IgnorePointer(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            stops: const [0, .12, .68, 1],
                            colors: [
                              Colors.white.withValues(alpha: dark ? .065 : .46),
                              Colors.white.withValues(alpha: dark ? .045 : .12),
                              Colors.transparent,
                              AppColors.primary.withValues(alpha: .055),
                            ],
                          ),
                        ),
                      ),
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

class BreathingIcon extends StatefulWidget {
  const BreathingIcon({super.key, required this.child, this.color});

  final Widget child;
  final Color? color;

  @override
  State<BreathingIcon> createState() => _BreathingIconState();
}

class _BreathingIconState extends State<BreathingIcon>
    with SingleTickerProviderStateMixin {
  late final AnimationController controller = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 4),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      controller.stop();
      controller.value = 0;
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
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: controller,
    builder: (context, child) => Transform.scale(
      scale: 1 + (Curves.easeInOut.transform(controller.value) * .06),
      child: DecoratedBox(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: (widget.color ?? AppColors.primaryBright).withValues(
                alpha: .12 + controller.value * .12,
              ),
              blurRadius: 18 + controller.value * 8,
              spreadRadius: 2,
            ),
          ],
        ),
        child: child,
      ),
    ),
    child: widget.child,
  );
}
