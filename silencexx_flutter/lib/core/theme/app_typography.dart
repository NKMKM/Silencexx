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
          headlineLarge: TextStyle(
            color: primary,
            fontSize: 36,
            height: 1.12,
            fontWeight: FontWeight.w600,
            letterSpacing: -1.15,
          ),
          headlineMedium: TextStyle(
            color: primary,
            fontSize: 30,
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
