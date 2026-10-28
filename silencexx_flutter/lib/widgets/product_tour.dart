import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../core/app_state.dart';
import 'cloud_companion.dart';
import 'studio.dart';

class CoachStep {
  const CoachStep({
    required this.target,
    required this.title,
    required this.description,
    required this.prepare,
  });
  final GlobalKey target;
  final String title, description;
  final VoidCallback prepare;
}

/// A tour of real controls. No permission dialogs, microphone or API mutations
/// are triggered by the tour. Every step and skip is keyboard accessible.
class ProductTour extends StatefulWidget {
  const ProductTour({super.key, required this.steps, required this.onFinished});
  final List<CoachStep> steps;
  final Future<void> Function() onFinished;
  @override
  State<ProductTour> createState() => _ProductTourState();
}

class _ProductTourState extends State<ProductTour> {
  int step = 0, generation = 0;
  Rect? target;
  bool saving = false;
  final nextFocus = FocusNode();
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) prepare();
    });
  }

  void prepare() {
    final revision = ++generation;
    widget.steps[step].prepare();
    target = null;
    bool scrolled = false;
    void measure(int attempt) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted || generation != revision) return;
        final anchorContext = widget.steps[step].target.currentContext;
        if (!scrolled && anchorContext != null) {
          scrolled = true;
          Scrollable.ensureVisible(
            anchorContext,
            duration: studioDuration(context),
            alignment: .4,
          ).then((_) {
            if (mounted && generation == revision) measure(attempt);
          });
          return;
        }
        final box = anchorContext?.findRenderObject();
        final overlay = context.findRenderObject();
        if (box is RenderBox &&
            box.hasSize &&
            overlay is RenderBox &&
            overlay.hasSize) {
          final rect =
              overlay.globalToLocal(box.localToGlobal(Offset.zero)) & box.size;
          setState(() => target = rect.inflate(7));
          nextFocus.requestFocus();
        } else if (attempt < 20) {
          Future<void>.delayed(
            const Duration(milliseconds: 50),
            () =>
                mounted && generation == revision ? measure(attempt + 1) : null,
          );
        }
      });
      WidgetsBinding.instance.scheduleFrame();
    }

    measure(0);
  }

  void move(int delta) {
    setState(() => step = (step + delta).clamp(0, widget.steps.length - 1));
    prepare();
  }

  Future<void> finish() async {
    if (saving) return;
    setState(() => saving = true);
    try {
      await widget.onFinished();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              context.tr(
                'Не удалось сохранить. Попробуйте ещё раз.',
                'Could not save. Please try again.',
              ),
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (target != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) prepare();
      });
    }
  }

  @override
  void dispose() {
    generation++;
    nextFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => BlockSemantics(
    child: Material(
      color: Colors.transparent,
      child: CallbackShortcuts(
        bindings: {const SingleActivator(LogicalKeyboardKey.escape): finish},
        child: LayoutBuilder(
          builder: (context, constraints) {
            final screen = Offset.zero & constraints.biggest;
            final safe = MediaQuery.paddingOf(context);
            final cardHeight = (screen.height * .49).clamp(200.0, 420.0);
            final above =
                target != null && target!.center.dy > screen.height * .52;
            final top = above
                ? (target!.top - cardHeight - 28).clamp(
                    safe.top + 12,
                    screen.height - cardHeight - safe.bottom - 12,
                  )
                : ((target?.bottom ?? safe.top) + 28).clamp(
                    safe.top + 12,
                    screen.height - cardHeight - safe.bottom - 12,
                  );
            final left = screen.width > 600 ? (screen.width - 420) / 2 : 16.0;
            final width = (screen.width - left * 2).clamp(0.0, 420.0);
            return Stack(
              children: [
                Positioned.fill(
                  child: GestureDetector(
                    onTap: () {},
                    child: CustomPaint(
                      painter: _Spotlight(
                        target: target,
                        color: Colors.black.withValues(alpha: .72),
                        cardTop: top,
                        cardBottom: top + cardHeight,
                        above: above,
                      ),
                    ),
                  ),
                ),
                AnimatedPositioned(
                  duration: studioDuration(context),
                  curve: Curves.easeOutCubic,
                  top: top,
                  left: left,
                  width: width,
                  height: cardHeight,
                  child: Semantics(
                    scopesRoute: true,
                    explicitChildNodes: true,
                    namesRoute: true,
                    label: context.tr('Обучение', 'App tour'),
                    child: StudioPanel(
                      tone: StudioTone.elevated,
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Wrap(
                            alignment: WrapAlignment.spaceBetween,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            spacing: 8,
                            runSpacing: 4,
                            children: [
                              Text(
                                '${step + 1} / ${widget.steps.length}',
                                style: Theme.of(context).textTheme.labelLarge,
                              ),
                              TextButton(
                                onPressed: saving ? null : finish,
                                child: Text(context.tr('Пропустить', 'Skip')),
                              ),
                            ],
                          ),
                          Expanded(
                            child: SingleChildScrollView(
                              child: AnimatedSwitcher(
                                duration: studioDuration(context),
                                child: Column(
                                  key: ValueKey(step),
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const CloudCompanion(
                                      size: 84,
                                      emotion: CloudEmotion.happy,
                                    ),
                                    Text(
                                      widget.steps[step].title,
                                      style: Theme.of(
                                        context,
                                      ).textTheme.headlineSmall,
                                    ),
                                    const SizedBox(height: 10),
                                    Text(
                                      widget.steps[step].description,
                                      style: Theme.of(
                                        context,
                                      ).textTheme.bodyLarge,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            alignment: WrapAlignment.end,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              if (step > 0)
                                TextButton(
                                  onPressed: saving ? null : () => move(-1),
                                  child: Text(context.tr('Назад', 'Back')),
                                ),
                              FilledButton(
                                focusNode: nextFocus,
                                onPressed: saving
                                    ? null
                                    : () => step == widget.steps.length - 1
                                          ? finish()
                                          : move(1),
                                child: Text(
                                  step == widget.steps.length - 1
                                      ? context.tr('Начать', 'Let’s begin')
                                      : context.tr('Дальше', 'Next'),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    ),
  );
}

class _Spotlight extends CustomPainter {
  const _Spotlight({
    required this.target,
    required this.color,
    required this.cardTop,
    required this.cardBottom,
    required this.above,
  });
  final Rect? target;
  final Color color;
  final double cardTop, cardBottom;
  final bool above;
  @override
  void paint(Canvas canvas, Size size) {
    final full = Path()..addRect(Offset.zero & size);
    if (target == null) {
      canvas.drawPath(full, Paint()..color = color);
      return;
    }
    final hole = RRect.fromRectAndRadius(target!, const Radius.circular(18));
    canvas.drawPath(
      Path.combine(PathOperation.difference, full, Path()..addRRect(hole)),
      Paint()..color = color,
    );
    canvas.drawRRect(
      hole,
      Paint()
        ..color = const Color(0xffc6b4ff)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );
    final x = target!.center.dx.clamp(24.0, size.width - 24);
    final end = Offset(x, above ? target!.top - 5 : target!.bottom + 5);
    final start = Offset(
      (size.width / 2).clamp(24.0, size.width - 24),
      above ? cardBottom + 4 : cardTop - 4,
    );
    final line = Path()
      ..moveTo(start.dx, start.dy)
      ..quadraticBezierTo(x, start.dy, end.dx, end.dy);
    final paint = Paint()
      ..color = const Color(0xffc6b4ff)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;
    canvas.drawPath(line, paint);
    final sign = above ? -1.0 : 1.0;
    canvas.drawPath(
      Path()
        ..moveTo(end.dx - 5, end.dy + sign * 7)
        ..lineTo(end.dx, end.dy)
        ..lineTo(end.dx + 5, end.dy + sign * 7),
      paint,
    );
  }

  @override
  bool shouldRepaint(_Spotlight old) =>
      old.target != target ||
      old.cardTop != cardTop ||
      old.cardBottom != cardBottom ||
      old.color != color;
}
