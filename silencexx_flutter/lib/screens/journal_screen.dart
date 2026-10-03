import 'package:flutter/material.dart';

import '../core/api.dart';
import '../core/app_state.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_motion.dart';
import '../core/theme/app_spacing.dart';
import '../widgets/common.dart';

class JournalScreen extends StatefulWidget {
  const JournalScreen({super.key});
  @override
  State<JournalScreen> createState() => _JournalScreenState();
}

class _JournalScreenState extends State<JournalScreen> {
  DateTime selected = DateTime.now();
  final content = TextEditingController();
  int revision = 0;
  @override
  void dispose() {
    content.dispose();
    super.dispose();
  }

  Future<Json> load() async {
    final api = context.app.api;
    final results = await Future.wait([
      api.call('/journal/list'),
      api.call('/journal/entry?date=${dateKey(selected)}'),
    ]);
    return {...results[0], ...results[1]};
  }

  @override
  Widget build(BuildContext context) => AsyncPanel(
    key: ValueKey('${dateKey(selected)}-$revision'),
    load: load,
    builder: (context, data, reload) {
      final entry = data['entry'] as Json?;
      final today = dateKey(selected) == dateKey(DateTime.now());
      return PageBody(
        children: [
          Text(
            context.tr('Как прошёл ваш день?', 'How was your day?'),
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          SectionCard(
            child: CalendarDatePicker(
              initialDate: selected,
              firstDate: DateTime(2020),
              lastDate: DateTime.now(),
              onDateChanged: (date) => setState(() {
                selected = date;
                content.clear();
              }),
            ),
          ),
          Row(
            children: [
              const Icon(Icons.event_outlined, color: AppColors.primaryBright),
              const SizedBox(width: AppSpacing.sm),
              Text(
                dateKey(selected),
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (entry != null)
            SectionCard(
              child: SelectableText('${entry['diary_content'] ?? ''}'),
            )
          else if (today) ...[
            TextField(
              controller: content,
              minLines: 6,
              maxLines: 12,
              decoration: InputDecoration(
                hintText: context.tr(
                  'Что сегодня было важным для вас?',
                  'What mattered to you today?',
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              context.tr(
                'Одна запись в день. После сохранения её нельзя изменить.',
                'One entry per day. Saved entries cannot be edited.',
              ),
            ),
            const SizedBox(height: 12),
            ActionButton(
              label: context.tr('Сохранить запись', 'Save entry'),
              icon: Icons.bookmark_outline,
              action: () async {
                if (content.text.trim().isEmpty) {
                  throw ApiException(
                    context.tr(
                      'Напишите несколько слов.',
                      'Write a few words first.',
                    ),
                  );
                }
                final response = await context.app.api.call(
                  '/journal/entry',
                  method: 'POST',
                  body: {
                    'date': dateKey(selected),
                    'content': content.text.trim(),
                  },
                );
                if (!context.mounted) return;
                content.clear();
                if (response['aiFeedback'] != null) {
                  await showDialog<void>(
                    context: context,
                    animationStyle: const AnimationStyle(
                      duration: AppMotion.overlay,
                      reverseDuration: AppMotion.control,
                      curve: AppMotion.enter,
                      reverseCurve: AppMotion.exit,
                    ),
                    builder: (context) => AlertDialog(
                      title: Text(
                        context.tr('Запись сохранена', 'Entry saved'),
                      ),
                      content: Text('${response['aiFeedback']}'),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('OK'),
                        ),
                      ],
                    ),
                  );
                }
                if (mounted) setState(() => revision++);
              },
            ),
          ] else
            Text(
              context.tr('В этот день записей нет.', 'No entry for this date.'),
            ),
          const SizedBox(height: 28),
          Text(
            context.tr('История записей', 'Past entries'),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          for (final date in rows(data, 'dates'))
            ListTile(
              leading: const Icon(Icons.event_note),
              title: Text('${date['date']}'),
              onTap: () => setState(() {
                selected = DateTime.parse('${date['date']}');
                content.clear();
              }),
            ),
        ],
      );
    },
  );
}
