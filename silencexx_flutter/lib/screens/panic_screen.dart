import 'dart:async';
import 'package:flutter/material.dart';
import '../core/app_state.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_gradients.dart';
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
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('Я рядом', 'I am here'))),
      body: PageBody(
        children: [
          if (step >= 0 && step < 10)
            ClipRRect(
              borderRadius: BorderRadius.circular(99),
              child: LinearProgressIndicator(value: step / 10, minHeight: 4),
            ),
          const SizedBox(height: AppSpacing.xl),
          const Icon(
            Icons.favorite_outline,
            size: 56,
            color: AppColors.primaryBright,
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            step < 0
                ? context.tr(
                    'Давайте пройдём этот момент вместе',
                    'Let’s take this one moment at a time',
                  )
                : step == 10
                ? context.tr(
                    'Спасибо, что позаботились о себе',
                    'Thank you for taking care of yourself',
                  )
                : prompts[step],
            style: Theme.of(context).textTheme.headlineSmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.lg),
          if (response.isNotEmpty && step < 10)
            SectionCard(child: Text(response)),
          if (step == 0 || step == 9) ...[
            Text('${level.round()} / 10', textAlign: TextAlign.center),
            Slider(
              value: level,
              min: 1,
              max: 10,
              divisions: 9,
              label: '${level.round()}',
              onChanged: (v) => setState(() => level = v),
            ),
          ],
          if (step == 1) const BreathingCircle(),
          if (step >= 3 && step <= 8)
            TextField(
              controller: input,
              minLines: 2,
              maxLines: 5,
              decoration: InputDecoration(
                hintText: context.tr(
                  'Можно написать или просто подумать',
                  'You may write or just reflect',
                ),
              ),
            ),
          const SizedBox(height: 20),
          if (step < 10)
            ActionButton(
              label: step == -1
                  ? context.tr('Начать', 'Begin')
                  : step == 9
                  ? context.tr('Завершить', 'Finish')
                  : context.tr('Продолжить', 'Continue'),
              action: advance,
            )
          else
            FilledButton(
              onPressed: () => Navigator.pop(context),
              child: Text(context.tr('Вернуться', 'Go back')),
            ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () => showSupport(context),
            child: Text(
              context.tr('Обратиться за поддержкой', 'Reach out for support'),
            ),
          ),
        ],
      ),
    );
  }
}

class BreathingCircle extends StatefulWidget {
  const BreathingCircle({super.key});
  @override
  State<BreathingCircle> createState() => _BreathingCircleState();
}

class _BreathingCircleState extends State<BreathingCircle> {
  int seconds = 0;
  late final Timer timer = Timer.periodic(const Duration(seconds: 1), (_) {
    if (mounted) setState(() => seconds++);
  });
  @override
  void initState() {
    super.initState();
    timer;
  }

  @override
  void dispose() {
    timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final phase = seconds % 12;
    return Column(
      children: [
        const SizedBox(height: AppSpacing.xxl),
        SizedBox(
          height: 180,
          child: Center(
            child: AnimatedContainer(
              duration: Duration(
                seconds: phase < 4
                    ? 4
                    : phase < 6
                    ? 2
                    : 6,
              ),
              curve: Curves.easeInOut,
              width: phase < 6 ? 170 : 100,
              height: phase < 6 ? 170 : 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: AppGradients.accent,
              ),
              child: Center(
                child: Text(
                  phase < 4
                      ? context.tr('Вдох', 'Breathe in')
                      : phase < 6
                      ? context.tr('Пауза', 'Pause')
                      : context.tr('Выдох', 'Breathe out'),
                  style: const TextStyle(color: Colors.white, fontSize: 20),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 20),
        Text(
          context.tr(
            'Можно пропустить паузу или остановиться в любой момент.',
            'You may skip the pause or stop whenever you want.',
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
