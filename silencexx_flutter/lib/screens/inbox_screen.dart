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
        Text(
          context.tr(
            'Немного тепла друг другу',
            'A little kindness for each other',
          ),
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: AppSpacing.sm),
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
                        context.tr('Введите пожелание.', 'Write a wish first.'),
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
        Row(
          children: [
            Expanded(
              child: Text(
                context.tr('Для вас', 'For you'),
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ),
            IconButton(onPressed: reload, icon: const Icon(Icons.refresh)),
          ],
        ),
        if (rows(data, 'messages').isEmpty)
          SectionCard(
            child: Text(
              context.tr(
                'Здесь появятся пожелания от других людей.',
                'Wishes from others will appear here.',
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
              title: Text('${item['message'] ?? ''}'),
              subtitle: Text('${item['sent_at'] ?? ''}'.split('T').first),
              onTap: () async {
                try {
                  await context.app.api.call(
                    '/inbox/${item['id']}/mark-read',
                    method: 'POST',
                  );
                  reload();
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
