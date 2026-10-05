import 'package:flutter/animation.dart';

abstract final class AppMotion {
  static const press = Duration(milliseconds: 130);
  static const fast = Duration(milliseconds: 160);
  static const control = Duration(milliseconds: 250);
  static const screen = Duration(milliseconds: 350);
  static const overlay = Duration(milliseconds: 300);
  static const menu = Duration(milliseconds: 220);

  static const enter = Curves.easeOutCubic;
  static const exit = Curves.easeInCubic;
  static const spring = Curves.easeOutBack;
}
