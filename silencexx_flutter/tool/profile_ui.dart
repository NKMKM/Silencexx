// Run: flutter run --profile -t tool/profile_ui.dart -d <device>
// Uses the real application and services. No test fixtures or account mutations.
import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';
import 'package:silencexx/main.dart' as app;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (!kProfileMode) {
    throw StateError('Use --profile for meaningful frame measurements.');
  }
  final samples = <FrameTiming>[];
  void collect(List<FrameTiming> frames) {
    samples.addAll(frames.take(4000 - samples.length));
  }

  SchedulerBinding.instance.addTimingsCallback(collect);
  Timer(const Duration(seconds: 90), () {
    SchedulerBinding.instance.removeTimingsCallback(collect);
    double percentile(List<double> values, double quantile) {
      if (values.isEmpty) return 0;
      values.sort();
      return values[((values.length - 1) * quantile).round()];
    }

    final build = samples
        .map((f) => f.buildDuration.inMicroseconds / 1000)
        .toList();
    final raster = samples
        .map((f) => f.rasterDuration.inMicroseconds / 1000)
        .toList();
    debugPrint(
      'UI_PROFILE ${jsonEncode({'windowSeconds': 90, 'frames': samples.length, 'buildP95Ms': percentile(build, .95), 'rasterP95Ms': percentile(raster, .95), 'buildOver16ms': build.where((v) => v > 16.667).length, 'rasterOver16ms': raster.where((v) => v > 16.667).length, 'buildOver8ms': build.where((v) => v > 8.333).length, 'rasterOver8ms': raster.where((v) => v > 8.333).length})}',
    );
  });
  await app.main();
}
