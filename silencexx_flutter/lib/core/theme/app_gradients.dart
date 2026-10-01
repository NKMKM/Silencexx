import 'package:flutter/material.dart';

import 'app_colors.dart';

abstract final class AppGradients {
  static const cosmic = RadialGradient(
    center: Alignment(-.86, -.94),
    radius: 1.45,
    colors: [Color(0xFF1C1018), AppColors.background, Color(0xFF09080A)],
    stops: [0, .48, 1],
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
    colors: [Color(0xFF21151E), Color(0xFF151116), Color(0xFF100E12)],
  );
}
