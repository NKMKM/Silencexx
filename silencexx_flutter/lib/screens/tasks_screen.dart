import 'package:flutter/material.dart';
import '../core/api.dart';
import '../core/app_state.dart';
import '../widgets/common.dart';
import '../widgets/design.dart';
import '../widgets/studio.dart';
import 'panic_screen.dart';

class TasksScreen extends StatefulWidget {
  const TasksScreen({super.key});
  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> {
  Json? updatedTask;
  Future<void> updateTask(Json task, String status) async {
    final locked = status == 'locked';
    final result = await context.app.api.call(
      '/daily-task/${locked ? 'open' : 'complete'}',
      method: 'PUT',
      body: {'taskId': task['id']},
    );
    if (!mounted) return;
    setState(
      () => updatedTask = {
        ...task,
        'status': result['status'] ?? (locked ? 'opened' : 'completed'),
      },
    );
  }

  @override
  Widget build(BuildContext context) => AsyncPanel(
    load: () => context.app.api.call('/daily-task'),
    builder: (context, data, reload) {
      final task = updatedTask ?? data['task'] as Json;
      final status = '${task['status']}';
      final done = status == 'completed';
      final locked = status == 'locked';
      final t = Theme.of(context);
      final c = t.colorScheme;
      final mobile = MediaQuery.sizeOf(context).width < 700;
      final step = done
          ? 3
          : locked
          ? 0
          : 1;
      return StudioActionLayout(
        maxWidth: 860,
        content: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            StudioHeader(
              eyebrow: context.tr('МАЛЕНЬКИЕ ШАГИ', 'SMALL STEPS'),
              title: context.tr('Практики', 'Practice'),
              action: AppBadge(
                label: '${task['streak'] ?? 0}',
                icon: Icons.local_fire_department_outlined,
              ),
            ),
            StudioPanel(
              tone: StudioTone.accent,
              padding: const EdgeInsets.all(22),
              child: StudioResize(
                duration: studioDuration(context),
                alignment: Alignment.topCenter,
                child: AnimatedSwitcher(
                  duration: studioDuration(context),
                  child: Column(
                    key: ValueKey(status),
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              context.tr('ПРАКТИКА ДНЯ', 'TODAY’S PRACTICE'),
                              style: t.textTheme.labelSmall?.copyWith(
                                letterSpacing: 1,
                              ),
                            ),
                          ),
                          LivingEmblem(
                            size: 64,
                            icon: done
                                ? Icons.check_rounded
                                : Icons.spa_outlined,
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Text(
                        done
                            ? mobile
                                  ? context.tr(
                                      'Ты был(а) рядом с собой.',
                                      'You showed up for yourself.',
                                    )
                                  : context.tr(
                                      'Выполнено. Вы нашли время для себя.',
                                      'Complete. You made time for yourself.',
                                    )
                            : locked
                            ? context.tr(
                                'Маленький шаг. Большое внимание к себе.',
                                'A small step. A little care for yourself.',
                              )
                            : '${task['title']}',
                        style: t.textTheme.headlineMedium,
                      ),
                      const SizedBox(height: 14),
                      Text(
                        done
                            ? context.tr(
                                'На сегодня достаточно. Новая практика появится завтра.',
                                'That is enough for today. A new practice will be here tomorrow.',
                              )
                            : locked
                            ? context.tr(
                                'Короткая практика без спешки. Начни, когда почувствуешь готовность.',
                                'A short practice with no rush. Begin when you feel ready.',
                              )
                            : '${task['description'] ?? ''}',
                        style: t.textTheme.bodyLarge?.copyWith(
                          color: c.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 28),
                      _PracticeJourney(stage: step),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              context.tr('КОГДА НУЖНА ПАУЗА', 'WHEN YOU NEED A PAUSE'),
              style: t.textTheme.labelSmall?.copyWith(letterSpacing: .8),
            ),
            const SizedBox(height: 8),
            StudioPanel(
              padding: const EdgeInsets.all(4),
              child: StudioRow(
                leading: const StudioGlyph(Icons.air_rounded, size: 48),
                title: Text(
                  context.tr(
                    'Тревожно? Пауза и поддержка',
                    'Anxious? Pause and support',
                  ),
                ),
                subtitle: Text(
                  context.tr(
                    'Дыхание и возвращение к настоящему',
                    'Breathing and grounding in the present',
                  ),
                ),
                trailing: const Icon(Icons.arrow_outward_rounded),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const PanicScreen()),
                ),
              ),
            ),
          ],
        ),
        action: done
            ? StudioNotice(
                message: context.tr(
                  'Ты сделал(а) достаточно',
                  'You did enough today',
                ),
                icon: Icons.check_circle_outline_rounded,
              )
            : ActionButton(
                icon: locked
                    ? Icons.arrow_forward_rounded
                    : Icons.check_rounded,
                label: locked
                    ? mobile
                          ? context.tr('Начать практику', 'Begin practice')
                          : context.tr('Открыть практику', 'Begin practice')
                    : mobile
                    ? context.tr('Завершить практику', 'Finish practice')
                    : context.tr('Я выполнил(а)', 'Mark complete'),
                action: () => updateTask(task, status),
              ),
      );
    },
  );
}

class _PracticeJourney extends StatelessWidget {
  const _PracticeJourney({required this.stage});
  final int stage;
  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme;
    final labels = [
      context.tr('Открыть', 'Open'),
      context.tr('Попробовать', 'Try'),
      context.tr('Завершить', 'Complete'),
    ];
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
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
                    color: i < stage ? c.primary : c.outlineVariant,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  '${i + 1} · ${labels[i]}',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: i < stage ? c.onSurface : c.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          if (i < 2) const SizedBox(width: 10),
        ],
      ],
    );
  }
}
