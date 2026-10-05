import 'package:flutter/material.dart';
import '../core/app_state.dart';
import '../core/theme/app_spacing.dart';
import '../widgets/common.dart';
import '../widgets/design.dart';
import '../widgets/glass.dart';

class DisclaimerScreen extends StatefulWidget {
  const DisclaimerScreen({super.key});
  @override
  State<DisclaimerScreen> createState() => _DisclaimerScreenState();
}

class _DisclaimerScreenState extends State<DisclaimerScreen> {
  bool saving = false;
  Future<void> continueToApp() async {
    setState(() => saving = true);
    try {
      await context.app.acceptDisclaimer();
    } catch (error) {
      if (mounted) showError(context, error);
      if (mounted) setState(() => saving = false);
    }
  }

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
                radius: 32,
                opacity: .76,
                blur: 18,
                padding: const EdgeInsets.fromLTRB(28, 32, 28, 28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Center(
                      child: QuietOrbit(
                        size: 100,
                        child: Icon(Icons.auto_awesome_outlined, size: 28),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      context.tr(
                        'Твоё пространство для себя',
                        'Your mental wellness companion',
                      ),
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      context.tr(
                        'Спокойное место для размышлений, эмоционального благополучия и обычных разговоров.',
                        'A calm space for reflection, emotional well-being and everyday conversations.',
                      ),
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 24),
                    const Divider(),
                    const SizedBox(height: 18),
                    Text(
                      context.tr('Важно знать', 'A note about this app'),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      context.tr(
                        'Ответы создаёт ИИ. Это приложение не оказывает медицинскую помощь, не ставит диагнозы и не заменяет врача, психолога или другую квалифицированную помощь.',
                        'AI responses are not medical advice. This app does not diagnose or treat health conditions and is not a replacement for a doctor or qualified mental health professional.',
                      ),
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      context.tr(
                        'Если тебе угрожает непосредственная опасность, обратись в местную экстренную службу или к доступному кризисному ресурсу.',
                        'If you are in immediate danger, contact your local emergency service or an available crisis resource.',
                      ),
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: saving ? null : continueToApp,
                      child: saving
                          ? const SizedBox.square(
                              dimension: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(context.tr('Продолжить', 'Continue')),
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
