import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../core/api.dart';
import '../core/app_state.dart';
import '../widgets/chat_visuals.dart';
import 'studio.dart';

class ConversationMessage extends StatelessWidget {
  const ConversationMessage({
    super.key,
    required this.message,
    required this.chatId,
    required this.enabled,
    required this.onReply,
    required this.onEdit,
    required this.onRegenerate,
    required this.onSpeak,
    this.audio,
  });

  final Json message;
  final int? chatId;
  final bool enabled;
  final VoidCallback onReply, onEdit, onRegenerate;
  final VoidCallback onSpeak;
  final Widget? audio;

  @override
  Widget build(BuildContext context) {
    final user = message['role'] == 'user';
    final text = '${message['text'] ?? ''}';
    final color = Theme.of(context).colorScheme;
    final sent = DateTime.tryParse(
      '${message['created_at'] ?? message['senddate'] ?? ''}',
    )?.toLocal();
    final time = sent == null
        ? null
        : TimeOfDay.fromDateTime(sent).format(context);
    return Align(
      alignment: user ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: user ? 620 : 760),
        child: Padding(
          padding: const EdgeInsets.only(bottom: 20),
          child: Column(
            crossAxisAlignment: user
                ? CrossAxisAlignment.end
                : CrossAxisAlignment.start,
            children: [
              if (!user)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 8,
                    runSpacing: 4,
                    children: [
                      const StudioGlyph(Icons.blur_on_rounded, size: 26),
                      const SizedBox(width: 9),
                      Text(
                        'CloudMind',
                        style: Theme.of(context).textTheme.labelMedium,
                      ),
                      if (time != null) ...[
                        const SizedBox(width: 10),
                        Text(
                          time,
                          style: Theme.of(context).textTheme.labelSmall,
                        ),
                      ],
                    ],
                  ),
                ),
              DecoratedBox(
                decoration: BoxDecoration(
                  color: user
                      ? color.primary.withValues(alpha: .10)
                      : Colors.transparent,
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(22),
                    topRight: const Radius.circular(22),
                    bottomLeft: Radius.circular(user ? 22 : 6),
                    bottomRight: Radius.circular(user ? 6 : 22),
                  ),
                  border: user
                      ? Border.all(color: color.primary.withValues(alpha: .22))
                      : null,
                ),
                child: Padding(
                  padding: EdgeInsets.symmetric(
                    horizontal: user ? 20 : 4,
                    vertical: user ? 16 : 4,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (text.isNotEmpty) MessageContent(text: text),
                      if (audio != null) audio!,
                    ],
                  ),
                ),
              ),
              if (user && time != null)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    time,
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                ),
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Material(
                  color: Colors.transparent,
                  borderRadius: BorderRadius.circular(14),
                  child: Wrap(
                    spacing: 0,
                    children: [
                      if (user) ...[
                        IconButton(
                          tooltip: context.tr('Изменить', 'Edit'),
                          onPressed: enabled ? onEdit : null,
                          icon: const Icon(Icons.edit_outlined, size: 17),
                        ),
                        IconButton(
                          tooltip: context.tr('Ответить', 'Reply'),
                          onPressed: enabled ? onReply : null,
                          icon: const Icon(Icons.reply_rounded, size: 18),
                        ),
                      ] else ...[
                        IconButton(
                          tooltip: context.tr('Скопировать', 'Copy'),
                          onPressed: enabled
                              ? () => copyMessage(context, text)
                              : null,
                          icon: const Icon(Icons.copy_outlined, size: 17),
                        ),
                        IconButton(
                          tooltip: context.tr('Озвучить', 'Read aloud'),
                          onPressed: enabled ? onSpeak : null,
                          icon: const Icon(Icons.volume_up_outlined, size: 18),
                        ),
                        IconButton(
                          tooltip: context.tr('Другой ответ', 'Regenerate'),
                          onPressed: enabled ? onRegenerate : null,
                          icon: const Icon(Icons.refresh_rounded, size: 18),
                        ),
                        IconButton(
                          tooltip: context.tr('Ответить', 'Reply'),
                          onPressed: enabled ? onReply : null,
                          icon: const Icon(Icons.reply_rounded, size: 18),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> copyMessage(BuildContext context, String text) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(context.tr('Скопировано', 'Copied')),
          duration: const Duration(seconds: 1),
        ),
      );
    }
  }
}
