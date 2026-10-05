import 'package:flutter/material.dart';

import '../core/api.dart';
import '../core/app_state.dart';
import '../widgets/design.dart';
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
          PageIntro(
            eyebrow: context.tr('Личное пространство', 'Your private space'),
            title: context.tr('Как прошёл ваш день?', 'How was your day?'),
            description: context.tr(
              'Остановитесь на минуту. Здесь можно оставить то, что важно.',
              'Pause for a moment. Make room for what matters.',
            ),
          ),
          Row(
            children: [
              Expanded(
                child: Text(
                  today ? context.tr('Сегодня', 'Today') : dateKey(selected),
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              OutlinedButton.icon(
                icon: const Icon(Icons.calendar_today_outlined, size: 18),
                label: Text(context.tr('Выбрать день', 'Choose date')),
                onPressed: () async {
                  final date = await showDatePicker(
                    context: context,
                    initialDate: selected,
                    firstDate: DateTime(2020),
                    lastDate: DateTime.now(),
                  );
                  if (date != null &&
                      mounted &&
                      dateKey(date) != dateKey(selected)) {
                    setState(() {
                      selected = date;
                      content.clear();
                    });
                  }
                },
              ),
            ],
          ),
          const SizedBox(height: 20),
          _JournalWeek(
            selected: selected,
            onSelected: (date) => setState(() {
              selected = date;
              content.clear();
            }),
          ),
          const SizedBox(height: 24),
          if (entry != null)
            SectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AppBadge(
                    label: context.tr('Сохранено', 'Saved'),
                    icon: Icons.check_rounded,
                  ),
                  const SizedBox(height: 20),
                  SelectableText(
                    '${entry['diary_content'] ?? ''}',
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                ],
              ),
            )
          else if (today) ...[
            SectionCard(
              child: TextField(
                controller: content,
                minLines: 6,
                maxLines: 12,
                decoration: InputDecoration(
                  filled: false,
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  hintText: context.tr(
                    'Что сегодня было важным для вас?',
                    'What mattered to you today?',
                  ),
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
                  await showAppDialog<void>(
                    context: context,
                    builder: (context) => AppDialog(
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
          const SizedBox(height: 12),
          if (rows(data, 'dates').isEmpty)
            AppEmptyState(
              icon: Icons.auto_stories_outlined,
              title: context.tr(
                'Ваша история начинается здесь',
                'Your story starts here',
              ),
              description: context.tr(
                'Сохранённые мысли останутся рядом.',
                'Your saved reflections will be here.',
              ),
            ),
          for (final date in rows(data, 'dates'))
            Card(
              child: ListTile(
                leading: const Icon(Icons.event_note),
                title: Text('${date['date']}'),
                onTap: () => setState(() {
                  selected = DateTime.parse('${date['date']}');
                  content.clear();
                }),
                trailing: const Icon(Icons.arrow_outward_rounded, size: 18),
              ),
            ),
        ],
      );
    },
  );
}

class _JournalWeek extends StatelessWidget {
  const _JournalWeek({required this.selected, required this.onSelected});
  final DateTime selected;
  final ValueChanged<DateTime> onSelected;
  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final weekdays = context.app.language == 'ru'
        ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
        : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    return Row(
      children: [
        for (var i = 6; i >= 0; i--)
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 3),
              child: Builder(
                builder: (context) {
                  final date = DateTime(today.year, today.month, today.day - i);
                  final active = dateKey(date) == dateKey(selected);
                  return Semantics(
                    selected: active,
                    label: dateKey(date),
                    child: Material(
                      color: active
                          ? Theme.of(
                              context,
                            ).colorScheme.primary.withValues(alpha: .18)
                          : Theme.of(context).colorScheme.surface,
                      borderRadius: BorderRadius.circular(16),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () => onSelected(date),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          child: Column(
                            children: [
                              Text(
                                weekdays[date.weekday - 1],
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                '${date.day}',
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              const SizedBox(height: 8),
                              Container(
                                width: 4,
                                height: 4,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: active
                                      ? Theme.of(context).colorScheme.primary
                                      : Colors.transparent,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
      ],
    );
  }
}
