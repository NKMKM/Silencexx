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
  final formKey = GlobalKey<FormState>();
  final email = TextEditingController();
  final nickname = TextEditingController();
  final password = TextEditingController();
  final confirmation = TextEditingController();
  bool registerMode = true;
  bool loading = false;
  bool obscurePassword = true;
  bool obscureConfirmation = true;
  String? provider;

  @override
  void dispose() {
    email.dispose();
    nickname.dispose();
    password.dispose();
    confirmation.dispose();
    super.dispose();
  }

  bool get hasLower => RegExp(r'[a-z]').hasMatch(password.text);
  bool get hasUpper => RegExp(r'[A-Z]').hasMatch(password.text);
  bool get hasDigit => RegExp(r'[0-9]').hasMatch(password.text);
  bool get hasLength => password.text.length >= 8 && password.text.length <= 72;
  bool get hasAllowedChars => RegExp(r'^[\x21-\x7E]*$').hasMatch(password.text);
  bool get passwordReady =>
      hasLength && hasLower && hasUpper && hasDigit && hasAllowedChars;

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
      if (mounted) showError(context, error);
    } finally {
      if (mounted) {
        setState(() {
          loading = false;
          provider = null;
        });
      }
    }
  }

  Future<void> submitEmail() async {
    if (!(formKey.currentState?.validate() ?? false)) return;
    final auth = AuthService(context.app);
    await authenticate(
      'email',
      () => registerMode
          ? auth.registerWithEmail(
              email: email.text,
              nickname: nickname.text,
              password: password.text,
            )
          : auth.signInWithEmail(email: email.text, password: password.text),
    );
  }

  void toggleMode() {
    FocusScope.of(context).unfocus();
    formKey.currentState?.reset();
    setState(() {
      registerMode = !registerMode;
      password.clear();
      confirmation.clear();
    });
  }

  String? validateEmail(String? value) {
    final candidate = value?.trim() ?? '';
    if (candidate.isEmpty) {
      return context.tr('Введите email', 'Enter your email');
    }
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$').hasMatch(candidate)) {
      return context.tr(
        'Проверьте формат email',
        'Enter a valid email address',
      );
    }
    return null;
  }

  String? validateNickname(String? value) {
    final candidate = value?.trim() ?? '';
    if (candidate.isEmpty) {
      return context.tr('Придумайте никнейм', 'Choose a nickname');
    }
    if (!RegExp(
      r'^[\p{L}\p{N}_.-]{3,24}$',
      unicode: true,
    ).hasMatch(candidate)) {
      return context.tr(
        '3–24 символа: буквы, цифры, точка, дефис или _',
        '3–24 characters: letters, numbers, dot, hyphen or _',
      );
    }
    return null;
  }

  String? validatePassword(String? value) {
    if ((value ?? '').isEmpty) {
      return context.tr('Введите пароль', 'Enter a password');
    }
    if (!registerMode) return null;
    if (!passwordReady) {
      return context.tr(
        'Пароль пока не соответствует условиям',
        'Password does not meet the requirements yet',
      );
    }
    return null;
  }

  InputDecoration decoration(String label, {Widget? suffixIcon}) =>
      InputDecoration(
        labelText: label,
        suffixIcon: suffixIcon,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(
            color: Theme.of(context).colorScheme.outlineVariant,
          ),
        ),
      );

  Widget passwordRule(String label, bool valid) => Padding(
    padding: const EdgeInsets.only(top: 6),
    child: Row(
      children: [
        Icon(
          valid ? Icons.check_circle : Icons.circle_outlined,
          size: 16,
          color: valid
              ? Theme.of(context).colorScheme.primary
              : Theme.of(context).colorScheme.outline,
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(label, style: Theme.of(context).textTheme.bodySmall),
        ),
      ],
    ),
  );

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
                        context.tr(
                          registerMode
                              ? 'Создайте своё пространство'
                              : 'С возвращением',
                          registerMode ? 'Create your space' : 'Welcome back',
                        ),
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
                      const SizedBox(height: 24),
                      Form(
                        key: formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            TextFormField(
                              controller: email,
                              keyboardType: TextInputType.emailAddress,
                              autofillHints: const [AutofillHints.email],
                              textInputAction: registerMode
                                  ? TextInputAction.next
                                  : TextInputAction.next,
                              decoration: decoration(
                                context.tr('Email', 'Email'),
                              ),
                              validator: validateEmail,
                            ),
                            if (registerMode) ...[
                              const SizedBox(height: 14),
                              TextFormField(
                                controller: nickname,
                                textCapitalization: TextCapitalization.none,
                                textInputAction: TextInputAction.next,
                                autofillHints: const [AutofillHints.nickname],
                                decoration: decoration(
                                  context.tr('Никнейм', 'Nickname'),
                                ),
                                validator: validateNickname,
                              ),
                            ],
                            const SizedBox(height: 14),
                            TextFormField(
                              controller: password,
                              obscureText: obscurePassword,
                              autofillHints: [
                                registerMode
                                    ? AutofillHints.newPassword
                                    : AutofillHints.password,
                              ],
                              textInputAction: registerMode
                                  ? TextInputAction.next
                                  : TextInputAction.done,
                              onChanged: (_) => setState(() {}),
                              onFieldSubmitted: (_) {
                                if (!registerMode) submitEmail();
                              },
                              decoration: decoration(
                                context.tr('Пароль', 'Password'),
                                suffixIcon: IconButton(
                                  tooltip: obscurePassword
                                      ? context.tr(
                                          'Показать пароль',
                                          'Show password',
                                        )
                                      : context.tr(
                                          'Скрыть пароль',
                                          'Hide password',
                                        ),
                                  onPressed: () => setState(
                                    () => obscurePassword = !obscurePassword,
                                  ),
                                  icon: Icon(
                                    obscurePassword
                                        ? Icons.visibility_outlined
                                        : Icons.visibility_off_outlined,
                                  ),
                                ),
                              ),
                              validator: validatePassword,
                            ),
                            if (registerMode) ...[
                              const SizedBox(height: 8),
                              Text(
                                context.tr(
                                  'Пароль должен содержать:',
                                  'Your password needs:',
                                ),
                                style: Theme.of(context).textTheme.labelLarge,
                              ),
                              passwordRule(
                                context.tr(
                                  'от 8 до 72 символов',
                                  '8 to 72 characters',
                                ),
                                hasLength,
                              ),
                              passwordRule(
                                context.tr(
                                  'строчную и заглавную латинские буквы',
                                  'lowercase and uppercase letters',
                                ),
                                hasLower && hasUpper,
                              ),
                              passwordRule(
                                context.tr(
                                  'хотя бы одну цифру',
                                  'at least one number',
                                ),
                                hasDigit,
                              ),
                              passwordRule(
                                context.tr(
                                  'без пробелов и кириллицы',
                                  'no spaces or non-Latin characters',
                                ),
                                hasAllowedChars,
                              ),
                              const SizedBox(height: 14),
                              TextFormField(
                                controller: confirmation,
                                obscureText: obscureConfirmation,
                                autofillHints: const [
                                  AutofillHints.newPassword,
                                ],
                                textInputAction: TextInputAction.done,
                                onFieldSubmitted: (_) => submitEmail(),
                                decoration: decoration(
                                  context.tr(
                                    'Повторите пароль',
                                    'Confirm password',
                                  ),
                                  suffixIcon: IconButton(
                                    tooltip: obscureConfirmation
                                        ? context.tr(
                                            'Показать пароль',
                                            'Show password',
                                          )
                                        : context.tr(
                                            'Скрыть пароль',
                                            'Hide password',
                                          ),
                                    onPressed: () => setState(
                                      () => obscureConfirmation =
                                          !obscureConfirmation,
                                    ),
                                    icon: Icon(
                                      obscureConfirmation
                                          ? Icons.visibility_outlined
                                          : Icons.visibility_off_outlined,
                                    ),
                                  ),
                                ),
                                validator: (value) {
                                  if ((value ?? '').isEmpty) {
                                    return context.tr(
                                      'Повторите пароль',
                                      'Confirm your password',
                                    );
                                  }
                                  if (value != password.text) {
                                    return context.tr(
                                      'Пароли не совпадают',
                                      'Passwords do not match',
                                    );
                                  }
                                  return null;
                                },
                              ),
                            ],
                            const SizedBox(height: 18),
                            SizedBox(
                              height: 54,
                              child: FilledButton(
                                onPressed: loading ? null : submitEmail,
                                child: Text(
                                  context.tr(
                                    registerMode
                                        ? 'Создать аккаунт'
                                        : 'Войти по email',
                                    registerMode
                                        ? 'Create account'
                                        : 'Sign in with email',
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextButton(
                        onPressed: loading ? null : toggleMode,
                        child: Text(
                          context.tr(
                            registerMode
                                ? 'У меня уже есть аккаунт'
                                : 'Нет аккаунта? Зарегистрироваться',
                            registerMode
                                ? 'I already have an account'
                                : 'No account? Create one',
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Expanded(child: Divider()),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            child: Text(context.tr('или', 'or')),
                          ),
                          const Expanded(child: Divider()),
                        ],
                      ),
                      const SizedBox(height: 14),
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
                      const SizedBox(height: 24),
                      const Divider(),
                      const SizedBox(height: 12),
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
                      const SizedBox(height: 14),
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
