import 'dart:math' as math;
import '../widgets/studio.dart';
import 'dart:async';
import 'package:flutter/material.dart';
import '../core/app_state.dart';
import '../core/theme/app_spacing.dart';
import '../widgets/common.dart';

class PanicScreen extends StatefulWidget {
  const PanicScreen({super.key});
  @override
  State<PanicScreen> createState() => _PanicScreenState();
}

class _PanicScreenState extends State<PanicScreen> {
  String? sessionId;
  String response = '';
  int step = -1;
  double level = 5;
  final input = TextEditingController();
  @override
  void dispose() {
    input.dispose();
    super.dispose();
  }

  Future<void> advance() async {
    final api = context.app.api;
    if (step == -1) {
      final data = await api.call('/panic/start', method: 'POST');
      if (mounted) {
        setState(() {
          sessionId = data['sessionId'] as String;
          response = '${data['initialMessage'] ?? ''}';
          step = 0;
        });
      }
      return;
    }
    if (step == 0) {
      await api.call(
        '/panic/anxiety-level',
        method: 'POST',
        body: {'sessionId': sessionId, 'level': level.round(), 'isStart': true},
      );
      if (mounted) {
        setState(() {
          step = 1;
          response = '';
        });
      }
      return;
    }
    if (step >= 9) {
      await api.call(
        '/panic/complete',
        method: 'POST',
        body: {'sessionId': sessionId, 'endAnxietyLevel': level.round()},
      );
      if (mounted) setState(() => step = 10);
      return;
    }
    final type = step == 1
        ? 'breathing'
        : step == 2
        ? 'grounding_intro'
        : step <= 7
        ? 'grounding_step'
        : 'anxiety_talk';
    final data = await api.call(
      '/panic/step',
      method: 'POST',
      body: {
        'sessionId': sessionId,
        'stepType': type,
        'userInput': input.text.trim(),
        if (step >= 3 && step <= 7) 'groundingIndex': step - 3,
      },
    );
    if (mounted) {
      setState(() {
        response = '${data['aiResponse'] ?? ''}';
        step++;
        input.clear();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final prompts = [
      context.tr(
        'Оцените тревогу от 1 до 10',
        'Rate your anxiety from 1 to 10',
      ),
      context.tr('Дышите в комфортном темпе', 'Breathe at a comfortable pace'),
      context.tr(
        'Почувствуйте опору под ногами',
        'Notice the support beneath your feet',
      ),
      context.tr(
        'Назовите 5 вещей, которые видите',
        'Name 5 things you can see',
      ),
      context.tr(
        'Назовите 4 вещи, которых можете коснуться',
        'Name 4 things you can touch',
      ),
      context.tr(
        'Назовите 3 звука, которые слышите',
        'Name 3 sounds you can hear',
      ),
      context.tr(
        'Назовите 2 запаха или вкуса',
        'Name 2 things you can smell or taste',
      ),
      context.tr(
        'Назовите 1 вещь, за которую благодарны',
        'Name 1 thing you are grateful for',
      ),
      context.tr('Какая мысль вас тревожит?', 'What thought is worrying you?'),
      context.tr('Как вы чувствуете себя сейчас?', 'How do you feel now?'),
    ];
    final theme = Theme.of(context);
    final phase = step < 1
        ? 0
        : step < 3
        ? 1
        : 2;
    return Scaffold(
      appBar: StudioTopBar(
        title: Text(context.tr('Пауза', 'A moment for you')),
      ),
      body: StudioActionLayout(
        maxWidth: 760,
        content: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            StudioHeader(
              eyebrow: context.tr('В ВАШЕМ ТЕМПЕ', 'AT YOUR OWN PACE'),
              title: context.tr('Пауза для себя', 'A moment for you'),
              action: Text(
                step < 0
                    ? '01'
                    : step == 10
                    ? '✓'
                    : '${step + 1} / 10',
                style: theme.textTheme.titleMedium?.copyWith(
                  color: theme.colorScheme.primary,
                ),
              ),
            ),
            Row(
              children: [
                for (var i = 0; i < 3; i++) ...[
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        AnimatedContainer(
                          duration: studioDuration(context),
                          height: 3,
                          decoration: BoxDecoration(
                            color: i <= phase || step == 10
                                ? theme.colorScheme.primary
                                : theme.colorScheme.outlineVariant,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          [
                            context.tr('Самочувствие', 'Check in'),
                            context.tr('Дыхание', 'Breathe'),
                            context.tr('Опора', 'Grounding'),
                          ][i],
                          style: theme.textTheme.labelSmall,
                        ),
                      ],
                    ),
                  ),
                  if (i < 2) const SizedBox(width: 10),
                ],
              ],
            ),
            const SizedBox(height: 24),
            StudioResize(
              duration: studioDuration(context),
              alignment: Alignment.topCenter,
              child: AnimatedSwitcher(
                duration: studioDuration(context),
                child: KeyedSubtree(
                  key: ValueKey('pause-step-$step'),
                  child: _mobileStep(
                    context,
                    theme,
                    prompts,
                    theme.colorScheme,
                  ),
                ),
              ),
            ),
          ],
        ),
        action: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (step < 10)
              ActionButton(
                label: step < 0
                    ? context.tr('Начать паузу', 'Start gently')
                    : step == 9
                    ? context.tr('Завершить', 'Finish')
                    : context.tr('Дальше', 'Continue'),
                icon: step < 0
                    ? Icons.air_rounded
                    : step == 9
                    ? Icons.check_rounded
                    : Icons.arrow_forward_rounded,
                action: advance,
              )
            else
              FilledButton.icon(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.arrow_back_rounded),
                label: Text(context.tr('Вернуться', 'Return')),
              ),
            TextButton.icon(
              onPressed: () => showSupport(context),
              icon: const Icon(Icons.favorite_outline_rounded, size: 17),
              label: Text(
                context.tr('Нужна помощь рядом', 'Reach out for help'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _mobileStep(
    BuildContext context,
    ThemeData theme,
    List<String> prompts,
    ColorScheme colors,
  ) {
    if (step < 0 || step == 10) {
      final complete = step == 10;
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: colors.primary.withValues(alpha: .09),
                border: Border.all(
                  color: colors.primary.withValues(alpha: .24),
                ),
              ),
              child: Icon(
                complete ? Icons.check_rounded : Icons.air_rounded,
                size: 38,
                color: colors.primary,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              complete
                  ? context.tr(
                      'Ты уделил(а) себе время',
                      'You made time for you',
                    )
                  : context.tr('Давай замедлимся', 'Let’s slow things down'),
              textAlign: TextAlign.center,
              style: theme.textTheme.headlineMedium?.copyWith(height: 1.12),
            ),
            const SizedBox(height: 12),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 340),
              child: Text(
                complete
                    ? context.tr(
                        'На этом можно остановиться. Возвращайся к паузе, когда понадобится.',
                        'You can stop here. Return to this pause whenever you need it.',
                      )
                    : context.tr(
                        'Один небольшой шаг за раз. Можно остановиться в любой момент.',
                        'One small step at a time. You can stop whenever you want.',
                      ),
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: colors.onSurfaceVariant,
                  height: 1.45,
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (response.trim().isNotEmpty) ...[
          Text(
            response,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: colors.onSurfaceVariant,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 24),
        ],
        Text(
          prompts[step],
          style: theme.textTheme.headlineSmall?.copyWith(height: 1.15),
        ),
        if (step == 0 || step == 9) ...[
          const SizedBox(height: 22),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${level.round()}',
                style: theme.textTheme.displayMedium?.copyWith(
                  color: colors.primary,
                  height: 1,
                ),
              ),
              const SizedBox(width: 8),
              Padding(
                padding: const EdgeInsets.only(bottom: 5),
                child: Text(
                  context.tr('из 10', 'out of 10'),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colors.onSurfaceVariant,
                  ),
                ),
              ),
            ],
          ),
          Slider(
            value: level,
            min: 1,
            max: 10,
            divisions: 9,
            label: '${level.round()}',
            semanticFormatterCallback: (value) => context.tr(
              '${value.round()} из 10',
              '${value.round()} out of 10',
            ),
            onChanged: (value) => setState(() => level = value),
          ),
          Row(
            children: [
              Expanded(child: Text(context.tr('Спокойно', 'Calm'))),
              Expanded(
                child: Text(
                  context.tr('Сильная тревога', 'Very anxious'),
                  textAlign: TextAlign.end,
                ),
              ),
            ],
          ),
        ] else if (step == 1) ...[
          const SizedBox(height: 12),
          const BreathingCircle(compact: true),
        ] else if (step >= 3 && step <= 8) ...[
          const SizedBox(height: 18),
          TextField(
            controller: input,
            minLines: 2,
            maxLines: 3,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              hintText: context.tr(
                'Можно ответить здесь или про себя',
                'You can answer here or just reflect',
              ),
            ),
          ),
        ] else ...[
          const SizedBox(height: 14),
          Text(
            context.tr(
              'Не нужно делать всё идеально. Просто заметь, что происходит сейчас.',
              'There is no need to do this perfectly. Just notice what is here now.',
            ),
            style: theme.textTheme.bodyMedium?.copyWith(
              color: colors.onSurfaceVariant,
              height: 1.45,
            ),
          ),
        ],
      ],
    );
  }
}

class BreathingCircle extends StatefulWidget {
  const BreathingCircle({super.key, this.compact = false});
  final bool compact;
  @override
  State<BreathingCircle> createState() => _BreathingCircleState();
}

class _BreathingCircleState extends State<BreathingCircle>
    with WidgetsBindingObserver {
  int seconds = 0;
  Timer? timer;
  bool foreground = true, entered = false;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) setState(() => entered = true);
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    syncTimer();
  }

  void syncTimer() {
    final active = foreground && TickerMode.valuesOf(context).enabled;
    if (active && timer == null) {
      timer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted) setState(() => seconds++);
      });
    } else if (!active) {
      timer?.cancel();
      timer = null;
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    foreground = state == AppLifecycleState.resumed;
    if (mounted) syncTimer();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final phase = seconds % 12;
    final inhale = phase < 4;
    final pause = phase >= 4 && phase < 6;
    final label = inhale
        ? context.tr('Вдох', 'Breathe in')
        : pause
        ? context.tr('Пауза', 'Pause')
        : context.tr('Выдох', 'Breathe out');
    final remaining = inhale
        ? 4 - phase
        : pause
        ? 6 - phase
        : 12 - phase;
    final reduced = MediaQuery.disableAnimationsOf(context);
    final size = widget.compact ? 164.0 : 208.0;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          height: size,
          child: Center(
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox.square(
                  dimension: size,
                  child: CustomPaint(
                    painter: _BreathDialPainter(
                      phase / 12,
                      Theme.of(context).colorScheme.primary,
                    ),
                  ),
                ),
                AnimatedScale(
                  scale: reduced
                      ? 1
                      : phase < 6 && entered
                      ? 1
                      : .72,
                  duration: reduced
                      ? Duration.zero
                      : Duration(
                          seconds: inhale
                              ? 4
                              : pause
                              ? 2
                              : 6,
                        ),
                  curve: Curves.easeInOut,
                  child: Container(
                    width: size * .76,
                    height: size * .76,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Theme.of(
                        context,
                      ).colorScheme.primary.withValues(alpha: .07),
                      border: Border.all(
                        color: Theme.of(
                          context,
                        ).colorScheme.primary.withValues(alpha: .42),
                        width: 1.2,
                      ),
                    ),
                  ),
                ),
                Semantics(
                  label: context.tr(
                    '$label, осталось $remaining секунд',
                    '$label, $remaining seconds remaining',
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '$remaining',
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(
                              color: Theme.of(context).colorScheme.primary,
                            ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        label,
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        if (!widget.compact) ...[
          const SizedBox(height: AppSpacing.md),
          Text(
            context.tr(
              'Вдохни мягко. Выдыхай чуть дольше. Не нужно задерживать дыхание.',
              'Breathe in gently and let your exhale be a little longer. No need to hold your breath.',
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ],
    );
  }
}

class _BreathDialPainter extends CustomPainter {
  _BreathDialPainter(this.progress, this.color);
  final double progress;
  final Color color;
  @override
  void paint(Canvas canvas, Size size) {
    final rect = Rect.fromCircle(
      center: size.center(Offset.zero),
      radius: size.shortestSide * .47,
    );
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round;
    for (var i = 0; i < 12; i++) {
      paint.color = color.withValues(alpha: i / 12 <= progress ? .8 : .16);
      canvas.drawArc(
        rect,
        -math.pi / 2 + i * math.pi / 6,
        math.pi / 6 - .12,
        false,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_BreathDialPainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.color != color;
}
