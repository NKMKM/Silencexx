import '../widgets/studio.dart';
import 'package:flutter/material.dart';
import '../core/app_state.dart';
import '../widgets/design.dart';
import '../widgets/common.dart';

class WellnessOnboardingScreen extends StatefulWidget {
  const WellnessOnboardingScreen({super.key});
  @override
  State<WellnessOnboardingScreen> createState() =>
      _WellnessOnboardingScreenState();
}

class _WellnessOnboardingScreenState extends State<WellnessOnboardingScreen> {
  final selected = <String>{};
  final topics = <String, (String, String)>{
    'stress': ('Стресс', 'Stress'),
    'anxiety': ('Тревога', 'Anxiety'),
    'motivation': ('Мотивация', 'Motivation'),
    'relationships': ('Отношения', 'Relationships'),
    'reflection': ('Размышления о себе', 'Self-reflection'),
    'talk': ('Просто поговорить', 'Just want to talk'),
  };

  bool saving = false;
  Future<void> finish({bool skip = false}) async {
    if (saving) return;
    setState(() => saving = true);
    try {
      await context.app.finishOnboarding(
        interests: skip ? const [] : selected.toList(),
      );
    } catch (error) {
      if (mounted) showError(context, error);
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  static const topicIcons = <String, IconData>{
    'stress': Icons.spa_outlined,
    'anxiety': Icons.air_rounded,
    'motivation': Icons.auto_awesome_outlined,
    'relationships': Icons.favorite_border_rounded,
    'reflection': Icons.nights_stay_outlined,
    'talk': Icons.chat_bubble_outline_rounded,
  };

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: AuthFrame(
        child: StudioActionLayout(
          content: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              StudioHeader(
                eyebrow: context.tr('НАЧНЁМ С ВАС', 'START WITH YOU'),
                icon: Icons.tune_rounded,
                title: context.tr(
                  'О чём хочется поговорить?',
                  'What would you like support with?',
                ),
                description: context.tr(
                  'Выберите то, что близко сейчас. Можно выбрать несколько тем или пропустить.',
                  'Choose what feels right today. Pick a few topics, or skip for now.',
                ),
              ),
              LayoutBuilder(
                builder: (context, constraints) {
                  final columns = constraints.maxWidth >= 500 ? 2 : 1;
                  final width =
                      (constraints.maxWidth - (columns - 1) * 10) / columns;
                  return Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      for (final entry in topics.entries)
                        SizedBox(
                          width: width,
                          child: AnimatedContainer(
                            duration: studioDuration(context),
                            padding: const EdgeInsets.all(3),
                            decoration: BoxDecoration(
                              color: selected.contains(entry.key)
                                  ? Theme.of(
                                      context,
                                    ).colorScheme.primary.withValues(alpha: .12)
                                  : Theme.of(
                                      context,
                                    ).colorScheme.surfaceContainerLow,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: selected.contains(entry.key)
                                    ? Theme.of(context).colorScheme.primary
                                          .withValues(alpha: .5)
                                    : Theme.of(
                                        context,
                                      ).colorScheme.outlineVariant,
                              ),
                            ),
                            child: StudioRow(
                              selected: selected.contains(entry.key),
                              enabled: !saving,
                              leading: StudioGlyph(
                                topicIcons[entry.key]!,
                                size: 38,
                              ),
                              title: Text(
                                context.tr(entry.value.$1, entry.value.$2),
                              ),
                              trailing: AnimatedSwitcher(
                                duration: studioDuration(context),
                                child: Icon(
                                  selected.contains(entry.key)
                                      ? Icons.check_circle_rounded
                                      : Icons.add_rounded,
                                  key: ValueKey(selected.contains(entry.key)),
                                  size: 20,
                                ),
                              ),
                              onTap: () => setState(() {
                                selected.contains(entry.key)
                                    ? selected.remove(entry.key)
                                    : selected.add(entry.key);
                              }),
                            ),
                          ),
                        ),
                    ],
                  );
                },
              ),
              const SizedBox(height: 20),
              StudioNotice(
                message: context.tr(
                  'Выбрано тем: ${selected.length}',
                  '${selected.length} topics selected',
                ),
                icon: Icons.checklist_rounded,
              ),
            ],
          ),
          action: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              FilledButton(
                onPressed: saving ? null : () => finish(),
                child: Text(context.tr('Продолжить в чат', 'Continue to chat')),
              ),
              TextButton(
                onPressed: saving ? null : () => finish(skip: true),
                child: Text(context.tr('Может быть позже', 'Maybe later')),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
