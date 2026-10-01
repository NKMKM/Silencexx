import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'theme/app_colors.dart';
import 'theme/app_gradients.dart';
import 'theme/app_radius.dart';
import 'theme/app_spacing.dart';
import 'theme/app_typography.dart';

ThemeData auroraTheme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final foreground = dark ? AppColors.textPrimary : AppColors.lightTextPrimary;
  final muted = dark ? AppColors.textSecondary : AppColors.lightTextSecondary;
  final surface = dark ? AppColors.surface : AppColors.lightSurface;
  final outline = dark ? AppColors.border : const Color(0x1F39253A);
  final scheme =
      ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        brightness: brightness,
        surface: surface,
      ).copyWith(
        primary: AppColors.primary,
        onPrimary: Colors.white,
        secondary: AppColors.secondary,
        onSecondary: Colors.white,
        error: AppColors.error,
        onError: Colors.white,
        onSurface: foreground,
      );

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    scaffoldBackgroundColor: dark
        ? Colors.transparent
        : AppColors.lightBackground,
    canvasColor: dark ? AppColors.background : AppColors.lightBackground,
    dividerColor: dark ? AppColors.divider : const Color(0x14000000),
    textTheme: AppTypography.textTheme(brightness),
    appBarTheme: AppBarTheme(
      backgroundColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: AppTypography.textTheme(brightness).titleLarge,
      iconTheme: IconThemeData(color: muted),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: dark ? AppColors.surfaceRaised : const Color(0xFFF2EEF3),
      hintStyle: TextStyle(color: dark ? AppColors.textTertiary : muted),
      labelStyle: TextStyle(color: muted),
      prefixIconColor: muted,
      suffixIconColor: muted,
      constraints: const BoxConstraints(minHeight: 52),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        borderSide: BorderSide(color: outline),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        borderSide: BorderSide(color: outline),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        borderSide: const BorderSide(color: AppColors.primary, width: 1.25),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        borderSide: const BorderSide(color: AppColors.error),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        borderSide: const BorderSide(color: AppColors.error, width: 1.25),
      ),
    ),
    cardTheme: CardThemeData(
      color: dark ? AppColors.surface.withValues(alpha: .94) : surface,
      surfaceTintColor: Colors.transparent,
      shadowColor: Colors.transparent,
      elevation: 0,
      margin: const EdgeInsets.symmetric(vertical: AppSpacing.xxs),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        side: BorderSide(color: outline),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        disabledBackgroundColor: dark
            ? AppColors.surfaceHighest
            : const Color(0xFFE9E3EA),
        disabledForegroundColor: muted,
        minimumSize: const Size(48, 50),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.sm,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: foreground,
        minimumSize: const Size(48, 48),
        side: BorderSide(color: outline),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: dark
            ? AppColors.primaryBright
            : AppColors.primaryPressed,
        minimumSize: const Size(44, 44),
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.sm),
        ),
      ),
    ),
    iconButtonTheme: IconButtonThemeData(
      style: IconButton.styleFrom(
        foregroundColor: muted,
        minimumSize: const Size(44, 44),
        tapTargetSize: MaterialTapTargetSize.padded,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: dark
          ? AppColors.surface.withValues(alpha: .96)
          : surface,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      height: 68,
      indicatorColor: AppColors.primary.withValues(alpha: dark ? .14 : .10),
      indicatorShape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      iconTheme: WidgetStateProperty.resolveWith(
        (states) => IconThemeData(
          color: states.contains(WidgetState.selected)
              ? AppColors.primaryBright
              : muted,
          size: 22,
        ),
      ),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => TextStyle(
          color: states.contains(WidgetState.selected) ? foreground : muted,
          fontSize: 11,
          fontWeight: states.contains(WidgetState.selected)
              ? FontWeight.w600
              : FontWeight.w500,
        ),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: dark ? AppColors.surfaceRaised : surface,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.xl),
        side: BorderSide(color: outline),
      ),
      titleTextStyle: AppTypography.textTheme(brightness).titleLarge,
      contentTextStyle: AppTypography.textTheme(brightness).bodyMedium,
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: dark ? AppColors.surface : surface,
      surfaceTintColor: Colors.transparent,
      modalBackgroundColor: dark ? AppColors.surface : surface,
      showDragHandle: true,
      dragHandleColor: muted.withValues(alpha: .45),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: dark
          ? AppColors.surfaceHighest
          : const Color(0xFF29242B),
      contentTextStyle: const TextStyle(color: AppColors.textPrimary),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
    ),
    dividerTheme: DividerThemeData(
      color: dark ? AppColors.divider : const Color(0x14000000),
      thickness: 1,
      space: AppSpacing.md,
    ),
    checkboxTheme: CheckboxThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
      side: BorderSide(color: muted.withValues(alpha: .6)),
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith(
        (states) =>
            states.contains(WidgetState.selected) ? Colors.white : muted,
      ),
      trackColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected)
            ? AppColors.primary.withValues(alpha: .75)
            : AppColors.surfaceHighest,
      ),
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: AppColors.primary,
      linearTrackColor: AppColors.surfaceHighest,
      circularTrackColor: AppColors.surfaceHighest,
    ),
    textSelectionTheme: const TextSelectionThemeData(
      cursorColor: AppColors.primaryBright,
      selectionColor: Color(0x665A2341),
      selectionHandleColor: AppColors.primary,
    ),
  );
}

class CosmicBackdrop extends StatelessWidget {
  const CosmicBackdrop({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Stack(
    fit: StackFit.expand,
    children: [
      const DecoratedBox(
        decoration: BoxDecoration(gradient: AppGradients.cosmic),
      ),
      const Positioned.fill(child: CustomPaint(painter: _StarPainter())),
      child,
    ],
  );
}

class _StarPainter extends CustomPainter {
  const _StarPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.fill;
    final random = math.Random(42);
    for (var i = 0; i < 38; i++) {
      final x = random.nextDouble() * size.width;
      final y = random.nextDouble() * size.height;
      paint.color = Colors.white.withValues(alpha: i % 9 == 0 ? .18 : .075);
      canvas.drawCircle(Offset(x, y), i % 9 == 0 ? .85 : .5, paint);
    }
    final glowPaint = Paint()
      ..shader =
          const RadialGradient(
            colors: [Color(0x129B78FF), Color(0x009B78FF)],
          ).createShader(
            Rect.fromCircle(
              center: Offset(size.width * .94, size.height * .12),
              radius: math.max(size.width, size.height) * .42,
            ),
          );
    canvas.drawRect(Offset.zero & size, glowPaint);
  }

  @override
  bool shouldRepaint(covariant _StarPainter oldDelegate) => false;
}
