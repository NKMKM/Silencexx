import 'package:flutter/material.dart';

import '../core/api.dart';
import '../core/app_state.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_spacing.dart';
import '../widgets/common.dart';

class TasksScreen extends StatelessWidget {
  const TasksScreen({super.key});
  @override
  Widget build(BuildContext context) => AsyncPanel(
    load: () => context.app.api.call('/daily-task'),
    builder: (context, data, reload) {
      final task = data['task'] as Json;
      final status = '${task['status']}';
      return PageBody(
        children: [
          Text(
            context.tr('Маленький шаг для себя', 'A small step for yourself'),
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: AppSpacing.md),
          SectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  status == 'completed' ? Icons.verified : Icons.spa_outlined,
                  size: 44,
                  color: status == 'completed'
                      ? AppColors.success
                      : AppColors.primaryBright,
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  context.tr(
                    'Серия: ${task['streak'] ?? 0} дн.',
                    'Streak: ${task['streak'] ?? 0} days',
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  status == 'locked'
                      ? context.tr(
                          'Ваше задание на сегодня',
                          'Your task for today',
                        )
                      : '${task['title']}',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                if (status != 'locked') ...[
                  const SizedBox(height: AppSpacing.sm),
                  Text('${task['description'] ?? ''}'),
                ],
                const SizedBox(height: AppSpacing.lg),
                if (status == 'completed')
                  Text(
                    context.tr(
                      'Выполнено. Вы позаботились о себе!',
                      'Completed. You made time for yourself!',
                    ),
                  )
                else
                  ActionButton(
                    label: status == 'locked'
                        ? context.tr('Открыть задание', 'Open task')
                        : context.tr('Я выполнил(а)', 'Mark complete'),
                    action: () async {
                      await context.app.api.call(
                        '/daily-task/${status == 'locked' ? 'open' : 'complete'}',
                        method: 'PUT',
                        body: {'taskId': task['id']},
                      );
                      reload();
                    },
                  ),
              ],
            ),
          ),
        ],
      );
    },
  );
}
