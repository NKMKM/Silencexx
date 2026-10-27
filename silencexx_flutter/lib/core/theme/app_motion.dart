import 'package:flutter/animation.dart';

abstract final class AppMotion {
  static const press = Duration(milliseconds: 120);
  static const fast = Duration(milliseconds: 180);
  static const control = Duration(milliseconds: 240);
  static const screen = Duration(milliseconds: 300);
  static const overlay = Duration(milliseconds: 300);
  static const menu = Duration(milliseconds: 220);

  static const enter = Curves.easeOutCubic;
  static const exit = Curves.easeInCubic;
  static const spring = Curves.easeOutCubic;
}
