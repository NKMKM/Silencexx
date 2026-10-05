import 'package:flutter/material.dart';

import '../core/api.dart';
import '../core/app_state.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_spacing.dart';
import '../widgets/common.dart';

class InboxScreen extends StatefulWidget {
  const InboxScreen({super.key});
  @override
  State<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends State<InboxScreen> {
  bool composing = false;
  final message = TextEditingController();
  @override
  void dispose() {
    message.dispose();
    super.dispose();
  }

  Future<Json> load() async {
    final api = context.app.api;
    final result = await Future.wait([
      api.call('/inbox/received'),
      api.call('/inbox/can-send'),
    ]);
    return {...result[0], ...result[1]};
  }

  @override
  Widget build(BuildContext context) => AsyncPanel(
    load: load,
    builder: (context, data, reload) => PageBody(
      children: [
        PageIntro(
          title: context.tr('Добрые слова', 'Kind words'),
          description: context.tr(
            'Небольшое пожелание может изменить чей-то день.',
            'A small wish can change someone’s day.',
          ),
        ),
        SegmentedButton<bool>(
          segments: [
            ButtonSegment(
              value: false,
              icon: const Icon(Icons.inbox_outlined),
              label: Text(context.tr('Для вас', 'For you')),
            ),
            ButtonSegment(
              value: true,
              icon: const Icon(Icons.edit_outlined),
              label: Text(context.tr('Написать', 'Write')),
            ),
          ],
          selected: {composing},
          onSelectionChanged: (value) =>
              setState(() => composing = value.first),
        ),
        const SizedBox(height: 24),
        if (composing)
          SectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  context.tr(
                    'Отправьте анонимное пожелание другому человеку.',
                    'Send an anonymous kind wish to someone.',
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                TextField(
                  controller: message,
                  minLines: 3,
                  maxLines: 6,
                  maxLength: 500,
                  decoration: InputDecoration(
                    hintText: context.tr(
                      'Несколько добрых слов…',
                      'A few kind words…',
                    ),
                  ),
                ),
                if (data['canSend'] == true)
                  ActionButton(
                    label: context.tr('Отправить пожелание', 'Send a wish'),
                    icon: Icons.send,
                    action: () async {
                      if (message.text.trim().isEmpty) {
                        throw ApiException(
                          context.tr(
                            'Введите пожелание.',
                            'Write a wish first.',
                          ),
                        );
                      }
                      await context.app.api.call(
                        '/inbox/send',
                        method: 'POST',
                        body: {'message': message.text.trim()},
                      );
                      message.clear();
                      reload();
                    },
                  )
                else
                  Text(
                    context.tr(
                      'Следующее пожелание через ${data['minutesLeft'] ?? 0} мин.',
                      'Next wish in ${data['minutesLeft'] ?? 0} minutes.',
                    ),
                  ),
              ],
            ),
          ),
        if (!composing) ...[
          Row(
            children: [
              Expanded(
                child: Text(
                  context.tr('Для вас', 'For you'),
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              IconButton(
                onPressed: reload,
                tooltip: context.tr('Обновить', 'Refresh'),
                icon: const Icon(Icons.refresh),
              ),
            ],
          ),
          if (rows(data, 'messages').isEmpty)
            AppEmptyState(
              icon: Icons.mail_outline_rounded,
              title: context.tr(
                'Место для добрых слов',
                'A place for kind words',
              ),
              description: context.tr(
                'Здесь появятся пожелания от других людей.',
                'Wishes from others will appear here.',
              ),
              action: TextButton.icon(
                onPressed: () => setState(() => composing = true),
                icon: const Icon(Icons.edit_outlined, size: 18),
                label: Text(
                  context.tr('Поделиться теплом', 'Share a little kindness'),
                ),
              ),
            ),
          for (final item in rows(data, 'messages'))
            Card(
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: item['is_read'] == true
                      ? AppColors.surfaceHighest
                      : AppColors.primary.withValues(alpha: .12),
                  child: Icon(
                    item['is_read'] == true
                        ? Icons.drafts_outlined
                        : Icons.mark_email_unread_outlined,
                    color: item['is_read'] == true
                        ? AppColors.textSecondary
                        : AppColors.primaryBright,
                  ),
                ),
                contentPadding: const EdgeInsets.all(20),
                title: Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(
                    '${item['message'] ?? ''}',
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                ),
                subtitle: Text('${item['sent_at'] ?? ''}'.split('T').first),
                onTap: () async {
                  try {
                    await context.app.api.call(
                      '/inbox/messages/${item['id']}/read',
                      method: 'PATCH',
                    );
                    reload();
                  } catch (e) {
                    if (context.mounted) showError(context, e);
                  }
                },
              ),
            ),
        ],
      ],
    ),
  );
}
