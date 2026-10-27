import 'package:flutter/material.dart';

import 'app_colors.dart';

abstract final class AppTypography {
  static TextTheme textTheme(Brightness brightness) {
    final dark = brightness == Brightness.dark;
    final primary = dark ? AppColors.textPrimary : AppColors.lightTextPrimary;
    final secondary = dark
        ? AppColors.textSecondary
        : AppColors.lightTextSecondary;
    return ThemeData(brightness: brightness).textTheme
        .apply(bodyColor: primary, displayColor: primary)
        .copyWith(
          displayLarge: TextStyle(
            color: primary,
            fontSize: 52,
            height: 1.05,
            fontWeight: FontWeight.w600,
            letterSpacing: -1.8,
          ),
          displayMedium: TextStyle(
            color: primary,
            fontSize: 42,
            height: 1.08,
            fontWeight: FontWeight.w600,
            letterSpacing: -1.3,
          ),
          displaySmall: TextStyle(
            color: primary,
            fontSize: 34,
            height: 1.12,
            fontWeight: FontWeight.w600,
            letterSpacing: -1,
          ),
          headlineLarge: TextStyle(
            color: primary,
            fontSize: 32,
            height: 1.12,
            fontWeight: FontWeight.w600,
            letterSpacing: -1.0,
          ),
          headlineMedium: TextStyle(
            color: primary,
            fontSize: 28,
            height: 1.16,
            fontWeight: FontWeight.w600,
            letterSpacing: -.85,
          ),
          headlineSmall: TextStyle(
            color: primary,
            fontSize: 21,
            height: 1.2,
            fontWeight: FontWeight.w600,
            letterSpacing: -.45,
          ),
          titleLarge: TextStyle(
            color: primary,
            fontSize: 18,
            height: 1.25,
            fontWeight: FontWeight.w600,
            letterSpacing: -.25,
          ),
          titleMedium: TextStyle(
            color: primary,
            fontSize: 16,
            height: 1.3,
            fontWeight: FontWeight.w600,
          ),
          titleSmall: TextStyle(
            color: primary,
            fontSize: 14,
            height: 1.3,
            fontWeight: FontWeight.w600,
          ),
          bodyLarge: TextStyle(color: primary, fontSize: 16, height: 1.45),
          bodyMedium: TextStyle(color: secondary, fontSize: 15, height: 1.55),
          bodySmall: TextStyle(color: secondary, fontSize: 13, height: 1.45),
          labelMedium: TextStyle(
            color: primary,
            fontSize: 12,
            height: 1.3,
            fontWeight: FontWeight.w500,
          ),
          labelSmall: TextStyle(
            color: secondary,
            fontSize: 11,
            height: 1.3,
            fontWeight: FontWeight.w500,
          ),
          labelLarge: TextStyle(
            color: primary,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        )
        .apply(
          fontFamily: ThemeData(
            brightness: brightness,
          ).textTheme.bodyMedium?.fontFamily,
        );
  }
}
