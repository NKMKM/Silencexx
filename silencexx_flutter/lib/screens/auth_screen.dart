import '../widgets/studio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import '../core/auth_service.dart';
import '../core/app_state.dart';
import '../widgets/common.dart';
import '../widgets/design.dart';

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
  bool get hasAllowedChars =>
      password.text.isNotEmpty &&
      RegExp(r'^[\x21-\x7E]*$').hasMatch(password.text);
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
      InputDecoration(labelText: label, suffixIcon: suffixIcon);

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
    final intro = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const StudioGlyph(Icons.blur_on_rounded, size: 38),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'CloudMind',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        StudioHeader(
          title: context.tr(
            registerMode ? 'Создайте своё пространство' : 'С возвращением',
            registerMode ? 'Create your space' : 'Welcome back',
          ),
          description: context.tr(
            'Разговоры. Мысли. Время для себя.',
            'Conversations. Reflections. Time for you.',
          ),
        ),
      ],
    );
    final form = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        StudioTabs<bool>(
          segments: [
            ButtonSegment(
              value: true,
              label: Text(context.tr('Регистрация', 'Create account')),
            ),
            ButtonSegment(
              value: false,
              label: Text(context.tr('Вход', 'Sign in')),
            ),
          ],
          selected: {registerMode},
          onSelectionChanged: loading
              ? null
              : (values) {
                  if (values.first != registerMode) toggleMode();
                },
        ),
        const SizedBox(height: 24),
        if (appleAvailable) ...[
          SizedBox(
            height: 54,
            child: AnimatedOpacity(
              opacity: loading ? .45 : 1,
              duration: studioDuration(context),
              child: IgnorePointer(
                ignoring: loading,
                child: SignInWithAppleButton(
                  onPressed: loading
                      ? () {}
                      : () => authenticate('apple', auth.signInWithApple),
                  text: context.tr('Продолжить с Apple', 'Continue with Apple'),
                  style: Theme.of(context).brightness == Brightness.dark
                      ? SignInWithAppleButtonStyle.white
                      : SignInWithAppleButtonStyle.black,
                  borderRadius: const BorderRadius.all(Radius.circular(16)),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],
        ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 54),
          child: OutlinedButton.icon(
            onPressed: loading
                ? null
                : () => authenticate('google', auth.signInWithGoogle),
            icon: const _GoogleMark(),
            label: Text(
              context.tr('Продолжить с Google', 'Continue with Google'),
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

        const SizedBox(height: 18),
        Row(
          children: [
            const Expanded(child: Divider()),
            const SizedBox(width: 12),
            Flexible(
              child: Text(
                context.tr('или по email', 'or with email'),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.labelSmall,
              ),
            ),
            const SizedBox(width: 12),
            const Expanded(child: Divider()),
          ],
        ),
        const SizedBox(height: 18),
        Form(
          key: formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: email,
                autocorrect: false,
                enableSuggestions: false,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email],
                textInputAction: registerMode
                    ? TextInputAction.next
                    : TextInputAction.next,
                decoration: decoration(context.tr('Email', 'Email')),
                validator: validateEmail,
              ),
              if (registerMode) ...[
                const SizedBox(height: 14),
                TextFormField(
                  controller: nickname,
                  textCapitalization: TextCapitalization.none,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.nickname],
                  decoration: decoration(context.tr('Никнейм', 'Nickname')),
                  validator: validateNickname,
                ),
              ],
              const SizedBox(height: 14),
              TextFormField(
                controller: password,
                autocorrect: false,
                enableSuggestions: false,
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
                        ? context.tr('Показать пароль', 'Show password')
                        : context.tr('Скрыть пароль', 'Hide password'),
                    onPressed: () =>
                        setState(() => obscurePassword = !obscurePassword),
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
                StudioDisclosure(
                  title: Text(
                    context.tr('Требования к паролю', 'Password requirements'),
                  ),
                  children: [
                    passwordRule(
                      context.tr('от 8 до 72 символов', '8 to 72 characters'),
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
                      context.tr('хотя бы одну цифру', 'at least one number'),
                      hasDigit,
                    ),
                    passwordRule(
                      context.tr(
                        'без пробелов и кириллицы',
                        'no spaces or non-Latin characters',
                      ),
                      hasAllowedChars,
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: confirmation,
                  obscureText: obscureConfirmation,
                  autofillHints: const [AutofillHints.newPassword],
                  textInputAction: TextInputAction.done,
                  onFieldSubmitted: (_) => submitEmail(),
                  decoration: decoration(
                    context.tr('Повторите пароль', 'Confirm password'),
                    suffixIcon: IconButton(
                      tooltip: obscureConfirmation
                          ? context.tr('Показать пароль', 'Show password')
                          : context.tr('Скрыть пароль', 'Hide password'),
                      onPressed: () => setState(
                        () => obscureConfirmation = !obscureConfirmation,
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
                      registerMode ? 'Создать аккаунт' : 'Войти по email',
                      registerMode ? 'Create account' : 'Sign in with email',
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        StudioDisclosure(
          title: Text(
            context.tr('О ваших разговорах', 'About your conversations'),
          ),
          leading: const StudioGlyph(Icons.lock_outline_rounded, size: 30),
          expandedCrossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              context.tr(
                'Сообщения передаются серверу приложения для формирования ответов и могут сохраняться в истории аккаунта. Продолжая, вы принимаете ограничения приложения, показанные перед входом. Информация о них также доступна в настройках.',
                'Messages are sent to the app server to generate replies and may be saved in your account history. By continuing, you acknowledge the app limitations shown before sign-in. You can review them in Settings.',
              ),
            ),
          ],
        ),
      ],
    );
    return Scaffold(
      body: SafeArea(
        child: AuthFrame(
          child: SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.all(24),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 960),
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    if (constraints.maxWidth >= 720) {
                      return Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.only(
                                top: 32,
                                right: 56,
                              ),
                              child: intro,
                            ),
                          ),
                          Expanded(child: form),
                        ],
                      );
                    }
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [intro, const SizedBox(height: 4), form],
                    );
                  },
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
