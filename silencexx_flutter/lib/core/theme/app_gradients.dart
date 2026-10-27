import 'package:flutter/material.dart';

import 'app_colors.dart';

abstract final class AppGradients {
  static const cosmic = RadialGradient(
    center: Alignment(-.8, -.95),
    radius: 1.35,
    colors: [
      AppColors.ambientPurple,
      AppColors.background,
      AppColors.background,
    ],
    stops: [0, .52, 1],
  );

  static const accent = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.primary, AppColors.primaryPressed],
  );
}
