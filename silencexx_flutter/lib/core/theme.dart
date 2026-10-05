import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'theme/app_colors.dart';
import 'theme/app_gradients.dart';
import 'theme/app_motion.dart';
import 'theme/app_radius.dart';
import 'theme/app_spacing.dart';
import 'theme/app_typography.dart';
import '../widgets/design.dart';

ThemeData auroraTheme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final foreground = dark ? AppColors.textPrimary : AppColors.lightTextPrimary;
  final muted = dark ? AppColors.textSecondary : AppColors.lightTextSecondary;
  final surface = dark ? AppColors.surface : AppColors.lightSurface;
  final outline = dark ? AppColors.border : const Color(0x1F303A6B);
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
        surfaceContainerLowest: dark
            ? AppColors.background
            : AppColors.lightBackground,
        surfaceContainerLow: dark
            ? AppColors.backgroundSoft
            : const Color(0xFFF5F4F7),
        surfaceContainer: surface,
        surfaceContainerHigh: dark
            ? AppColors.surfaceRaised
            : const Color(0xFFEEECF2),
        surfaceContainerHighest: dark
            ? AppColors.surfaceHighest
            : const Color(0xFFE8E5ED),
      );

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        TargetPlatform.android: CalmPageTransitions(),
        TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        TargetPlatform.macOS: CalmPageTransitions(),
        TargetPlatform.windows: CalmPageTransitions(),
        TargetPlatform.linux: CalmPageTransitions(),
      },
    ),
    scaffoldBackgroundColor: dark
        ? AppColors.background
        : AppColors.lightBackground,
    canvasColor: dark ? AppColors.background : AppColors.lightBackground,
    dividerColor: dark ? AppColors.divider : const Color(0x14000000),
    textTheme: AppTypography.textTheme(brightness),
    scrollbarTheme: ScrollbarThemeData(
      thickness: const WidgetStatePropertyAll(3),
      radius: const Radius.circular(8),
      thumbColor: WidgetStatePropertyAll(muted.withValues(alpha: .25)),
    ),
    listTileTheme: ListTileThemeData(
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      iconColor: muted,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ),
    tooltipTheme: TooltipThemeData(
      decoration: BoxDecoration(
        color: dark ? AppColors.surfaceHighest : const Color(0xFF29272F),
        borderRadius: BorderRadius.circular(10),
      ),
      textStyle: const TextStyle(color: Colors.white, fontSize: 12),
      waitDuration: const Duration(milliseconds: 500),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    ),
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: ButtonStyle(
        side: WidgetStatePropertyAll(BorderSide(color: outline)),
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
        padding: const WidgetStatePropertyAll(
          EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
        backgroundColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? AppColors.primary.withValues(alpha: .18)
              : surface,
        ),
        foregroundColor: WidgetStatePropertyAll(foreground),
      ),
    ),
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
      fillColor: dark ? AppColors.backgroundSoft : const Color(0xFFF0EEF4),
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
            : const Color(0xFFE7E9F4),
        disabledForegroundColor: muted,
        minimumSize: const Size(48, 50),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.sm,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        textStyle: AppTypography.textTheme(brightness).labelLarge,
        animationDuration: AppMotion.control,
        splashFactory: InkRipple.splashFactory,
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
        animationDuration: AppMotion.control,
        splashFactory: InkRipple.splashFactory,
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
        animationDuration: AppMotion.control,
        splashFactory: InkRipple.splashFactory,
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
        animationDuration: AppMotion.fast,
        splashFactory: InkRipple.splashFactory,
      ),
    ),
    popupMenuTheme: PopupMenuThemeData(
      color: dark ? AppColors.surfaceRaised : surface,
      elevation: dark ? 16 : 8,
      shadowColor: Colors.black.withValues(alpha: dark ? .32 : .12),
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        side: BorderSide(color: outline),
      ),
      menuPadding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
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
      selectionColor: Color(0x667866C6),
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
      Positioned.fill(
        child: IgnorePointer(
          child: Align(
            alignment: const Alignment(.9, -.8),
            child: Container(
              width: 300,
              height: 300,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [Color(0x249B8CFF), Color(0x009B8CFF)],
                ),
              ),
            ),
          ),
        ),
      ),
      child,
    ],
  );
}
