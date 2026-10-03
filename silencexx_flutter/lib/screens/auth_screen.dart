import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import '../core/api.dart';
import '../core/app_state.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_gradients.dart';
import '../core/theme/app_radius.dart';
import '../core/theme/app_shadows.dart';
import '../core/theme/app_spacing.dart';
import '../widgets/common.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final form = GlobalKey<FormState>();
  final contact = TextEditingController();
  final name = TextEditingController();
  final password = TextEditingController();
  final code = TextEditingController();
  bool register = false, phone = false, otp = false, accepted = false;
  @override
  void dispose() {
    contact.dispose();
    name.dispose();
    password.dispose();
    code.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (!form.currentState!.validate()) return;
    final app = context.app;
    if (register && !accepted && !otp) {
      throw ApiException(
        context.tr(
          'Примите условия использования.',
          'Please accept the terms.',
        ),
      );
    }
    final response = await app.api.call(
      otp
          ? '/auth/verify-otp'
          : register
          ? '/auth/register'
          : '/auth/login',
      method: 'POST',
      body: otp
          ? {'contact': contact.text.trim(), 'code': code.text.trim()}
          : {
              'method': phone ? 'phone' : 'email',
              'contact': contact.text.trim(),
              if (register) 'name': name.text.trim(),
              'password': password.text,
            },
    );
    if (response['requiresOTP'] == true) {
      if (mounted) setState(() => otp = true);
    } else {
      await app.acceptAuth(response);
    }
  }

  Future<void> google() async {
    const clientId = String.fromEnvironment('GOOGLE_CLIENT_ID');
    const serverId = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');
    final app = context.app;
    final account = await GoogleSignIn(
      clientId: clientId.isEmpty ? null : clientId,
      serverClientId: serverId.isEmpty ? null : serverId,
      scopes: ['email', 'profile'],
    ).signIn();
    if (account == null) return;
    final auth = await account.authentication;
    if (auth.idToken == null) {
      throw const ApiException('Google did not return an ID token');
    }
    await app.acceptAuth(
      await app.api.call(
        '/auth/oauth/google',
        method: 'POST',
        body: {
          'idToken': auth.idToken,
          'email': account.email,
          'name': account.displayName,
          'googleId': account.id,
        },
      ),
    );
  }

  Future<void> apple() async {
    final app = context.app;
    final credential = await SignInWithApple.getAppleIDCredential(
      scopes: [
        AppleIDAuthorizationScopes.email,
        AppleIDAuthorizationScopes.fullName,
      ],
    );
    await app.acceptAuth(
      await app.api.call(
        '/auth/oauth/apple',
        method: 'POST',
        body: {
          'identityToken': credential.identityToken,
          'appleId': credential.userIdentifier,
          'email': credential.email,
          'name': '${credential.givenName ?? ''} ${credential.familyName ?? ''}'
              .trim(),
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 460),
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Form(
              key: form,
              child: Container(
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(AppRadius.xxl),
                  gradient: AppGradients.card,
                  border: Border.all(color: AppColors.border),
                  boxShadow: AppShadows.ambient,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Container(
                        width: 62,
                        height: 62,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          boxShadow: AppShadows.accent,
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          child: Image.asset(
                            'assets/images/cloudmind_icon.png',
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Text(
                      'CloudMind',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineLarge,
                    ),
                    Text(
                      context.tr(
                        'Твой спокойный разум',
                        'A little space for peace',
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: AppSpacing.xxl),
                    Text(
                      otp
                          ? context.tr('Код подтверждения', 'Verification code')
                          : register
                          ? context.tr('Создать аккаунт', 'Create account')
                          : context.tr('С возвращением', 'Welcome back'),
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    if (!otp) ...[
                      SegmentedButton<bool>(
                        segments: const [
                          ButtonSegment(value: false, label: Text('Email')),
                          ButtonSegment(value: true, icon: Icon(Icons.phone)),
                        ],
                        selected: {phone},
                        onSelectionChanged: (v) =>
                            setState(() => phone = v.first),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      if (register) ...[
                        TextFormField(
                          controller: name,
                          decoration: InputDecoration(
                            labelText: context.tr('Имя', 'Name'),
                          ),
                          validator: (v) => (v?.trim().length ?? 0) < 2
                              ? context.tr(
                                  'Минимум 2 символа',
                                  'At least 2 characters',
                                )
                              : null,
                        ),
                        const SizedBox(height: 12),
                      ],
                      TextFormField(
                        controller: contact,
                        keyboardType: phone
                            ? TextInputType.phone
                            : TextInputType.emailAddress,
                        autofillHints: [
                          phone
                              ? AutofillHints.telephoneNumber
                              : AutofillHints.email,
                        ],
                        decoration: InputDecoration(
                          labelText: phone
                              ? context.tr('Телефон', 'Phone')
                              : 'Email',
                        ),
                        validator: (v) =>
                            v == null ||
                                (phone
                                    ? !RegExp(
                                        r'^\+?[0-9\s()-]{7,}$',
                                      ).hasMatch(v)
                                    : !RegExp(
                                        r'^\S+@\S+\.\S+$',
                                      ).hasMatch(v.trim()))
                            ? context.tr(
                                'Проверьте адрес или номер',
                                'Check your email or phone number',
                              )
                            : null,
                      ),
                      const SizedBox(height: 12),
                      if (!phone || register)
                        TextFormField(
                          controller: password,
                          obscureText: true,
                          autofillHints: [
                            register
                                ? AutofillHints.newPassword
                                : AutofillHints.password,
                          ],
                          decoration: InputDecoration(
                            labelText: context.tr('Пароль', 'Password'),
                          ),
                          validator: (v) =>
                              (v?.length ?? 0) < (register ? 8 : 1)
                              ? context.tr(
                                  'Введите пароль (при регистрации от 8 символов)',
                                  'Enter password (8+ characters for registration)',
                                )
                              : null,
                        ),
                      if (register)
                        CheckboxListTile(
                          contentPadding: EdgeInsets.zero,
                          value: accepted,
                          onChanged: (v) => setState(() => accepted = v!),
                          title: Text(
                            context.tr(
                              'Я понимаю: приложение не заменяет профессиональную помощь.',
                              'I understand this app does not replace professional care.',
                            ),
                          ),
                        ),
                    ] else ...[
                      Text(contact.text),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: code,
                        keyboardType: TextInputType.number,
                        autofillHints: const [AutofillHints.oneTimeCode],
                        decoration: InputDecoration(
                          labelText: context.tr('Код из SMS', 'SMS code'),
                        ),
                        validator: (v) => (v?.length ?? 0) != 6
                            ? context.tr('Введите 6 цифр', 'Enter 6 digits')
                            : null,
                      ),
                      ActionButton(
                        label: context.tr(
                          'Отправить код повторно',
                          'Resend code',
                        ),
                        action: () async {
                          await context.app.api.call(
                            '/auth/resend-otp',
                            method: 'POST',
                            body: {'contact': contact.text.trim()},
                          );
                        },
                      ),
                    ],
                    const SizedBox(height: 20),
                    ActionButton(
                      label: otp
                          ? context.tr('Подтвердить', 'Verify')
                          : register
                          ? context.tr('Зарегистрироваться', 'Register')
                          : context.tr('Войти', 'Sign in'),
                      action: submit,
                    ),
                    TextButton(
                      onPressed: () => setState(() {
                        otp = false;
                        register = !register;
                      }),
                      child: Text(
                        register
                            ? context.tr(
                                'Уже есть аккаунт? Войти',
                                'Already registered? Sign in',
                              )
                            : context.tr('Создать аккаунт', 'Create account'),
                      ),
                    ),
                    if (!register && !otp)
                      TextButton(
                        onPressed: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const ResetPasswordScreen(),
                          ),
                        ),
                        child: Text(
                          context.tr('Забыли пароль?', 'Forgot password?'),
                        ),
                      ),
                    if (!kIsWeb &&
                        const bool.fromEnvironment('ENABLE_GOOGLE_SIGN_IN'))
                      ActionButton(
                        label: 'Google',
                        action: google,
                        icon: Icons.login,
                      ),
                    if (!kIsWeb &&
                        defaultTargetPlatform == TargetPlatform.iOS &&
                        const bool.fromEnvironment('ENABLE_APPLE_SIGN_IN'))
                      ActionButton(
                        label: 'Apple',
                        action: apple,
                        icon: Icons.apple,
                      ),
                    TextButton(
                      onPressed: () => context.app.setLanguage(
                        context.app.language == 'ru' ? 'en' : 'ru',
                      ),
                      child: const Text('Русский / English'),
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

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key});
  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final email = TextEditingController(),
      token = TextEditingController(),
      password = TextEditingController();
  bool sent = false;
  @override
  void dispose() {
    email.dispose();
    token.dispose();
    password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(context.tr('Восстановление пароля', 'Reset password')),
    ),
    body: PageBody(
      children: [
        SectionCard(
          child: Column(
            children: [
              TextField(
                controller: email,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Email'),
              ),
              const SizedBox(height: AppSpacing.md),
              ActionButton(
                label: context.tr('Получить письмо', 'Send reset email'),
                action: () async {
                  await context.app.api.call(
                    '/auth/request-password-reset',
                    method: 'POST',
                    body: {'email': email.text.trim()},
                  );
                  if (mounted) setState(() => sent = true);
                },
              ),
              if (sent) ...[
                const SizedBox(height: 20),
                Text(
                  context.tr(
                    'Если адрес зарегистрирован, письмо отправлено. Вставьте токен из ссылки в письме.',
                    'If the address is registered, an email has been sent. Paste the token from its reset link.',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: token,
                  decoration: InputDecoration(
                    labelText: context.tr('Токен', 'Token'),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: password,
                  obscureText: true,
                  decoration: InputDecoration(
                    labelText: context.tr('Новый пароль', 'New password'),
                  ),
                ),
                const SizedBox(height: 16),
                ActionButton(
                  label: context.tr('Сохранить пароль', 'Save password'),
                  action: () async {
                    if (password.text.length < 8 || token.text.trim().isEmpty) {
                      throw ApiException(
                        context.tr(
                          'Введите токен и пароль от 8 символов.',
                          'Enter a token and a password of at least 8 characters.',
                        ),
                      );
                    }
                    await context.app.api.call(
                      '/auth/reset-password-with-token',
                      method: 'POST',
                      body: {
                        'token': token.text.trim(),
                        'newPassword': password.text,
                      },
                    );
                    if (context.mounted) Navigator.pop(context);
                  },
                ),
              ],
            ],
          ),
        ),
      ],
    ),
  );
}
