import 'dart:math' as math;
import 'dart:ui' as ui;
import 'dart:ui' show lerpDouble;
import 'package:flutter/material.dart';

enum CloudEmotion { neutral, calm, happy, sad, anxious, frustrated }

enum CloudActivity { idle, listening, thinking, speaking, error }

CloudEmotion cloudEmotionFrom(Object? value) => CloudEmotion.values.firstWhere(
  (item) => item.name == value,
  orElse: () => CloudEmotion.neutral,
);

/// One shaded volumetric character, independent of layout rebuilds. Stops when offscreen,
/// backgrounded, or reduced motion is requested.
class CloudCompanion extends StatefulWidget {
  const CloudCompanion({
    super.key,
    this.emotion = CloudEmotion.neutral,
    this.activity = CloudActivity.idle,
    this.level = 0,
    this.size = 240,
  });
  final CloudEmotion emotion;
  final CloudActivity activity;
  final double level, size;
  @override
  State<CloudCompanion> createState() => _CloudCompanionState();
}

class _CloudCompanionState extends State<CloudCompanion>
    with TickerProviderStateMixin, WidgetsBindingObserver {
  late final life = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 5),
  );
  late final expression = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 320),
    value: 1,
  );
  CloudEmotion previous = CloudEmotion.neutral;
  bool foreground = true;
  bool get motionAllowed =>
      foreground &&
      TickerMode.valuesOf(context).enabled &&
      !MediaQuery.disableAnimationsOf(context);
  void syncMotion() {
    final enabled = motionAllowed;
    if (enabled && !life.isAnimating) life.repeat();
    if (!enabled) {
      life.stop();
      expression.stop();
      expression.value = 1;
    }
  }

  @override
  void initState() {
    super.initState();
    previous = widget.emotion;
    foreground =
        WidgetsBinding.instance.lifecycleState == null ||
        WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed;
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    syncMotion();
  }

  @override
  void didUpdateWidget(CloudCompanion oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.emotion != widget.emotion) {
      previous = oldWidget.emotion;
      if (motionAllowed) {
        expression.forward(from: 0);
      } else {
        expression.value = 1;
      }
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    foreground = state == AppLifecycleState.resumed;
    syncMotion();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    life.dispose();
    expression.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Semantics(
    image: true,
    label: 'CloudMind: ${widget.activity.name}, ${widget.emotion.name}',
    child: RepaintBoundary(
      child: SizedBox.square(
        dimension: widget.size,
        child: CustomPaint(
          painter: _CloudPainter(
            life: life,
            expression: expression,
            previous: previous,
            emotion: widget.emotion,
            activity: widget.activity,
            level: widget.level.clamp(0, 1),
            dark: Theme.of(context).brightness == Brightness.dark,
            reduced: MediaQuery.disableAnimationsOf(context),
          ),
        ),
      ),
    ),
  );
}

class _CloudPainter extends CustomPainter {
  _CloudPainter({
    required this.life,
    required this.expression,
    required this.previous,
    required this.emotion,
    required this.activity,
    required this.level,
    required this.dark,
    required this.reduced,
  }) : super(repaint: Listenable.merge([life, expression]));
  final Animation<double> life, expression;
  final CloudEmotion previous, emotion;
  final CloudActivity activity;
  final double level;
  final bool dark, reduced;
  (double, double, double) eyes(CloudEmotion e) => switch (e) {
    CloudEmotion.calm => (.042, .013, 0),
    CloudEmotion.happy => (.036, .014, 0),
    CloudEmotion.sad => (.025, .054, -.30),
    CloudEmotion.anxious => (.032, .075, .08),
    CloudEmotion.frustrated => (.045, .018, .30),
    _ => (.033, .105, 0),
  };
  double glanceDirection(double t) => math.sin(t * math.pi * 2 - .3);

  @override
  void paint(Canvas canvas, Size size) {
    final unit = math.min(size.width, size.height);
    final t = reduced ? 0.0 : life.value;
    final wave = math.sin(t * math.pi * 2);
    final active = activity == CloudActivity.listening
        ? level
        : activity == CloudActivity.speaking
        ? .35 + .2 * math.sin(t * math.pi * 16)
        : 0.0;
    final drift = switch (emotion) {
      CloudEmotion.happy => math.sin(t * math.pi * 4) * .023,
      CloudEmotion.calm => wave * .008,
      CloudEmotion.sad => .012 + wave * .006,
      CloudEmotion.anxious => wave * .010,
      CloudEmotion.frustrated => wave * .005,
      _ => wave * .015,
    };
    final breath = reduced
        ? 0.0
        : (emotion == CloudEmotion.calm || emotion == CloudEmotion.frustrated)
        ? wave * .009
        : wave * .006;
    canvas.save();
    canvas.translate(size.width / 2, size.height / 2 + drift * unit);
    if (emotion == CloudEmotion.happy && !reduced) canvas.rotate(wave * .025);
    if (!reduced) canvas.rotate(glanceDirection(t) * .014);
    canvas.scale(
      unit * (1 + active * .045 + breath),
      unit * (1 - active * .015 + breath),
    );
    canvas.translate(-.5, -.5);
    final colors = switch (emotion) {
      CloudEmotion.calm => [const Color(0xff80d9e5), const Color(0xff9e8ef2)],
      CloudEmotion.happy => [const Color(0xffd6b7ff), const Color(0xffa58df9)],
      CloudEmotion.sad => [const Color(0xff87a8df), const Color(0xffa699e8)],
      CloudEmotion.anxious => [
        const Color(0xffa1b4f2),
        const Color(0xffa78be0),
      ],
      CloudEmotion.frustrated => [
        const Color(0xffc998e0),
        const Color(0xffa08df0),
      ],
      _ => [const Color(0xffb7c7ff), const Color(0xffaf80f4)],
    };
    canvas.drawOval(
      const Rect.fromLTWH(.04, .13, .96, .70),
      Paint()
        ..shader = RadialGradient(
          colors: [
            colors.last.withValues(alpha: dark ? .055 : .035),
            Colors.transparent,
          ],
        ).createShader(const Rect.fromLTWH(.04, .13, .96, .70)),
    );
    // Geometry and lighting are cached: animation only moves the finished mesh.
    canvas.drawVertices(_CloudVolume.mesh(dark), BlendMode.srcOver, Paint());
    final before = eyes(previous), after = eyes(emotion);
    final w = lerpDouble(before.$1, after.$1, expression.value)!;
    final h = lerpDouble(before.$2, after.$2, expression.value)!;
    final tilt = lerpDouble(before.$3, after.$3, expression.value)!;
    double glanceBeat(double start, double hold, double end) {
      double ease(double x) => x * x * (3 - 2 * x);
      const travel = .055;
      if (t < start || t >= end) return 0;
      if (t < start + travel) return ease((t - start) / travel);
      if (t <= hold) return 1;
      return 1 - ease((t - hold) / (end - hold));
    }

    final glance = reduced
        ? 0.0
        : switch (activity) {
            CloudActivity.listening => wave * .006,
            CloudActivity.speaking => wave * .009,
            _ =>
              -.038 * glanceBeat(.12, .29, .37) +
                  .038 * glanceBeat(.55, .73, .81),
          };
    final blink = reduced || t <= .84 || t >= .885
        ? 1.0
        : 1 - math.sin((t - .84) / .045 * math.pi) * .92;
    final eyePaint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [Color(0xffe0e6ff), Color(0xff8b98bf)],
      ).createShader(const Rect.fromLTWH(-.025, -.055, .05, .11));
    for (final side in [-1, 1]) {
      canvas.save();
      canvas.translate(.5 + side * .07 + glance, .49 + glance.abs() * .10);
      canvas.scale(1 - (side * glance).abs() * 1.1, 1);
      canvas.rotate(tilt * side);
      if (emotion == CloudEmotion.happy && expression.value > .7) {
        final arc = Path()
          ..moveTo(-w, .014)
          ..quadraticBezierTo(0, -.025, w, .014);
        canvas.drawPath(
          arc,
          Paint()
            ..color = const Color(0xffc5cfee)
            ..style = PaintingStyle.stroke
            ..strokeWidth = .015
            ..strokeCap = StrokeCap.round,
        );
      } else {
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromCenter(
              center: Offset.zero,
              width: w * 1.2,
              height: math.max(.009, h * blink),
            ),
            Radius.circular(w),
          ),
          eyePaint,
        );
      }
      canvas.restore();
    }
    if (activity == CloudActivity.thinking) {
      for (var i = 0; i < 3; i++) {
        canvas.drawCircle(
          Offset(.44 + i * .07, .85),
          .009,
          Paint()
            ..color = colors.first.withValues(
              alpha: reduced
                  ? 0.6
                  : .35 + .45 * (.5 + .5 * math.sin(t * math.pi * 6 - i)),
            ),
        );
      }
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(_CloudPainter old) =>
      old.emotion != emotion ||
      old.previous != previous ||
      old.activity != activity ||
      old.level != level ||
      old.dark != dark ||
      old.reduced != reduced;
}

/// Front hemisphere of a softly lobed cloud. Vertex normals are derived from
/// the actual surface, so highlights follow its volume rather than a flat fill.
abstract final class _CloudVolume {
  static final Map<bool, ui.Vertices> _cache = {};
  static ui.Vertices mesh(bool dark) => _cache.putIfAbsent(dark, () {
    const rings = 72, segments = 144;
    final positions = <Offset>[];
    final colors = <Color>[];
    final indices = <int>[];
    List<double> point(double r, double angle) {
      final upper = math.max(0.0, -math.sin(angle));
      final lobe = 1 - .105 * math.cos(6 * angle) * upper;
      return [
        .5 + .365 * r * math.cos(angle) * lobe,
        .5 + .265 * r * math.sin(angle) * lobe,
        .29 * math.sqrt(math.max(0, 1 - r * r)),
      ];
    }

    for (var ring = 0; ring <= rings; ring++) {
      // Cosine spacing resolves the silhouette and avoids a faceted rim.
      final r = math.sin((ring / rings) * math.pi / 2);
      for (var segment = 0; segment <= segments; segment++) {
        final angle = segment / segments * math.pi * 2;
        final p = point(r, angle);
        final pr = point(math.min(.999999, r + .00001), angle);
        final pa = point(math.max(.00001, r), angle + .00001);
        final u = List.generate(3, (i) => pr[i] - p[i]);
        final v = List.generate(3, (i) => pa[i] - p[i]);
        var nx = u[1] * v[2] - u[2] * v[1];
        var ny = u[2] * v[0] - u[0] * v[2];
        var nz = u[0] * v[1] - u[1] * v[0];
        final length = math.sqrt(nx * nx + ny * ny + nz * nz);
        if (length < 1e-18 || ring == 0) {
          nx = 0;
          ny = 0;
          nz = 1;
        } else {
          nx /= length;
          ny /= length;
          nz /= length;
          if (nz < 0) {
            nx = -nx;
            ny = -ny;
            nz = -nz;
          }
        }
        double dot(double x, double y, double z) =>
            math.max(0, nx * x + ny * y + nz * z);
        final diffuse = dot(-.48, -.64, .60);
        // A dark glass core with a broad, translucent-looking Fresnel shell.
        // No white specular hotspot: the reference is lit around its edges.
        final band = math.exp(-math.pow((r - .94) / .064, 2));
        final edge = math.pow(r, 9).toDouble();
        final topLight = .48 + .52 * dot(-.45, -.70, .55);
        final purple = math.max(0.0, math.cos(angle - .8));
        final blue = math.max(0.0, -math.cos(angle + .5));
        final haze = math.exp(-math.pow((r - .75) / .20, 2));
        int channel(double base, double tint, double shell) =>
            (base +
                    diffuse * 7 +
                    haze * tint +
                    band * shell * topLight +
                    edge * shell * .18)
                .round()
                .clamp(0, 255);
        positions.add(Offset(p[0], p[1]));
        colors.add(
          Color.fromARGB(
            255,
            channel(12, 14 + purple * 13, 104 + purple * 12),
            channel(15, 8 + blue * 9, 111 + blue * 15),
            channel(25, 20 + purple * 14, 160 + blue * 12),
          ),
        );
        if (ring < rings && segment < segments) {
          final a = ring * (segments + 1) + segment;
          final b = a + segments + 1;
          indices.addAll([a, b, a + 1, a + 1, b, b + 1]);
        }
      }
    }
    return ui.Vertices(
      ui.VertexMode.triangles,
      positions,
      colors: colors,
      indices: indices,
    );
  });
}
