import 'package:flutter/material.dart';

import 'app_colors.dart';

abstract final class AppGradients {
  static const cosmic = RadialGradient(
    center: Alignment(-.8, -.95),
    radius: 1.35,
    colors: [Color(0xFF171A36), AppColors.background, Color(0xFF090B15)],
    stops: [0, .52, 1],
  );

  static const accent = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.primaryBright, AppColors.primary, AppColors.secondary],
  );

  static const card = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.surfaceRaised, AppColors.surface],
  );

  static const hero = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF272C59), Color(0xFF202442), Color(0xFF171B31)],
  );
}
