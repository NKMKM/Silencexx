import 'package:flutter/material.dart';
import '../core/app_state.dart';
import 'cloud_companion.dart';

class VoiceCompanionStage extends StatelessWidget {
  const VoiceCompanionStage({
    super.key,
    required this.emotion,
    required this.activity,
    this.level = 0,
    this.transcript,
    this.reply,
    required this.onShowChat,
  });
  final CloudEmotion emotion;
  final CloudActivity activity;
  final double level;
  final String? transcript, reply;
  final VoidCallback onShowChat;
  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final size = (constraints.maxHeight * .46).clamp(140.0, 300.0);
      final status = switch (activity) {
        CloudActivity.listening => context.tr('Я слушаю', 'I’m listening'),
        CloudActivity.thinking => context.tr(
          'Вникаю в твои слова',
          'Taking in your words',
        ),
        CloudActivity.speaking => context.tr('Я рядом', 'I’m here with you'),
        CloudActivity.error => context.tr(
          'Попробуем ещё раз',
          'Let’s try again',
        ),
        _ => context.tr(
          'Расскажи, что у тебя на душе',
          'Tell me what’s on your mind',
        ),
      };
      return SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 8),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight - 16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CloudCompanion(
                emotion: emotion,
                activity: activity,
                level: level,
                size: size,
              ),
              Text(
                status,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 12),
              if (transcript?.isNotEmpty == true)
                Text(
                  '«$transcript»',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              if (reply?.isNotEmpty == true &&
                  activity != CloudActivity.listening) ...[
                const SizedBox(height: 14),
                Text(
                  reply!,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
              ],
              const SizedBox(height: 14),
              TextButton.icon(
                onPressed: onShowChat,
                icon: const Icon(Icons.chat_bubble_outline_rounded, size: 18),
                label: Text(
                  context.tr('Показать переписку', 'Show conversation'),
                ),
              ),
            ],
          ),
        ),
      );
    },
  );
}
