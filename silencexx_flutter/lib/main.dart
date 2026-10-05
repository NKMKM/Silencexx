import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'core/api.dart';
import 'core/app_state.dart';
import 'core/theme.dart';
import 'core/theme/app_spacing.dart';
import 'screens/auth_screen.dart';
import 'screens/disclaimer_screen.dart';
import 'screens/home_screen.dart';
import 'screens/wellness_onboarding_screen.dart';
import 'widgets/common.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final state = AppState(
    api: Api(),
    preferences: await SharedPreferences.getInstance(),
  );
  runApp(SilenceApp(state: state));
  await state.restore();
}

class SilenceApp extends StatelessWidget {
  const SilenceApp({super.key, required this.state});
  final AppState state;
  @override
  Widget build(BuildContext context) => AppScope(
    state: state,
    child: ListenableBuilder(
      listenable: state,
      builder: (context, _) => MaterialApp(
        title: 'CloudMind',
        debugShowCheckedModeBanner: false,
        builder: (context, child) =>
            CosmicBackdrop(child: child ?? const SizedBox.shrink()),
        theme: auroraTheme(Brightness.light),
        darkTheme: auroraTheme(Brightness.dark),
        themeMode: state.themeMode,
        locale: Locale(state.language),
        supportedLocales: const [Locale('ru'), Locale('en')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        home: !state.ready
            ? Scaffold(
                body: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(18),
                        child: Image.asset(
                          'assets/images/cloudmind_icon.png',
                          width: 60,
                          height: 60,
                          fit: BoxFit.cover,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      const Text('CloudMind'),
                      const SizedBox(height: AppSpacing.xl),
                      const AppSkeleton(width: 140, height: 6),
                    ],
                  ),
                ),
              )
            : state.startupError != null
            ? Scaffold(
                body: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.xl),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(state.startupError!, textAlign: TextAlign.center),
                        const SizedBox(height: AppSpacing.lg),
                        FilledButton(
                          onPressed: state.restore,
                          child: Text(state.tr('Повторить', 'Retry')),
                        ),
                        TextButton(
                          onPressed: () {
                            state.startupError = null;
                            state.expireSession();
                          },
                          child: Text(
                            state.tr('Войти заново', 'Sign in again'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            : AnimatedSwitcher(
                duration: const Duration(milliseconds: 360),
                switchInCurve: Curves.easeOutCubic,
                switchOutCurve: Curves.easeInCubic,
                transitionBuilder: (child, animation) => FadeTransition(
                  opacity: animation,
                  child: SlideTransition(
                    position: Tween<Offset>(
                      begin: const Offset(.025, 0),
                      end: Offset.zero,
                    ).animate(animation),
                    child: child,
                  ),
                ),
                child: !state.disclaimerAccepted
                    ? const DisclaimerScreen(key: ValueKey('disclaimer'))
                    : state.authenticated
                    ? state.needsOnboarding
                          ? const WellnessOnboardingScreen(
                              key: ValueKey('wellness-onboarding'),
                            )
                          : const HomeScreen(key: ValueKey('chat'))
                    : const AuthScreen(key: ValueKey('auth')),
              ),
      ),
    ),
  );
}
