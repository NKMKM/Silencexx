import '../widgets/studio.dart';
import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:image_picker/image_picker.dart';
import '../core/api.dart';
import '../core/app_state.dart';
import '../core/reminders.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_spacing.dart';
import '../widgets/common.dart';
import '../widgets/chat_visuals.dart';
import 'subscription_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  void open(Widget page) =>
      Navigator.push(context, MaterialPageRoute(builder: (_) => page));
  String get accountName {
    final raw = '${context.app.user?['name'] ?? 'CloudMind'}'.trim();
    return raw.isEmpty ? 'CloudMind' : raw;
  }

  Future<void> signOut() async {
    final app = context.app;
    if (await confirm(context, context.tr('Выйти из аккаунта?', 'Sign out?'))) {
      await app.logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final app = context.app;
    final shortcuts = [
      (
        Icons.workspace_premium_outlined,
        context.tr('Подписка и лимиты', 'Plan and usage'),
        const SubscriptionScreen(),
      ),
      (
        Icons.devices_outlined,
        context.tr('Устройства', 'Devices'),
        const SessionsScreen(),
      ),
      (
        Icons.lock_outline_rounded,
        context.tr('Приватность и данные', 'Privacy and data'),
        const PrivacyScreen(),
      ),
      (
        Icons.favorite_outline_rounded,
        context.tr('Безопасность и приложение', 'Safety and about'),
        const SafetyAboutScreen(),
      ),
    ];
    return PageBody(
      compact: true,
      children: [
        StudioHeader(
          eyebrow:
              'CLOUDMIND / ${context.tr('ВАШЕ ПРОСТРАНСТВО', 'YOUR SPACE')}',
          title: context.tr('Настройки', 'Settings'),
          action: IconButton(
            tooltip: context.tr('Выйти из аккаунта', 'Sign out'),
            onPressed: signOut,
            icon: const Icon(Icons.logout_rounded, size: 20),
          ),
        ),
        StudioPanel(
          tone: StudioTone.accent,
          padding: const EdgeInsets.all(10),
          child: StudioRow(
            leading: StudioAvatar(name: accountName),
            title: Text(accountName, style: t.textTheme.titleLarge),
            subtitle: Text(
              context.tr('Профиль и безопасность', 'Profile and security'),
            ),
            trailing: const Icon(Icons.arrow_outward_rounded),
            onTap: () => open(const ProfileScreen()),
          ),
        ),
        const SizedBox(height: 18),
        LayoutBuilder(
          builder: (context, constraints) {
            final columns =
                constraints.maxWidth >= 340 &&
                    MediaQuery.textScalerOf(context).scale(14) < 24
                ? 2
                : 1;
            return Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                for (final item in shortcuts)
                  SizedBox(
                    width:
                        (constraints.maxWidth - (columns - 1) * 10) / columns,
                    child: StudioPanel(
                      padding: const EdgeInsets.all(4),
                      radius: 18,
                      child: StudioRow(
                        leading: Icon(item.$1, size: 20),
                        title: Text(item.$2),
                        onTap: () => open(item.$3),
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
        const SizedBox(height: 24),
        Text(context.tr('Приложение', 'App'), style: t.textTheme.titleMedium),
        const SizedBox(height: 8),
        StudioRow(
          leading: const StudioGlyph(Icons.language_rounded, size: 34),
          title: Text(context.tr('Язык', 'Language')),
          trailing: Text(
            app.language == 'ru' ? 'Русский' : 'English',
            style: t.textTheme.bodySmall,
          ),
          onTap: () => open(const LanguageScreen()),
        ),
        StudioRow(
          leading: const StudioGlyph(
            Icons.notifications_none_rounded,
            size: 34,
          ),
          title: Text(context.tr('Напоминания', 'Reminders')),
          trailing: const Icon(Icons.chevron_right_rounded),
          onTap: () => open(const ReminderScreen()),
        ),
        const SizedBox(height: 14),
        StudioTabs<ThemeMode>(
          segments: [
            ButtonSegment(
              value: ThemeMode.system,
              label: Text(context.tr('Система', 'System')),
            ),
            ButtonSegment(
              value: ThemeMode.dark,
              label: Text(context.tr('Тёмная', 'Dark')),
            ),
            ButtonSegment(
              value: ThemeMode.light,
              label: Text(context.tr('Светлая', 'Light')),
            ),
          ],
          selected: {app.themeMode},
          onSelectionChanged: (values) async {
            try {
              await app.setTheme(values.first);
            } catch (error) {
              if (context.mounted) showError(context, error);
            }
          },
        ),
        const SizedBox(height: 18),
        Text(
          'CloudMind · 1.0.0',
          style: t.textTheme.labelSmall,
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}

class PrivacyScreen extends StatefulWidget {
  const PrivacyScreen({super.key});
  @override
  State<PrivacyScreen> createState() => _PrivacyScreenState();
}

class _PrivacyScreenState extends State<PrivacyScreen> {
  bool exporting = false;

  Future<void> deleteAccount() async {
    final app = context.app;
    if (!await confirm(
      context,
      context.tr(
        'Удалить аккаунт и связанные с ним данные? Это действие нельзя отменить.',
        'Permanently delete your account and linked data? This cannot be undone.',
      ),
    )) {
      return;
    }
    if (!mounted) return;
    try {
      await app.api.call('/auth/account', method: 'DELETE');
      await app.accountDeleted();
    } catch (error) {
      if (mounted) showError(context, error);
    }
  }

  Future<void> exportData() async {
    if (exporting) return;
    setState(() => exporting = true);
    try {
      final api = context.app.api;
      final profile = await api.call('/auth/profile');
      final conversations = <Json>[];
      var offset = 0;
      var total = 0;
      do {
        final page = await api.call('/chats/list?limit=100&offset=$offset');
        final chats = rows(page, 'chats');
        total = (page['total'] as num?)?.toInt() ?? chats.length;
        for (final chat in chats) {
          final id = (chat['id'] as num).toInt();
          final messages = await api.call('/chats/$id/messages');
          conversations.add({...chat, 'messages': rows(messages, 'messages')});
        }
        offset += chats.length;
        if (chats.isEmpty) break;
      } while (offset < total);
      final journalIndex = await api.call('/journal/list');
      final journal = <Json>[];
      for (final entry in rows(journalIndex, 'dates')) {
        final date = '${entry['date'] ?? ''}';
        if (date.isEmpty) continue;
        final record = await api.call(
          '/journal/entry?date=${Uri.encodeQueryComponent(date)}',
        );
        if (record['entry'] is Map) {
          journal.add(Map<String, dynamic>.from(record['entry'] as Map));
        }
      }
      final inbox = await api.call('/inbox/received');
      final supportHistory = await api.call('/panic/history');
      final payload = {
        'exportedAt': DateTime.now().toUtc().toIso8601String(),
        'scope':
            'profile, conversations, journal, received messages, and up to 20 support sessions exposed by the current account API',
        'profile': profile['user'],
        'conversations': conversations,
        'journal': journal,
        'receivedMessages': rows(inbox, 'messages'),
        'supportSessions': rows(supportHistory, 'sessions'),
      };
      if (mounted) {
        await shareChatText(
          context,
          const JsonEncoder.withIndent('  ').convert(payload),
        );
      }
    } catch (error) {
      if (mounted) showError(context, error);
    } finally {
      if (mounted) setState(() => exporting = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: StudioTopBar(
      title: Text(
        context.tr('Приватность и данные', 'Privacy and data controls'),
      ),
    ),
    body: PageBody(
      compact: true,
      children: [
        StudioHeader(
          eyebrow: context.tr('ВЫ УПРАВЛЯЕТЕ', 'YOU ARE IN CONTROL'),
          title: context.tr(
            'Ваши данные.\nВаши решения.',
            'Your data.\nYour choices.',
          ),
        ),
        StudioPanel(
          tone: StudioTone.accent,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const StudioGlyph(Icons.lock_outline_rounded, size: 42),
              const SizedBox(height: 16),
              Text(
                context.tr('О ваших разговорах', 'About your conversations'),
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 10),
              Text(
                context.tr(
                  'Сообщения передаются серверу приложения для создания ответов и могут храниться в истории аккаунта. Не отправляйте то, что не хотите передавать сервису.',
                  'Messages are sent to the app server to generate replies and may be stored in your account history. Avoid sharing information you do not want the service to receive.',
                ),
              ),
              const SizedBox(height: 12),
              StudioDisclosure(
                title: Text(
                  context.tr(
                    'Как обрабатываются сообщения',
                    'How conversations are handled',
                  ),
                ),
                children: [
                  Text(
                    context.tr(
                      'Для ответа текст отправляется на настроенный сервер приложения. История разговоров загружается и хранится в учётной записи. Этот интерфейс не обещает сквозное шифрование.',
                      'To generate a reply, message text is sent to the configured app server. Conversation history is stored with your account. This app does not claim end-to-end encryption.',
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 22),
        StudioHeader(
          title: context.tr('Сохраните свою копию', 'Keep your own copy'),
          description: context.tr(
            'Профиль, разговоры, дневник, входящие пожелания и последние сессии поддержки.',
            'Profile, conversations, journal, received messages and recent support sessions.',
          ),
        ),
        ActionButton(
          secondary: true,
          label: context.tr('Экспортировать данные', 'Export your data'),
          icon: Icons.ios_share_rounded,
          action: exportData,
        ),
        const SizedBox(height: 24),
        StudioPanel(
          tone: StudioTone.danger,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                context.tr('Удаление аккаунта', 'Delete account'),
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text(
                context.tr(
                  'Аккаунт и связанные записи удалятся без возможности восстановления.',
                  'Your account and linked records will be permanently removed.',
                ),
              ),
              const SizedBox(height: 12),
              ActionButton(
                destructive: true,
                label: context.tr('Удалить аккаунт', 'Delete account'),
                icon: Icons.delete_outline_rounded,
                action: deleteAccount,
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class SafetyAboutScreen extends StatelessWidget {
  const SafetyAboutScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: StudioTopBar(
      title: Text(context.tr('Безопасность и приложение', 'Safety and about')),
    ),
    body: PageBody(
      compact: true,
      children: [
        StudioHeader(
          eyebrow: 'CLOUDMIND / ${context.tr('О ПРИЛОЖЕНИИ', 'ABOUT')}',
          title: context.tr(
            'Тёплое место для разговора',
            'A welcoming place to talk',
          ),
          description: context.tr(
            'AI-компаньон для размышлений, эмоционального благополучия и обычных разговоров.',
            'An AI companion for reflection, emotional well-being and everyday conversations.',
          ),
        ),
        StudioNotice(
          icon: Icons.shield_outlined,
          message: context.tr(
            'Ответы создаёт ИИ. Это не медицинская помощь.',
            'Responses are generated by AI. This is not medical care.',
          ),
        ),
        const SizedBox(height: 18),
        StudioPanel(
          tone: StudioTone.accent,
          padding: const EdgeInsets.all(6),
          child: StudioRow(
            leading: const StudioGlyph(
              Icons.favorite_outline_rounded,
              size: 44,
            ),
            title: Text(context.tr('Поддержка рядом', 'Find support')),
            subtitle: Text(
              context.tr(
                'Если сейчас нужна помощь человека',
                'When you need someone by your side',
              ),
            ),
            trailing: const Icon(Icons.arrow_outward_rounded),
            onTap: () => showSupport(context),
          ),
        ),
        const SizedBox(height: 20),
        _SecurityFold(
          title: context.tr('Ограничения', 'Important limits'),
          children: [
            Text(
              context.tr(
                'Приложение не является медицинской службой, не ставит диагнозы и не лечит. Ответы ИИ не заменяют врача, психиатра, психолога или другую квалифицированную помощь.',
                'This app is not a medical service and does not diagnose or treat conditions. AI responses do not replace a doctor, psychiatrist, psychologist or other qualified professional.',
              ),
            ),
            const SizedBox(height: 14),
            Text(
              context.tr(
                'Если тебе угрожает непосредственная опасность, обратись в местную экстренную службу или к доступному кризисному ресурсу.',
                'If you are in immediate danger, contact your local emergency service or an available crisis resource.',
              ),
            ),
          ],
        ),
        StudioRow(
          leading: const StudioGlyph(Icons.info_outline_rounded, size: 34),
          title: Text(
            context.tr(
              'Прочитать полное уведомление',
              'Read the full app notice',
            ),
          ),
          trailing: const Icon(Icons.chevron_right_rounded),
          onTap: () => showAppDialog<void>(
            context: context,
            builder: (dialogContext) => AppDialog(
              icon: const StudioGlyph(Icons.info_outline_rounded),
              title: Text(
                context.tr(
                  'О mental wellness companion',
                  'About this companion',
                ),
              ),
              content: Text(
                context.tr(
                  'Приложение помогает размышлять и вести повседневные разговоры. Ответы создаёт ИИ. Это не медицинская помощь, приложение не ставит диагнозы и не заменяет врача, психолога или экстренную службу. При непосредственной опасности обратись в местную экстренную службу или к доступному кризисному ресурсу.',
                  'This app offers AI-powered support for reflection and everyday conversations. It is not medical advice, does not diagnose or treat conditions, and does not replace a doctor, qualified professional or emergency service. In immediate danger, contact your local emergency service or an available crisis resource.',
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogContext),
                  child: Text(context.tr('Понятно', 'Got it')),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 18),
        Text(
          'CloudMind · 1.0.0',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.labelSmall,
        ),
      ],
    ),
  );
}

class LanguageScreen extends StatelessWidget {
  const LanguageScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: StudioTopBar(
      title: Text(context.tr('Язык приложения', 'App language')),
    ),
    body: PageBody(
      children: [
        StudioHeader(
          title: context.tr('Понятно с первого слова', 'Feel at home'),
          description: context.tr(
            'Выберите язык интерфейса.',
            'Choose your interface language.',
          ),
        ),
        StudioPanel(
          tone: StudioTone.accent,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                context.tr('ПРЕДПРОСМОТР', 'PREVIEW'),
                style: Theme.of(context).textTheme.labelSmall,
              ),
              const SizedBox(height: 12),
              Text(
                context.tr(
                  'Можно начать с одной мысли.',
                  'You can start with a single thought.',
                ),
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ],
          ),
        ),
        const SizedBox(height: 22),
        _PreferenceSection(
          title: context.tr('Язык', 'Language'),
          children: [
            for (final entry in {'ru': 'Русский', 'en': 'English'}.entries)
              StudioRow(
                selected: context.app.language == entry.key,
                selectedTileColor: Theme.of(
                  context,
                ).colorScheme.primary.withValues(alpha: .09),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 20,
                ),
                leading: Text(
                  entry.key.toUpperCase(),
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                title: Text(entry.value),
                subtitle: Text(
                  context.app.language == entry.key
                      ? context.tr('Текущий язык', 'Current language')
                      : context.tr('Выбрать язык', 'Select language'),
                ),
                trailing: context.app.language == entry.key
                    ? const Icon(Icons.check_circle, color: AppColors.primary)
                    : null,
                onTap: () async {
                  try {
                    await context.app.setLanguage(entry.key);
                  } catch (e) {
                    if (context.mounted) showError(context, e);
                  }
                },
              ),
          ],
        ),
      ],
    ),
  );
}

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final name = TextEditingController(),
      phone = TextEditingController(),
      oldPassword = TextEditingController(),
      password = TextEditingController(),
      email = TextEditingController(),
      emailToken = TextEditingController();
  String? avatar;
  bool showOldPassword = false, showNewPassword = false;
  @override
  void dispose() {
    for (final c in [name, phone, oldPassword, password, email, emailToken]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<Json> load() async {
    final data = await context.app.api.call('/auth/profile');
    final user = data['user'] as Json;
    name.text = '${user['name'] ?? ''}';
    phone.text = '${user['phone'] ?? ''}';
    avatar ??= user['avatar_url'] as String?;
    return data;
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: StudioTopBar(
      title: Text(context.tr('Профиль и безопасность', 'Profile and security')),
    ),
    body: AsyncPanel(
      load: load,
      builder: (context, data, reload) => PageBody(
        children: [
          StudioHeader(
            eyebrow: context.tr('УЧЁТНАЯ ЗАПИСЬ', 'YOUR ACCOUNT'),
            title:
                '${(data['user'] as Json)['name'] ?? context.tr('Ваш профиль', 'Your profile')}',
            description: '${(data['user'] as Json)['email'] ?? ''}',
          ),
          _PreferenceSection(
            title: context.tr('Профиль', 'Profile'),
            children: [
              Row(
                children: [
                  StudioAvatar(
                    name: name.text,
                    url: avatar == null
                        ? null
                        : context.app.api.mediaUrl(avatar!),
                    size: 72,
                  ),
                  const SizedBox(width: 18),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          context.tr('Это вы', 'This is you'),
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          context.tr(
                            'Ваше имя и образ в CloudMind',
                            'Your identity in CloudMind',
                          ),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              ActionButton(
                secondary: true,
                label: context.tr('Изменить аватар', 'Change avatar'),
                icon: Icons.photo_camera_outlined,
                action: () async {
                  final api = context.app.api;
                  final file = await ImagePicker().pickImage(
                    source: ImageSource.gallery,
                    maxWidth: 1024,
                    imageQuality: 85,
                  );
                  if (file == null) return;
                  final bytes = await file.readAsBytes();
                  final result = await api.upload(
                    '/auth/upload-avatar',
                    field: 'avatar',
                    bytes: bytes,
                    filename: file.name,
                    mime:
                        file.mimeType ??
                        (file.name.toLowerCase().endsWith('.png')
                            ? 'image/png'
                            : 'image/jpeg'),
                  );
                  if (mounted) {
                    setState(() => avatar = '${result['avatarUrl']}');
                  }
                },
              ),
              const SizedBox(height: AppSpacing.md),
              TextField(
                controller: name,
                decoration: InputDecoration(
                  labelText: context.tr('Имя', 'Name'),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              TextField(
                controller: phone,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: context.tr('Телефон', 'Phone'),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              ActionButton(
                label: context.tr('Сохранить профиль', 'Save profile'),
                action: () async {
                  final app = context.app;
                  await app.api.call(
                    '/auth/profile',
                    method: 'PUT',
                    body: {
                      'name': name.text.trim(),
                      'phone': phone.text.trim(),
                    },
                  );
                  app.updateUser({
                    'name': name.text.trim(),
                    'phone': phone.text.trim(),
                  });
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(context.tr('Сохранено', 'Saved'))),
                    );
                  }
                },
              ),
            ],
          ),
          _SecurityFold(
            title: context.tr('Смена пароля', 'Change password'),
            children: [
              TextField(
                controller: oldPassword,
                obscureText: !showOldPassword,
                autocorrect: false,
                enableSuggestions: false,
                autofillHints: const [AutofillHints.password],
                decoration: InputDecoration(
                  labelText: context.tr('Текущий пароль', 'Current password'),
                  suffixIcon: IconButton(
                    tooltip: context.tr(
                      'Показать или скрыть пароль',
                      'Show or hide password',
                    ),
                    onPressed: () =>
                        setState(() => showOldPassword = !showOldPassword),
                    icon: Icon(
                      showOldPassword
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: password,
                obscureText: !showNewPassword,
                autocorrect: false,
                enableSuggestions: false,
                autofillHints: const [AutofillHints.newPassword],
                decoration: InputDecoration(
                  labelText: context.tr('Новый пароль', 'New password'),
                  suffixIcon: IconButton(
                    tooltip: context.tr(
                      'Показать или скрыть пароль',
                      'Show or hide password',
                    ),
                    onPressed: () =>
                        setState(() => showNewPassword = !showNewPassword),
                    icon: Icon(
                      showNewPassword
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              ActionButton(
                label: context.tr('Изменить пароль', 'Change password'),
                action: () async {
                  if (password.text.length < 8) {
                    throw ApiException(
                      context.tr(
                        'Минимум 8 символов.',
                        'At least 8 characters.',
                      ),
                    );
                  }
                  await context.app.api.call(
                    '/auth/change-password',
                    method: 'POST',
                    body: {
                      'currentPassword': oldPassword.text,
                      'newPassword': password.text,
                    },
                  );
                  password.clear();
                  oldPassword.clear();
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          context.tr('Пароль изменён', 'Password changed'),
                        ),
                      ),
                    );
                  }
                },
              ),
            ],
          ),
          _SecurityFold(
            title: context.tr('Смена email', 'Change email'),
            children: [
              Text('${(data['user'] as Json)['email'] ?? ''}'),
              const SizedBox(height: 12),
              TextField(
                controller: email,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                  labelText: context.tr('Новый email', 'New email'),
                ),
              ),
              const SizedBox(height: 12),
              ActionButton(
                label: context.tr(
                  'Получить подтверждение',
                  'Send confirmation',
                ),
                action: () async {
                  await context.app.api.call(
                    '/auth/request-email-change',
                    method: 'POST',
                    body: {'newEmail': email.text.trim()},
                  );
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          context.tr('Письмо отправлено', 'Email sent'),
                        ),
                      ),
                    );
                  }
                },
              ),
              const SizedBox(height: 12),
              TextField(
                controller: emailToken,
                decoration: InputDecoration(
                  labelText: context.tr(
                    'Токен из ссылки в письме',
                    'Token from the email link',
                  ),
                ),
              ),
              const SizedBox(height: 12),
              ActionButton(
                label: context.tr('Подтвердить email', 'Confirm email'),
                action: () async {
                  await context.app.api.call(
                    '/auth/verify-email-change',
                    method: 'POST',
                    body: {'token': emailToken.text.trim()},
                  );
                  emailToken.clear();
                  reload();
                },
              ),
            ],
          ),
        ],
      ),
    ),
  );
}

class SessionsScreen extends StatelessWidget {
  const SessionsScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: StudioTopBar(
      title: Text(context.tr('Устройства и сессии', 'Devices and sessions')),
    ),
    body: AsyncPanel(
      load: () => context.app.api.call('/auth/sessions'),
      builder: (context, data, reload) => PageBody(
        children: [
          StudioHeader(
            title: context.tr('Где вы вошли', 'Where you’re signed in'),
            description: context.tr(
              'Текущий доступ к вашему аккаунту.',
              'Devices with access to your account.',
            ),
          ),
          if (rows(data, 'sessions').isEmpty)
            AppEmptyState(
              icon: Icons.devices_outlined,
              title: context.tr('Активных сессий нет', 'No active sessions'),
              description: context.tr(
                'Устройства с доступом к аккаунту появятся здесь.',
                'Devices with access to your account will appear here.',
              ),
            ),
          for (final session in rows(data, 'sessions'))
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: StudioDisclosure(
                tilePadding: EdgeInsets.zero,
                leading: const _SettingsIcon(Icons.devices_outlined),
                title: Text('${session['device_type'] ?? ''}'),
                subtitle: Text(
                  session['is_current'] == true
                      ? context.tr('Это устройство', 'This device')
                      : '${session['last_active'] ?? ''}',
                ),
                childrenPadding: const EdgeInsets.only(top: 12),
                expandedCrossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('${session['session_ip'] ?? ''}'),
                  Text('${session['last_active'] ?? ''}'),
                  if (session['is_current'] == true)
                    Text(context.tr('Это устройство', 'This device'))
                  else
                    ActionButton(
                      label: context.tr('Завершить сессию', 'End session'),
                      icon: Icons.logout,
                      action: () async {
                        final api = context.app.api;
                        if (!await confirm(
                          context,
                          context.tr(
                            'Завершить эту сессию?',
                            'End this session?',
                          ),
                        )) {
                          return;
                        }
                        await api.call(
                          '/auth/sessions/${session['id']}',
                          method: 'DELETE',
                        );
                        reload();
                      },
                    ),
                ],
              ),
            ),
        ],
      ),
    ),
  );
}

class ReminderScreen extends StatefulWidget {
  const ReminderScreen({super.key});
  @override
  State<ReminderScreen> createState() => _ReminderScreenState();
}

class _ReminderScreenState extends State<ReminderScreen> {
  TimeOfDay time = const TimeOfDay(hour: 21, minute: 0);
  bool initialized = false;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!initialized) {
      final p = context.app.preferences;
      time = TimeOfDay(
        hour: p.getInt('reminder_hour') ?? 21,
        minute: p.getInt('reminder_minute') ?? 0,
      );
      initialized = true;
    }
  }

  Future<void> chooseTime() async {
    final result = await showTimePicker(context: context, initialTime: time);
    if (result != null && mounted) setState(() => time = result);
  }

  Future<void> enable() async {
    final app = context.app;
    await Reminders.daily(
      time.hour,
      time.minute,
      context.tr(
        'Как прошёл ваш день? Запишите свои мысли.',
        'How was your day? Write down your thoughts.',
      ),
    );
    await app.preferences.setInt('reminder_hour', time.hour);
    await app.preferences.setInt('reminder_minute', time.minute);
    await app.preferences.setBool('reminder_enabled', true);
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final enabled = context.app.preferences.getBool('reminder_enabled') == true;
    return Scaffold(
      appBar: StudioTopBar(title: Text(context.tr('Напоминания', 'Reminders'))),
      body: StudioActionLayout(
        content: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            StudioHeader(
              eyebrow: context.tr('ЕЖЕДНЕВНЫЙ РИТУАЛ', 'A DAILY RITUAL'),
              title: context.tr('Время для себя', 'Time for yourself'),
              description: context.tr(
                'Выберите удобное время для записи в дневнике.',
                'Choose a good time to write in your journal.',
              ),
            ),
            if (!Reminders.supported)
              StudioNotice(
                icon: Icons.notifications_off_outlined,
                message: context.tr(
                  'Ежедневные уведомления доступны в приложениях Android и iOS.',
                  'Daily notifications are available in the Android and iOS apps.',
                ),
              )
            else ...[
              Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(24),
                  onTap: chooseTime,
                  child: StudioPanel(
                    tone: StudioTone.accent,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            const StudioGlyph(Icons.schedule_rounded, size: 40),
                            const Spacer(),
                            const Icon(Icons.edit_outlined, size: 20),
                          ],
                        ),
                        const SizedBox(height: 24),
                        Text(
                          time.format(context),
                          style: Theme.of(context).textTheme.displayMedium,
                        ),
                        const SizedBox(height: 10),
                        Text(
                          context.tr(
                            'Каждый день · нажмите, чтобы изменить',
                            'Every day · tap to change',
                          ),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              StudioNotice(
                icon: enabled
                    ? Icons.notifications_active_outlined
                    : Icons.notifications_none_rounded,
                message: enabled
                    ? context.tr('Напоминания включены', 'Reminders enabled')
                    : context.tr('Напоминания выключены', 'Reminders are off'),
              ),
            ],
          ],
        ),
        action: Reminders.supported
            ? Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ActionButton(
                    label: enabled
                        ? context.tr('Сохранить время', 'Save schedule')
                        : context.tr(
                            'Включить напоминания',
                            'Enable reminders',
                          ),
                    icon: Icons.check_rounded,
                    action: enable,
                  ),
                  if (enabled)
                    TextButton(
                      onPressed: () async {
                        try {
                          final app = context.app;
                          await Reminders.cancel();
                          await app.preferences.setBool(
                            'reminder_enabled',
                            false,
                          );
                          if (mounted) setState(() {});
                        } catch (error) {
                          if (context.mounted) showError(context, error);
                        }
                      },
                      child: Text(context.tr('Отключить', 'Disable')),
                    ),
                ],
              )
            : const SizedBox.shrink(),
      ),
    );
  }
}

class _SettingsIcon extends StatelessWidget {
  const _SettingsIcon(this.icon);
  final IconData icon;
  @override
  Widget build(BuildContext context) => StudioGlyph(icon);
}

class _PreferenceSection extends StatelessWidget {
  const _PreferenceSection({required this.title, required this.children});
  final String title;
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 24),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(title, style: Theme.of(context).textTheme.labelLarge),
        const SizedBox(height: 12),
        StudioPanel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: children,
          ),
        ),
      ],
    ),
  );
}

class _SecurityFold extends StatelessWidget {
  const _SecurityFold({required this.title, required this.children});
  final String title;
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: StudioPanel(
      padding: const EdgeInsets.all(4),
      radius: 20,
      child: StudioDisclosure(
        title: Text(title),
        expandedCrossAxisAlignment: CrossAxisAlignment.stretch,
        childrenPadding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
        children: children,
      ),
    ),
  );
}
