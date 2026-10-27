import '../widgets/studio.dart';
import 'dart:async';

import 'package:flutter/material.dart';

import '../core/api.dart';
import '../core/app_state.dart';
import '../widgets/design.dart';
import '../widgets/common.dart';

class InboxScreen extends StatefulWidget {
  const InboxScreen({super.key});
  @override
  State<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends State<InboxScreen> {
  bool composing = false;
  final message = TextEditingController();
  final Set<int> locallyRead = {};
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

  Future<void> openMessage(Json item) async {
    final id = (item['id'] as num).toInt();
    final alreadyRead = item['is_read'] == true || locallyRead.contains(id);
    if (!alreadyRead) {
      setState(() => locallyRead.add(id));
      unawaited(() async {
        try {
          await context.app.api.call(
            '/inbox/messages/$id/read',
            method: 'PATCH',
          );
        } catch (error) {
          if (!mounted) return;
          setState(() => locallyRead.remove(id));
          showError(context, error);
        }
      }());
    }

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      sheetAnimationStyle: AnimationStyle(duration: studioDuration(context)),
      builder: (sheetContext) => DraggableScrollableSheet(
        initialChildSize: .58,
        minChildSize: .38,
        maxChildSize: .92,
        expand: false,
        builder: (context, scrollController) {
          final theme = Theme.of(context);
          return Material(
            color: theme.colorScheme.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 12, 12),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primaryContainer,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.favorite_rounded,
                          size: 18,
                          color: theme.colorScheme.onPrimaryContainer,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              context.tr(
                                'Доброе слово для вас',
                                'A kind wish for you',
                              ),
                              style: theme.textTheme.titleMedium,
                            ),
                            Text(
                              '${item['sent_at'] ?? ''}'.split('T').first,
                              style: theme.textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        tooltip: context.tr('Закрыть', 'Close'),
                        onPressed: () => Navigator.pop(sheetContext),
                        icon: const Icon(Icons.close_rounded),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),
                Expanded(
                  child: SingleChildScrollView(
                    controller: scrollController,
                    padding: const EdgeInsets.fromLTRB(24, 28, 24, 36),
                    child: SelectableText(
                      '${item['message'] ?? ''}',
                      style: theme.textTheme.headlineSmall?.copyWith(
                        height: 1.45,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                  child: Row(
                    children: [
                      const Icon(Icons.visibility_off_outlined, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          context.tr(
                            'Отправитель остаётся анонимным',
                            'The sender stays anonymous',
                          ),
                          style: theme.textTheme.bodySmall,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> sendWish(VoidCallback reload) async {
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
    if (!mounted) return;
    setState(() => composing = false);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          context.tr('Пожелание отправлено', 'Your wish is on its way'),
        ),
      ),
    );
    reload();
  }

  Widget _sendControl(Json data, VoidCallback reload) => data['canSend'] == true
      ? ActionButton(
          label: context.tr('Отправить пожелание', 'Send a wish'),
          icon: Icons.north_east_rounded,
          action: () => sendWish(reload),
        )
      : StudioNotice(
          icon: Icons.schedule_rounded,
          message: context.tr(
            'Следующее пожелание через ${data['minutesLeft'] ?? 0} мин.',
            'Next wish in ${data['minutesLeft'] ?? 0} minutes.',
          ),
        );

  Widget _recipient() => StudioRow(
    leading: const StudioGlyph(Icons.favorite_border_rounded),
    title: Text(
      context.tr('Кому-то, кому нужно тепло', 'To someone who needs kindness'),
    ),
    subtitle: Text(
      context.tr(
        'Анонимно · без личных данных',
        'Anonymous · no personal details',
      ),
    ),
  );

  Widget _emptyMailbox() => Center(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const StudioGlyph(Icons.mark_email_unread_outlined, size: 64),
          const SizedBox(height: 22),
          Text(
            context.tr('Место для добрых слов', 'A place for kind words'),
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 10),
          Text(
            context.tr(
              'Здесь появятся пожелания от других людей.',
              'Wishes from others will appear here.',
            ),
          ),
          const SizedBox(height: 20),
          TextButton.icon(
            onPressed: () => setState(() => composing = true),
            icon: const Icon(Icons.north_east_rounded, size: 18),
            label: Text(
              context.tr('Поделиться теплом', 'Share a little kindness'),
            ),
          ),
        ],
      ),
    ),
  );

  @override
  Widget build(BuildContext context) => AsyncPanel(
    load: load,
    builder: (context, data, reload) {
      final letters = rows(data, 'messages');
      final t = Theme.of(context);
      final header = StudioHeader(
        eyebrow: context.tr('ТЕПЛО МЕЖДУ ЛЮДЬМИ', 'A LITTLE HUMAN KINDNESS'),
        title: composing
            ? context.tr('Новое пожелание', 'New wish')
            : context.tr('Добрые слова', 'Kind words'),
        action: TextButton.icon(
          onPressed: () {
            FocusManager.instance.primaryFocus?.unfocus();
            setState(() => composing = !composing);
          },
          icon: Icon(
            composing ? Icons.close_rounded : Icons.edit_outlined,
            size: 18,
          ),
          label: Text(
            composing
                ? context.tr('Для вас', 'For you')
                : context.tr('Написать', 'Write'),
          ),
        ),
      );
      final short =
          MediaQuery.sizeOf(context).height < 600 ||
          MediaQuery.textScalerOf(context).scale(14) >= 19;
      if (short || MediaQuery.sizeOf(context).width >= 700) {
        return PageBody(
          compact: true,
          children: [
            header,
            if (!composing && data['canSend'] == false) ...[
              _sendControl(data, reload),
              const SizedBox(height: 14),
            ],
            if (composing) ...[
              _recipient(),
              const SizedBox(height: 18),
              TextField(
                controller: message,
                minLines: 4,
                maxLines: 10,
                maxLength: 500,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(
                  hintText: context.tr(
                    'Несколько добрых слов…',
                    'A few kind words…',
                  ),
                ),
              ),
              const SizedBox(height: 16),
              _sendControl(data, reload),
            ] else ...[
              StudioRow(
                title: Text(context.tr('Для вас', 'For you')),
                trailing: IconButton(
                  tooltip: context.tr('Обновить', 'Refresh'),
                  onPressed: reload,
                  icon: const Icon(Icons.refresh_rounded),
                ),
              ),
              if (letters.isEmpty) _emptyMailbox(),
              for (var i = 0; i < letters.length; i++)
                _wishCard(context, letters[i], t, featured: i == 0),
            ],
          ],
        );
      }
      return Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            header,
            if (!composing && data['canSend'] == false) ...[
              _sendControl(data, reload),
              const SizedBox(height: 14),
            ],
            Expanded(
              child: AnimatedSwitcher(
                duration: studioDuration(
                  context,
                  const Duration(milliseconds: 260),
                ),
                child: composing
                    ? Column(
                        key: const ValueKey('wish-editor'),
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _recipient(),
                          const SizedBox(height: 12),
                          Expanded(
                            child: StudioPanel(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 18,
                                vertical: 12,
                              ),
                              child: TextField(
                                controller: message,
                                minLines: null,
                                maxLines: null,
                                expands: true,
                                maxLength: 500,
                                textCapitalization:
                                    TextCapitalization.sentences,
                                style: t.textTheme.bodyLarge,
                                decoration: InputDecoration(
                                  filled: false,
                                  border: InputBorder.none,
                                  enabledBorder: InputBorder.none,
                                  focusedBorder: InputBorder.none,
                                  hintText: context.tr(
                                    'Несколько добрых слов…',
                                    'A few kind words…',
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),
                          _sendControl(data, reload),
                        ],
                      )
                    : Column(
                        key: const ValueKey('wish-mailbox'),
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  context.tr('Для вас', 'For you'),
                                  style: t.textTheme.labelLarge,
                                ),
                              ),
                              Text(
                                '${letters.length}',
                                style: t.textTheme.labelSmall,
                              ),
                              IconButton(
                                tooltip: context.tr('Обновить', 'Refresh'),
                                onPressed: reload,
                                icon: const Icon(
                                  Icons.refresh_rounded,
                                  size: 20,
                                ),
                              ),
                            ],
                          ),
                          Expanded(
                            child: letters.isEmpty
                                ? _emptyMailbox()
                                : ListView.builder(
                                    itemCount: letters.length,
                                    padding: const EdgeInsets.only(
                                      top: 8,
                                      bottom: 8,
                                    ),
                                    itemBuilder: (context, index) => _wishCard(
                                      context,
                                      letters[index],
                                      t,
                                      featured: index == 0,
                                    ),
                                  ),
                          ),
                        ],
                      ),
              ),
            ),
          ],
        ),
      );
    },
  );

  Widget _wishCard(
    BuildContext context,
    Json item,
    ThemeData theme, {
    bool featured = false,
  }) {
    final id = (item['id'] as num).toInt();
    final isRead = item['is_read'] == true || locallyRead.contains(id);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(22),
          onTap: () => openMessage(item),
          child: StudioPanel(
            tone: featured ? StudioTone.accent : StudioTone.quiet,
            padding: EdgeInsets.all(featured ? 22 : 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      isRead
                          ? Icons.drafts_outlined
                          : Icons.mark_email_unread_outlined,
                      size: 18,
                      color: theme.colorScheme.primary,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        '${item['sent_at'] ?? ''}'.split('T').first,
                        style: theme.textTheme.labelSmall,
                      ),
                    ),
                    if (!isRead) AppBadge(label: context.tr('Новое', 'New')),
                  ],
                ),
                SizedBox(height: featured ? 22 : 14),
                Text(
                  '${item['message'] ?? ''}',
                  maxLines: featured ? 5 : 2,
                  overflow: TextOverflow.ellipsis,
                  style: featured
                      ? theme.textTheme.titleLarge?.copyWith(
                          height: 1.5,
                          fontWeight: FontWeight.w500,
                        )
                      : theme.textTheme.bodyLarge,
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        context.tr('Открыть пожелание', 'Read wish'),
                        style: theme.textTheme.labelMedium?.copyWith(
                          color: theme.colorScheme.primary,
                        ),
                      ),
                    ),
                    const Icon(Icons.arrow_outward_rounded, size: 18),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
