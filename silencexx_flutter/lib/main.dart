import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'core/api.dart';
import 'core/app_state.dart';
import 'core/theme.dart';
import 'core/theme/app_colors.dart';
import 'core/theme/app_spacing.dart';
import 'screens/auth_screen.dart';
import 'screens/home_screen.dart';

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
        title: 'SilenceXX',
        debugShowCheckedModeBanner: false,
        builder: (context, child) =>
            CosmicBackdrop(child: child ?? const SizedBox.shrink()),
        theme: auroraTheme(Brightness.light),
        darkTheme: auroraTheme(Brightness.dark),
        themeMode: state.themeMode,
        locale: Locale(state.language),
        supportedLocales: const [Locale('ru'), Locale('en')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        key: ValueKey(state.authenticated),
        home: !state.ready
            ? const Scaffold(
                body: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.auto_awesome,
                        size: 52,
                        color: AppColors.primaryBright,
                      ),
                      SizedBox(height: AppSpacing.md),
                      Text('SilenceXX'),
                      SizedBox(height: AppSpacing.xl),
                      SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(strokeWidth: 2.2),
                      ),
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
            : state.authenticated
            ? const HomeScreen()
            : const AuthScreen(),
      ),
    ),
  );
}
