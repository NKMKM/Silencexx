import 'dart:ui';

import 'package:flutter/material.dart';

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
    this.blur = 0,
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
    final colors = Theme.of(context).colorScheme;
    final highContrast = MediaQuery.highContrastOf(context);
    final borderRadius = BorderRadius.circular(radius);
    final panel = AnimatedContainer(
      duration: MediaQuery.disableAnimationsOf(context)
          ? Duration.zero
          : AppMotion.control,
      curve: AppMotion.enter,
      padding: padding,
      decoration: BoxDecoration(
        color: focused
            ? Color.alphaBlend(
                colors.primary.withValues(alpha: .035),
                colors.surface,
              )
            : colors.surface,
        borderRadius: borderRadius,
        border: Border.all(
          color: focused
              ? colors.primary
              : highContrast
              ? colors.outline
              : colors.outlineVariant,
          width: focused || highContrast ? 1.5 : 1,
        ),
      ),
      child: child,
    );
    // Ordinary panels use tonal layers. Blur is opt-in, clipped and bounded.
    return Container(
      margin: margin,
      decoration: BoxDecoration(
        borderRadius: borderRadius,
        boxShadow: focused
            ? [
                BoxShadow(
                  color: colors.primary.withValues(alpha: .08),
                  blurRadius: 16,
                ),
              ]
            : null,
      ),
      child: blur > 0 && !highContrast
          ? ClipRRect(
              borderRadius: borderRadius,
              child: BackdropFilter(
                filter: ImageFilter.blur(
                  sigmaX: blur.clamp(0, 6),
                  sigmaY: blur.clamp(0, 6),
                ),
                child: panel,
              ),
            )
          : panel,
    );
  }
}
