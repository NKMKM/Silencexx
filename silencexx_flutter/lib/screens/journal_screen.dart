import '../widgets/studio.dart';
import 'package:flutter/material.dart';

import '../core/api.dart';
import '../core/app_state.dart';
import '../widgets/design.dart';
import '../widgets/common.dart';

class JournalScreen extends StatefulWidget {
  const JournalScreen({super.key});
  @override
  State<JournalScreen> createState() => JournalScreenState();
}

class JournalScreenState extends State<JournalScreen> {
  DateTime selected = DateTime.now();
  final content = TextEditingController();
  int revision = 0;
  bool archive = false;
  bool editing = false;

  bool closeEntry() {
    if (!editing) return false;
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      editing = false;
      selected = DateTime.now();
    });
    return true;
  }

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

  Future<void> save() async {
    if (content.text.trim().isEmpty) {
      throw ApiException(
        context.tr('Напишите несколько слов.', 'Write a few words first.'),
      );
    }
    final response = await context.app.api.call(
      '/journal/entry',
      method: 'POST',
      body: {
        'date': dateKey(selected),
        'utcOffsetMinutes': DateTime.now().timeZoneOffset.inMinutes,
        'content': content.text.trim(),
      },
    );
    if (!mounted) return;
    content.clear();
    if (response['aiFeedback'] != null) {
      await showAppDialog<void>(
        context: context,
        builder: (context) => AppDialog(
          title: Text(context.tr('Запись сохранена', 'Entry saved')),
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
  }

  void selectDate(DateTime date) => setState(() {
    selected = date;
    archive = false;
    editing = true;
  });

  Widget history(Json data) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Text(
        context.tr('История записей', 'Past entries'),
        style: Theme.of(context).textTheme.titleLarge,
      ),
      const SizedBox(height: 20),
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
      for (final date in rows(data, 'dates')) ...[
        StudioRow(
          leading: Text(
            '${date['date']}'.split('-').last,
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          title: Text('${date['date']}'),
          subtitle: Text(
            context.tr('Открыть личную запись', 'Open your journal entry'),
          ),
          trailing: const Icon(Icons.north_east_rounded, size: 20),
          onTap: () => selectDate(DateTime.parse('${date['date']}')),
        ),
        const Divider(height: 24),
      ],
    ],
  );

  @override
  Widget build(BuildContext context) => AsyncPanel(
    key: ValueKey('${dateKey(selected)}-$revision'),
    load: load,
    builder: (context, data, reload) {
      final entry = data['entry'] as Json?;
      final today = dateKey(selected) == dateKey(DateTime.now());
      final theme = Theme.of(context);
      final editor = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: 12,
            runSpacing: 12,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              AppBadge(
                label: today
                    ? context.tr('Сегодня', 'Today')
                    : dateKey(selected),
                icon: Icons.edit_calendar_outlined,
              ),
              TextButton.icon(
                icon: const Icon(Icons.calendar_today_outlined, size: 18),
                label: Text(context.tr('Выбрать день', 'Choose date')),
                onPressed: () async {
                  final date = await showDatePicker(
                    context: context,
                    initialDate: selected,
                    firstDate: DateTime(2020),
                    lastDate: DateTime.now(),
                  );
                  if (date != null && mounted) selectDate(date);
                },
              ),
            ],
          ),
          const SizedBox(height: 12),
          _JournalWeek(selected: selected, onSelected: selectDate),
          const SizedBox(height: 16),
          Text(
            today
                ? context.tr('Как прошёл ваш день?', 'How was your day?')
                : context.tr('Ваша запись', 'Your entry'),
            style: theme.textTheme.headlineMedium,
          ),
          const SizedBox(height: 12),
          const Divider(),
          if (entry != null) ...[
            const SizedBox(height: 20),
            Align(
              alignment: Alignment.centerLeft,
              child: AppBadge(
                label: context.tr('Сохранено', 'Saved'),
                icon: Icons.check_rounded,
              ),
            ),
            const SizedBox(height: 24),
            SelectableText(
              '${entry['diary_content'] ?? ''}',
              style: theme.textTheme.bodyLarge,
            ),
          ] else if (today) ...[
            TextField(
              controller: content,
              textCapitalization: TextCapitalization.sentences,
              minLines: 4,
              maxLines: 10,
              style: theme.textTheme.bodyLarge,
              decoration: InputDecoration(
                filled: false,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
                hintText: context.tr(
                  'Что сегодня было важным для вас?',
                  'What mattered to you today?',
                ),
              ),
            ),
            const Divider(),
            const SizedBox(height: 16),
            Text(
              context.tr(
                'Одна запись в день. После сохранения её нельзя изменить.',
                'One entry per day. Saved entries cannot be edited.',
              ),
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            ActionButton(
              label: context.tr('Сохранить запись', 'Save entry'),
              icon: Icons.bookmark_outline,
              action: save,
            ),
          ] else
            AppEmptyState(
              icon: Icons.menu_book_outlined,
              title: context.tr('Чистая страница', 'A quiet page'),
              description: context.tr(
                'В этот день записей нет.',
                'No entry for this date.',
              ),
            ),
        ],
      );
      if (!editing) {
        return PageBody(
          children: [
            StudioHeader(
              eyebrow: context.tr(
                'ЛИЧНАЯ КОЛЛЕКЦИЯ',
                'YOUR PRIVATE COLLECTION',
              ),
              title: context.tr('Дневник', 'Journal'),
            ),
            const SizedBox(height: 20),
            StudioPanel(
              tone: StudioTone.accent,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const StudioGlyph(Icons.edit_note_rounded, size: 48),
                  const SizedBox(height: 20),
                  Text(
                    context.tr(
                      'День, который хочется помнить.',
                      'A day worth remembering.',
                    ),
                    style: theme.textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 10),
                  Text(
                    context.tr(
                      'Слова не должны быть идеальными. Здесь они только ваши.',
                      'The words do not have to be perfect. Here, they are yours.',
                    ),
                  ),
                  const SizedBox(height: 20),
                  ActionButton(
                    label: entry == null
                        ? context.tr('Написать о сегодня', 'Write about today')
                        : context.tr(
                            'Читать сегодняшнюю запись',
                            'Read today’s entry',
                          ),
                    icon: Icons.north_east_rounded,
                    action: () async => selectDate(DateTime.now()),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),
            history(data),
          ],
        );
      }
      return LayoutBuilder(
        builder: (context, constraints) => Column(
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: closeEntry,
                icon: const Icon(Icons.arrow_back_rounded),
                label: Text(context.tr('Все записи', 'All entries')),
              ),
            ),
            Expanded(
              child:
                  constraints.maxHeight < 500 ||
                      MediaQuery.textScalerOf(context).scale(14) >= 19
                  ? PageBody(children: [editor])
                  : _mobileJournal(
                      context,
                      data,
                      editor,
                      entry,
                      today,
                      embedded: true,
                    ),
            ),
          ],
        ),
      );
    },
  );

  Widget _mobileJournal(
    BuildContext context,
    Json data,
    Widget editor,
    Json? entry,
    bool today, {
    bool embedded = false,
  }) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final showingArchive = archive && !embedded;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          StudioHeader(
            eyebrow: context.tr('ЗАМЕТКИ О СЕБЕ', 'NOTES TO YOURSELF'),
            title: context.tr('Дневник', 'Journal'),
            action: IconButton(
              tooltip: context.tr('Выбрать день', 'Choose date'),
              icon: const Icon(Icons.calendar_month_outlined),
              onPressed: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: selected,
                  firstDate: DateTime(2020),
                  lastDate: DateTime.now(),
                );
                if (date != null && mounted) selectDate(date);
              },
            ),
          ),
          if (!embedded)
            StudioTabs<bool>(
              segments: [
                ButtonSegment(
                  value: false,
                  label: Text(context.tr('Запись', 'Write')),
                ),
                ButtonSegment(
                  value: true,
                  label: Text(context.tr('Архив', 'Archive')),
                ),
              ],
              selected: {archive},
              onSelectionChanged: (values) => setState(() {
                archive = values.first;
              }),
            ),
          const SizedBox(height: 12),
          if (showingArchive)
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.only(bottom: 16),
                child: history(data),
              ),
            )
          else ...[
            _JournalWeek(selected: selected, onSelected: selectDate),
            const SizedBox(height: 14),
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                today
                    ? context.tr(
                        'Что хочется оставить здесь?',
                        'What would you like to leave here?',
                      )
                    : context.tr(
                        'Запись за этот день',
                        'Your entry for this day',
                      ),
                style: theme.textTheme.titleMedium,
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: colors.surface,
                  borderRadius: BorderRadius.circular(18),
                  border: Border(
                    left: BorderSide(
                      color: colors.primary.withValues(alpha: .45),
                      width: 3,
                    ),
                  ),
                ),
                child: entry != null
                    ? SingleChildScrollView(
                        child: SelectableText(
                          '${entry['diary_content'] ?? ''}',
                          style: theme.textTheme.bodyLarge?.copyWith(
                            height: 1.5,
                          ),
                        ),
                      )
                    : today
                    ? TextField(
                        controller: content,
                        expands: true,
                        minLines: null,
                        maxLines: null,
                        textCapitalization: TextCapitalization.sentences,
                        style: theme.textTheme.bodyLarge?.copyWith(height: 1.5),
                        decoration: InputDecoration(
                          filled: false,
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          hintText: context.tr(
                            'Можно коротко. Можно обо всём. Здесь не нужно быть правильным.',
                            'A few words or a whole page. There is no right way to write here.',
                          ),
                        ),
                      )
                    : Center(
                        child: Text(
                          context.tr(
                            'В этот день записей нет.',
                            'No entry for this day.',
                          ),
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: colors.onSurfaceVariant,
                          ),
                        ),
                      ),
              ),
            ),
            if (entry == null && today) ...[
              const SizedBox(height: 10),
              ActionButton(
                label: context.tr('Сохранить запись', 'Save entry'),
                icon: Icons.bookmark_add_outlined,
                action: save,
              ),
            ] else if (entry != null)
              Padding(
                padding: const EdgeInsets.only(top: 9),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: AppBadge(
                    label: context.tr('Запись сохранена', 'Entry saved'),
                    icon: Icons.check_rounded,
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
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
    return LayoutBuilder(
      builder: (context, constraints) {
        final minimumWidth =
            7 * (48.0 * MediaQuery.textScalerOf(context).scale(14) / 14 + 2);
        return SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          reverse: true,
          child: SizedBox(
            width: constraints.maxWidth < minimumWidth
                ? minimumWidth
                : constraints.maxWidth,
            child: Row(
              children: [
                for (var i = 6; i >= 0; i--)
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 1),
                      child: Builder(
                        builder: (context) {
                          final date = DateTime(
                            today.year,
                            today.month,
                            today.day - i,
                          );
                          final active = dateKey(date) == dateKey(selected);
                          return Semantics(
                            button: true,
                            selected: active,
                            label: dateKey(date),
                            child: Material(
                              color: active
                                  ? Theme.of(
                                      context,
                                    ).colorScheme.primary.withValues(alpha: .18)
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(16),
                              child: InkWell(
                                borderRadius: BorderRadius.circular(16),
                                onTap: () => onSelected(date),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 8,
                                  ),
                                  child: Column(
                                    children: [
                                      Text(
                                        weekdays[date.weekday - 1],
                                        style: Theme.of(
                                          context,
                                        ).textTheme.bodySmall,
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        '${date.day}',
                                        style: Theme.of(
                                          context,
                                        ).textTheme.titleMedium,
                                      ),
                                      const SizedBox(height: 6),
                                      AnimatedContainer(
                                        duration: studioDuration(context),
                                        width: active ? 18 : 4,
                                        height: 3,
                                        decoration: BoxDecoration(
                                          borderRadius: BorderRadius.circular(
                                            3,
                                          ),
                                          color: active
                                              ? Theme.of(
                                                  context,
                                                ).colorScheme.primary
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
            ),
          ),
        );
      },
    );
  }
}
