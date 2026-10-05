import 'package:flutter/material.dart';
import '../core/app_state.dart';
import '../core/theme/app_spacing.dart';
import '../widgets/design.dart';
import '../widgets/glass.dart';

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

  Future<void> finish() async =>
      context.app.finishOnboarding(interests: selected.toList());

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: AuthFrame(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: PageReveal(
              child: GlassSurface(
                radius: 30,
                opacity: .72,
                blur: 16,
                padding: const EdgeInsets.all(26),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Center(
                      child: QuietOrbit(
                        size: 82,
                        child: Icon(Icons.spa_outlined, size: 26),
                      ),
                    ),
                    const SizedBox(height: 18),
                    Text(
                      context.tr(
                        'О чём хочется поговорить?',
                        'What would you like support with?',
                      ),
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      context.tr(
                        'Можно выбрать несколько вариантов или пропустить. Это не анкета и выбор можно изменить позже.',
                        'Choose any that feel right, or skip. This isn’t an assessment, and you can change your mind later.',
                      ),
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 20),
                    for (final entry in topics.entries)
                      Material(
                        type: MaterialType.transparency,
                        child: CheckboxListTile(
                          contentPadding: EdgeInsets.zero,
                          controlAffinity: ListTileControlAffinity.leading,
                          value: selected.contains(entry.key),
                          title: Text(
                            context.tr(entry.value.$1, entry.value.$2),
                          ),
                          onChanged: (value) => setState(() {
                            value == true
                                ? selected.add(entry.key)
                                : selected.remove(entry.key);
                          }),
                        ),
                      ),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: finish,
                      child: Text(
                        context.tr('Продолжить в чат', 'Continue to chat'),
                      ),
                    ),
                    TextButton(
                      onPressed: () => context.app.finishOnboarding(),
                      child: Text(
                        context.tr('Может быть позже', 'Maybe later'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
