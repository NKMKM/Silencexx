import 'package:flutter/material.dart';

import 'app_colors.dart';

abstract final class AppGradients {
  static const cosmic = RadialGradient(
    center: Alignment(-.8, -.95),
    radius: 1.35,
    colors: [Color(0xFF201D29), AppColors.background, Color(0xFF101113)],
    stops: [0, .52, 1],
  );

  static const accent = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      AppColors.primaryBright,
      AppColors.primary,
      AppColors.primaryPressed,
    ],
  );

  static const card = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.surfaceRaised, AppColors.surface],
  );

  static const hero = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF302B3E), Color(0xFF24232B), Color(0xFF1E1F23)],
  );
}
