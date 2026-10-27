import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'core/api.dart';
import 'core/app_state.dart';
import 'core/theme.dart';
import 'core/theme/app_motion.dart';
import 'screens/auth_screen.dart';
import 'screens/disclaimer_screen.dart';
import 'screens/home_screen.dart';
import 'screens/wellness_onboarding_screen.dart';
import 'widgets/common.dart';
import 'widgets/studio.dart';

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
        theme: auroraTheme(Brightness.light),
        darkTheme: auroraTheme(Brightness.dark),
        themeMode: state.themeMode,
        locale: Locale(state.language),
        supportedLocales: const [Locale('ru'), Locale('en')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        home: !state.ready
            ? Scaffold(
                body: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(28),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 360),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Center(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(20),
                              child: Image.asset(
                                'assets/images/cloudmind_icon.png',
                                width: 68,
                                height: 68,
                              ),
                            ),
                          ),
                          const SizedBox(height: 22),
                          Text(
                            'CloudMind',
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            state.tr(
                              'Ваше пространство рядом',
                              'Your space is here',
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 28),
                          const AppSkeleton(height: 3),
                        ],
                      ),
                    ),
                  ),
                ),
              )
            : state.startupError != null
            ? Scaffold(
                body: Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 440),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          AppEmptyState(
                            icon: Icons.cloud_off_rounded,
                            title: state.tr(
                              'Не удалось открыть приложение',
                              'Could not open the app',
                            ),
                            description: state.tr(
                              'Попробуйте подключиться ещё раз или войдите в аккаунт заново.',
                              'Try connecting again or sign in to your account again.',
                            ),
                          ),
                          ActionButton(
                            label: state.tr('Повторить', 'Retry'),
                            icon: Icons.refresh_rounded,
                            action: state.restore,
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
                          StudioDisclosure(
                            title: Text(
                              state.tr('Подробности ошибки', 'Error details'),
                            ),
                            children: [SelectableText(state.startupError!)],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              )
            : Builder(
                builder: (context) => AnimatedSwitcher(
                  duration: MediaQuery.disableAnimationsOf(context)
                      ? Duration.zero
                      : AppMotion.screen,
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
    ),
  );
}
