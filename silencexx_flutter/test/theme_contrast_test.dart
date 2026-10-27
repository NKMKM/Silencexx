import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:silencexx/core/theme/app_colors.dart';

void main() {
  double contrast(Color foreground, Color background) {
    final a = foreground.computeLuminance();
    final b = background.computeLuminance();
    return a > b ? (a + .05) / (b + .05) : (b + .05) / (a + .05);
  }

  test('body and hint tokens meet AA on dark content surfaces', () {
    for (final foreground in [
      AppColors.textPrimary,
      AppColors.textSecondary,
      AppColors.textTertiary,
    ]) {
      for (final background in [
        AppColors.background,
        AppColors.backgroundSoft,
        AppColors.surface,
        AppColors.surfaceRaised,
      ]) {
        expect(contrast(foreground, background), greaterThanOrEqualTo(4.5));
      }
    }
  });
  test('primary action text and input boundaries retain contrast', () {
    for (final background in [AppColors.primary, AppColors.primaryPressed]) {
      expect(contrast(Colors.white, background), greaterThanOrEqualTo(4.5));
    }
    expect(
      contrast(AppColors.borderStrong, AppColors.backgroundSoft),
      greaterThanOrEqualTo(3),
    );
    expect(
      contrast(AppColors.lightTextSecondary, AppColors.lightBackground),
      greaterThanOrEqualTo(4.5),
    );
  });
}
