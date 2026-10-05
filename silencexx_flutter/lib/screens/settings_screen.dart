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

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});
  void open(BuildContext context, Widget page) =>
      Navigator.push(context, MaterialPageRoute(builder: (_) => page));
  @override
  Widget build(BuildContext context) => PageBody(
    children: [
      PageIntro(
        title: context.tr('Ваше пространство', 'Your space'),
        description: context.tr(
          'Аккаунт, привычки и оформление — под вас.',
          'Your account, routines and appearance, your way.',
        ),
      ),
      SectionCard(
        onTap: () => open(context, const ProfileScreen()),
        child: Row(
          children: [
            CircleAvatar(
              radius: 28,
              backgroundColor: Theme.of(
                context,
              ).colorScheme.primary.withValues(alpha: .14),
              child: Text(
                ('${context.app.user?['name'] ?? ''}'.trim().isEmpty
                        ? 'C'
                        : '${context.app.user?['name']}'
                              .trim()
                              .characters
                              .first)
                    .toUpperCase(),
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ),
            const SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${context.app.user?['name'] ?? 'CloudMind'}',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    context.tr('Личное пространство', 'Your private space'),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_outward_rounded, size: 20),
          ],
        ),
      ),
      const SizedBox(height: 24),
      FormGroup(
        title: context.tr('Аккаунт', 'Account'),
        children: [
          ListTile(
            leading: const Icon(Icons.person_outline),
            title: Text(
              context.tr('Профиль и безопасность', 'Profile and security'),
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => open(context, const ProfileScreen()),
          ),
          ListTile(
            leading: const Icon(Icons.devices),
            title: Text(
              context.tr('Устройства и сессии', 'Devices and sessions'),
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => open(context, const SessionsScreen()),
          ),
          ListTile(
            leading: const Icon(Icons.workspace_premium_outlined),
            title: Text(
              context.tr('Подписка и платежи', 'Subscription and billing'),
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => open(context, const SubscriptionScreen()),
          ),
        ],
      ),
      FormGroup(
        title: context.tr('Приложение', 'Application'),
        children: [
          ListTile(
            leading: const Icon(Icons.language),
            title: Text(context.tr('Язык', 'Language')),
            subtitle: Text(
              context.app.language == 'ru' ? 'Русский' : 'English',
            ),
            onTap: () => open(context, const LanguageScreen()),
          ),
          ListTile(
            leading: const Icon(Icons.notifications_none),
            title: Text(context.tr('Напоминания', 'Reminders')),
            onTap: () => open(context, const ReminderScreen()),
          ),
          const SizedBox(height: AppSpacing.md),
          DropdownButtonFormField<ThemeMode>(
            initialValue: context.app.themeMode,
            decoration: InputDecoration(
              labelText: context.tr('Оформление', 'Appearance'),
              prefixIcon: const Icon(Icons.contrast_rounded),
            ),
            items: [
              DropdownMenuItem(
                value: ThemeMode.system,
                child: Text(context.tr('Как в системе', 'System')),
              ),
              DropdownMenuItem(
                value: ThemeMode.dark,
                child: Text(context.tr('Тёмное', 'Dark')),
              ),
              DropdownMenuItem(
                value: ThemeMode.light,
                child: Text(context.tr('Светлое', 'Light')),
              ),
            ],
            onChanged: (v) async {
              try {
                await context.app.setTheme(v!);
              } catch (e) {
                if (context.mounted) showError(context, e);
              }
            },
          ),
        ],
      ),
      FormGroup(
        title: context.tr('Личные данные и безопасность', 'Privacy and safety'),
        children: [
          ListTile(
            leading: const Icon(Icons.lock_outline_rounded),
            title: Text(
              context.tr('Приватность и данные', 'Privacy and data controls'),
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => open(context, const PrivacyScreen()),
          ),
          ListTile(
            leading: const Icon(Icons.favorite_outline_rounded),
            title: Text(
              context.tr('Безопасность и приложение', 'Safety and about'),
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => open(context, const SafetyAboutScreen()),
          ),
        ],
      ),
      ActionButton(
        secondary: true,
        label: context.tr('Выйти', 'Sign out'),
        icon: Icons.logout,
        action: () async {
          final app = context.app;
          if (await confirm(
            context,
            context.tr('Выйти из аккаунта?', 'Sign out?'),
          )) {
            await app.logout();
          }
        },
      ),
      const SizedBox(height: AppSpacing.xl),
      Text(
        'CloudMind · 1.0.0',
        textAlign: TextAlign.center,
        style: Theme.of(context).textTheme.bodySmall,
      ),
    ],
  );
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
    appBar: AppBar(
      title: Text(
        context.tr('Приватность и данные', 'Privacy and data controls'),
      ),
    ),
    body: PageBody(
      children: [
        PageIntro(
          title: context.tr('Ваши данные', 'Your data'),
          description: context.tr(
            'Сообщения передаются серверу приложения для создания ответов и могут храниться в истории аккаунта. Не отправляйте то, что не хотите передавать сервису.',
            'Messages are sent to the app server to generate replies and may be stored in your account history. Avoid sharing information you do not want the service to receive.',
          ),
        ),
        FormGroup(
          title: context.tr('Управление данными', 'Data controls'),
          children: [
            ListTile(
              leading: const Icon(Icons.ios_share_rounded),
              title: Text(
                context.tr(
                  'Экспорт профиля и разговоров',
                  'Export profile and conversations',
                ),
              ),
              subtitle: Text(
                context.tr(
                  'Профиль, разговоры, дневник, входящие пожелания и последние сессии поддержки.',
                  'Profile, conversations, journal, received messages and recent support sessions.',
                ),
              ),
              trailing: exporting
                  ? const SizedBox.square(
                      dimension: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.chevron_right),
              onTap: exporting ? null : exportData,
            ),
            ListTile(
              leading: const Icon(Icons.delete_outline_rounded),
              title: Text(context.tr('Удаление аккаунта', 'Delete account')),
              subtitle: Text(
                context.tr(
                  'Аккаунт и связанные записи удалятся без возможности восстановления.',
                  'Your account and linked records will be permanently removed.',
                ),
              ),
              trailing: TextButton(
                onPressed: deleteAccount,
                child: Text(context.tr('Удалить', 'Delete')),
              ),
            ),
          ],
        ),
        FormGroup(
          title: context.tr(
            'Как обрабатываются сообщения',
            'How conversations are handled',
          ),
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                context.tr(
                  'Для ответа текст отправляется на настроенный сервер приложения. История разговоров загружается и хранится в учётной записи. Этот интерфейс не обещает сквозное шифрование.',
                  'To generate a reply, message text is sent to the configured app server. Conversation history is loaded from and stored with your account. This app does not claim end-to-end encryption.',
                ),
              ),
            ),
          ],
        ),
      ],
    ),
  );
}

class SafetyAboutScreen extends StatelessWidget {
  const SafetyAboutScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(context.tr('Безопасность и приложение', 'Safety and about')),
    ),
    body: PageBody(
      children: [
        PageIntro(
          eyebrow: 'CloudMind',
          title: context.tr(
            'Тёплое место для разговора',
            'A welcoming place to talk',
          ),
          description: context.tr(
            'AI-компаньон для размышлений, эмоционального благополучия и обычных разговоров.',
            'An AI companion for reflection, emotional well-being and everyday conversations.',
          ),
        ),
        FormGroup(
          title: context.tr('Ограничения', 'Important limits'),
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                context.tr(
                  'Приложение не является медицинской службой, не ставит диагнозы и не лечит. Ответы ИИ не заменяют врача, психиатра, психолога или другую квалифицированную помощь.',
                  'This app is not a medical service and does not diagnose or treat conditions. AI responses do not replace a doctor, psychiatrist, psychologist or other qualified professional.',
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Text(
                context.tr(
                  'Если тебе угрожает непосредственная опасность, обратись в местную экстренную службу или к доступному кризисному ресурсу.',
                  'If you are in immediate danger, contact your local emergency service or an available crisis resource.',
                ),
              ),
            ),
          ],
        ),
        ListTile(
          leading: const Icon(Icons.info_outline_rounded),
          title: Text(
            context.tr(
              'Прочитать полное уведомление',
              'Read the full app notice',
            ),
          ),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => showAppDialog<void>(
            context: context,
            builder: (dialogContext) => AppDialog(
              icon: const Icon(Icons.auto_awesome_outlined),
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
      ],
    ),
  );
}

class LanguageScreen extends StatelessWidget {
  const LanguageScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(context.tr('Язык приложения', 'App language'))),
    body: PageBody(
      children: [
        PageIntro(
          title: context.tr('Понятно с первого слова', 'Feel at home'),
          description: context.tr(
            'Выберите язык интерфейса.',
            'Choose your interface language.',
          ),
        ),
        FormGroup(
          title: context.tr('Язык', 'Language'),
          children: [
            for (final entry in {'ru': 'Русский', 'en': 'English'}.entries)
              ListTile(
                title: Text(entry.value),
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
    appBar: AppBar(
      title: Text(context.tr('Профиль и безопасность', 'Profile and security')),
    ),
    body: AsyncPanel(
      load: load,
      builder: (context, data, reload) => PageBody(
        children: [
          PageIntro(
            title: context.tr('Личные данные', 'Personal details'),
            description: context.tr(
              'Управляйте профилем и доступом к аккаунту.',
              'Manage your profile and account access.',
            ),
          ),
          FormGroup(
            title: context.tr('Профиль', 'Profile'),
            children: [
              if (avatar != null)
                Center(
                  child: ClipOval(
                    child: Image.network(
                      context.app.api.mediaUrl(avatar!),
                      width: 100,
                      height: 100,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) =>
                          const Icon(Icons.person, size: 70),
                    ),
                  ),
                ),
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
          FormGroup(
            title: context.tr('Смена пароля', 'Change password'),
            children: [
              TextField(
                controller: oldPassword,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: context.tr('Текущий пароль', 'Current password'),
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
          FormGroup(
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
    appBar: AppBar(
      title: Text(context.tr('Устройства и сессии', 'Devices and sessions')),
    ),
    body: AsyncPanel(
      load: () => context.app.api.call('/auth/sessions'),
      builder: (context, data, reload) => PageBody(
        children: [
          PageIntro(
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
            SectionCard(
              child: ExpansionTile(
                tilePadding: EdgeInsets.zero,
                leading: const Icon(Icons.devices_outlined),
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

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(context.tr('Напоминания', 'Reminders'))),
    body: PageBody(
      children: [
        PageIntro(
          eyebrow: context.tr('Ежедневный ритуал', 'A daily ritual'),
          title: context.tr('Время для себя', 'Time for yourself'),
          description: context.tr(
            'Выберите удобное время для записи в дневнике.',
            'Choose a good time to write in your journal.',
          ),
        ),
        if (!Reminders.supported)
          Text(
            context.tr(
              'Ежедневные уведомления доступны в приложениях Android и iOS.',
              'Daily notifications are available in the Android and iOS apps.',
            ),
          )
        else ...[
          Text(
            context.tr(
              'Напоминать записывать мысли каждый день',
              'A daily reminder to write down your thoughts',
            ),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          SectionCard(
            child: ListTile(
              title: Text(
                time.format(context),
                style: Theme.of(context).textTheme.displaySmall,
              ),
              trailing: const Icon(Icons.schedule),
              onTap: () async {
                final result = await showTimePicker(
                  context: context,
                  initialTime: time,
                );
                if (result != null && mounted) setState(() => time = result);
              },
            ),
          ),
          ActionButton(
            label: context.tr('Включить напоминания', 'Enable reminders'),
            action: () async {
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
            },
          ),
          const SizedBox(height: 12),
          if (context.app.preferences.getBool('reminder_enabled') == true) ...[
            Text(context.tr('Напоминания включены', 'Reminders enabled')),
            ActionButton(
              secondary: true,
              label: context.tr('Отключить', 'Disable'),
              action: () async {
                final app = context.app;
                await Reminders.cancel();
                await app.preferences.setBool('reminder_enabled', false);
                if (mounted) setState(() {});
              },
            ),
          ],
        ],
      ],
    ),
  );
}
