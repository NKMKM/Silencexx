import 'package:flutter/material.dart';

abstract final class AppColors {
  static const background = Color(0xFF101113);
  static const backgroundSoft = Color(0xFF151618);
  static const surface = Color(0xFF1B1C1F);
  static const surfaceRaised = Color(0xFF232427);
  static const surfaceHighest = Color(0xFF303136);

  static const primary = Color(0xFF7866C6);
  static const primaryBright = Color(0xFFC3B7F4);
  static const primaryPressed = Color(0xFF6250AD);
  static const secondary = primaryBright;

  static const textPrimary = Color(0xFFF3F1F5);
  static const textSecondary = Color(0xFFADABB3);
  static const textTertiary = Color(0xFF85838D);
  static const border = Color(0x18FFFFFF);
  static const divider = Color(0x10FFFFFF);

  static const error = Color(0xFFFF5367);
  static const success = Color(0xFF48D59A);
  static const warning = Color(0xFFF1B94A);
  static const info = primaryBright;

  static const lightBackground = Color(0xFFF5F4F7);
  static const lightSurface = Color(0xFFFFFFFF);
  static const lightTextPrimary = Color(0xFF1D2130);
  static const lightTextSecondary = Color(0xFF687087);
}
