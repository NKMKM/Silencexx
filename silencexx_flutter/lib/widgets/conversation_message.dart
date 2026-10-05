import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../core/api.dart';
import '../core/app_state.dart';
import '../widgets/chat_visuals.dart';

class ConversationMessage extends StatelessWidget {
  const ConversationMessage({super.key, required this.message, required this.chatId,
    required this.enabled, required this.onReply, required this.onEdit,
    required this.onRegenerate, required this.onSpeak, this.audio});

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
    return Align(
      alignment: user ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * .82),
        child: Padding(
          padding: const EdgeInsets.only(bottom: 20),
          child: Column(crossAxisAlignment: user ? CrossAxisAlignment.end : CrossAxisAlignment.start, children: [
            DecoratedBox(
              decoration: BoxDecoration(
                color: user ? color.primary.withValues(alpha: .12) : Colors.transparent,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: user ? 16 : 4, vertical: user ? 12 : 4),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  if (text.isNotEmpty) MessageContent(text: text),
                  if (audio != null) audio!,
                ]),
              ),
            ),
            if (enabled) Wrap(spacing: 0, children: [
              if (user) ...[
                IconButton(tooltip: context.tr('Изменить', 'Edit'), onPressed: onEdit,
                  icon: const Icon(Icons.edit_outlined, size: 17)),
                IconButton(tooltip: context.tr('Ответить', 'Reply'), onPressed: onReply,
                  icon: const Icon(Icons.reply_rounded, size: 18)),
              ] else ...[
                IconButton(tooltip: context.tr('Скопировать', 'Copy'),
                  onPressed: () => copyMessage(context, text), icon: const Icon(Icons.copy_outlined, size: 17)),
                IconButton(tooltip: context.tr('Озвучить', 'Read aloud'), onPressed: onSpeak,
                  icon: const Icon(Icons.volume_up_outlined, size: 18)),
                IconButton(tooltip: context.tr('Другой ответ', 'Regenerate'), onPressed: onRegenerate,
                  icon: const Icon(Icons.refresh_rounded, size: 18)),
                IconButton(tooltip: context.tr('Ответить', 'Reply'), onPressed: onReply,
                  icon: const Icon(Icons.reply_rounded, size: 18)),
              ],
            ]),
          ]),
        ),
      ),
    );
  }

  Future<void> copyMessage(BuildContext context, String text) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(context.tr('Скопировано', 'Copied')), duration: const Duration(seconds: 1)));
  }
}
