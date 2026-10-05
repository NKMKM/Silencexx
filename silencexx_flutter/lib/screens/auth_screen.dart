import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import '../core/auth_service.dart';
import '../core/app_state.dart';
import '../core/theme/app_spacing.dart';
import '../widgets/common.dart';
import '../widgets/design.dart';
import '../widgets/glass.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool loading = false;
  String? provider;

  Future<void> authenticate(String name, Future<void> Function() action) async {
    if (loading) return;
    setState(() {
      loading = true;
      provider = name;
    });
    try {
      await action();
    } on SignInWithAppleAuthorizationException catch (error) {
      if (error.code != AuthorizationErrorCode.canceled && mounted) {
        showError(context, error);
      }
    } catch (error) {
      if (mounted) {
        showError(context, error);
      }
    } finally {
      if (mounted) {
        setState(() {
          loading = false;
          provider = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = AuthService(context.app);
    final appleAvailable =
        !kIsWeb && defaultTargetPlatform == TargetPlatform.iOS;
    return Scaffold(
      body: SafeArea(
        child: AuthFrame(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: PageReveal(
                child: GlassSurface(
                  radius: 32,
                  opacity: .68,
                  blur: 16,
                  padding: const EdgeInsets.fromLTRB(28, 32, 28, 28),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Center(
                        child: QuietOrbit(
                          size: 88,
                          child: Icon(Icons.auto_awesome_outlined, size: 26),
                        ),
                      ),
                      const SizedBox(height: 18),
                      Text(
                        context.tr('С возвращением', 'Welcome back'),
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        context.tr(
                          'Здесь можно спокойно подумать, поделиться и поговорить.',
                          'A calmer space to think, reflect and talk.',
                        ),
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                      const SizedBox(height: 28),
                      if (appleAvailable) ...[
                        SizedBox(
                          height: 54,
                          child: SignInWithAppleButton(
                            onPressed: loading
                                ? () {}
                                : () => authenticate(
                                    'apple',
                                    auth.signInWithApple,
                                  ),
                            text: context.tr(
                              'Продолжить с Apple',
                              'Continue with Apple',
                            ),
                            style:
                                Theme.of(context).brightness == Brightness.dark
                                ? SignInWithAppleButtonStyle.white
                                : SignInWithAppleButtonStyle.black,
                            borderRadius: const BorderRadius.all(
                              Radius.circular(16),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],
                      SizedBox(
                        height: 54,
                        child: OutlinedButton.icon(
                          onPressed: loading
                              ? null
                              : () => authenticate(
                                  'google',
                                  auth.signInWithGoogle,
                                ),
                          icon: const _GoogleMark(),
                          label: Text(
                            context.tr(
                              'Продолжить с Google',
                              'Continue with Google',
                            ),
                          ),
                          style: OutlinedButton.styleFrom(
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                        ),
                      ),
                      if (loading) ...[
                        const SizedBox(height: 18),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const SizedBox.square(
                              dimension: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              context.tr(
                                'Подключаем ${provider ?? ''}…',
                                'Connecting to ${provider ?? ''}…',
                              ),
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: 28),
                      const Divider(),
                      const SizedBox(height: 14),
                      Text(
                        context.tr(
                          'О ваших разговорах',
                          'About your conversations',
                        ),
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        context.tr(
                          'Сообщения передаются серверу приложения для формирования ответов и могут сохраняться в истории аккаунта.',
                          'Messages are sent to the app’s server to generate replies and may be saved in your account history.',
                        ),
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        context.tr(
                          'Продолжая, вы принимаете ограничения приложения, показанные перед входом. Информация о них также доступна в настройках.',
                          'By continuing, you acknowledge the app limitations shown before sign-in. You can review them again in Settings.',
                        ),
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.labelSmall,
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
}

class _GoogleMark extends StatelessWidget {
  const _GoogleMark();
  @override
  Widget build(BuildContext context) => const Text(
    'G',
    style: TextStyle(
      fontWeight: FontWeight.w700,
      fontSize: 20,
      color: Color(0xff4285F4),
    ),
  );
}
