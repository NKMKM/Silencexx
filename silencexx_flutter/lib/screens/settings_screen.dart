import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../core/api.dart';
import '../core/app_state.dart';
import '../core/reminders.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_spacing.dart';
import '../widgets/common.dart';
import 'subscription_screen.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});
  void open(BuildContext context, Widget page) =>
      Navigator.push(context, MaterialPageRoute(builder: (_) => page));
  @override
  Widget build(BuildContext context) => PageBody(
    children: [
      SectionCard(
        child: ListTile(
          leading: CircleAvatar(
            backgroundColor: AppColors.surfaceRaised,
            child: Icon(Icons.person_outline, color: AppColors.primaryBright),
          ),
          title: Text('${context.app.user?['name'] ?? 'SilenceXX'}'),
          subtitle: Text(context.tr('Ваше пространство', 'Your space')),
        ),
      ),
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
        title: Text(context.tr('Устройства и сессии', 'Devices and sessions')),
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
      ListTile(
        leading: const Icon(Icons.language),
        title: Text(context.tr('Язык', 'Language')),
        subtitle: Text(context.app.language == 'ru' ? 'Русский' : 'English'),
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
      const SizedBox(height: AppSpacing.xl),
      ActionButton(
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
        'SilenceXX · Flutter 1.0.0',
        textAlign: TextAlign.center,
        style: Theme.of(context).textTheme.bodySmall,
      ),
    ],
  );
}

class LanguageScreen extends StatelessWidget {
  const LanguageScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(context.tr('Язык приложения', 'App language'))),
    body: PageBody(
      children: [
        for (final entry in {'ru': 'Русский', 'en': 'English'}.entries)
          SectionCard(
            child: ListTile(
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
          if (avatar != null)
            Center(
              child: ClipOval(
                child: Image.network(
                  context.app.api.mediaUrl(avatar!),
                  width: 100,
                  height: 100,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => const Icon(Icons.person, size: 70),
                ),
              ),
            ),
          ActionButton(
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
              if (mounted) setState(() => avatar = '${result['avatarUrl']}');
            },
          ),
          const SizedBox(height: AppSpacing.md),
          TextField(
            controller: name,
            decoration: InputDecoration(labelText: context.tr('Имя', 'Name')),
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
                body: {'name': name.text.trim(), 'phone': phone.text.trim()},
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
          const SizedBox(height: 28),
          Text(
            context.tr('Смена пароля', 'Change password'),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 12),
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
                  context.tr('Минимум 8 символов.', 'At least 8 characters.'),
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
          const SizedBox(height: 28),
          Text(
            context.tr('Смена email', 'Change email'),
            style: Theme.of(context).textTheme.titleLarge,
          ),
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
            label: context.tr('Получить подтверждение', 'Send confirmation'),
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
          for (final session in rows(data, 'sessions'))
            SectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${session['device_type'] ?? ''}',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
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
          ListTile(
            title: Text(time.format(context)),
            trailing: const Icon(Icons.schedule),
            onTap: () async {
              final result = await showTimePicker(
                context: context,
                initialTime: time,
              );
              if (result != null && mounted) setState(() => time = result);
            },
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
