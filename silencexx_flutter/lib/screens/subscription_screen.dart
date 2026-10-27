import 'package:flutter/material.dart';
import '../core/api.dart';
import '../core/app_state.dart';
import '../widgets/common.dart';
import '../widgets/studio.dart';

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});
  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  String? selected;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: StudioTopBar(
      title: Text(context.tr('Подписка и платежи', 'Subscription and billing')),
    ),
    body: AsyncPanel(
      load: () async {
        final api = context.app.api;
        final results = await Future.wait([
          api.call('/subscriptions/current'),
          api.call('/subscriptions/available-plans'),
          api.call('/subscriptions/limits'),
          api.call('/payments/history'),
        ]);
        return {for (final result in results) ...result};
      },
      builder: (context, data, reload) {
        final subscription = data['subscription'] as Json? ?? {};
        final limits = data['limits'] as Json? ?? {};
        final plans = rows(data, 'plans');
        final payments = rows(data, 'payments');
        final matching = plans.where((p) => p['slug'] == selected);
        final plan = matching.isNotEmpty
            ? matching.first
            : plans.isEmpty
            ? null
            : plans.first;
        final t = Theme.of(context);
        return PageBody(
          compact: true,
          children: [
            StudioHeader(
              eyebrow: 'CLOUDMIND / ${context.tr('ВОЗМОЖНОСТИ', 'MEMBERSHIP')}',
              title: context.tr('Подписка', 'Membership'),
            ),
            StudioPanel(
              tone: StudioTone.accent,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      const StudioGlyph(
                        Icons.workspace_premium_outlined,
                        size: 46,
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              context.tr('ТЕКУЩИЙ ТАРИФ', 'CURRENT PLAN'),
                              style: t.textTheme.labelSmall,
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '${subscription['name'] ?? 'Free'}',
                              style: t.textTheme.headlineMedium,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (subscription['daysUntilExpiry'] != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      context.tr(
                        'Осталось дней: ${subscription['daysUntilExpiry']}',
                        'Days remaining: ${subscription['daysUntilExpiry']}',
                      ),
                    ),
                  ],
                  if (subscription['slug'] != 'free' &&
                      subscription['slug'] != null) ...[
                    const SizedBox(height: 16),
                    ActionButton(
                      secondary: true,
                      label: context.tr(
                        'Отменить подписку',
                        'Cancel subscription',
                      ),
                      action: () async {
                        final api = context.app.api;
                        if (!await confirm(
                          context,
                          context.tr('Перейти на Free?', 'Switch to Free?'),
                        )) {
                          return;
                        }
                        await api.call('/subscriptions/cancel', method: 'POST');
                        reload();
                      },
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 24),
            Text(
              context.tr('Сегодня', 'Today'),
              style: t.textTheme.titleMedium,
            ),
            const SizedBox(height: 10),
            StudioPanel(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
              child: Column(
                children: [
                  for (final pair in [
                    ('Chat', context.tr('Сообщения', 'Messages')),
                    ('Voice', context.tr('Голос', 'Voice')),
                    (
                      'Analysis',
                      context.tr('Анализ настроения', 'Mood analysis'),
                    ),
                    ('Journal', context.tr('Дневник', 'Journal')),
                  ])
                    _UsageMeter(
                      label: pair.$2,
                      used: limits['daily${pair.$1}Used'],
                      limit: limits['daily${pair.$1}Limit'],
                    ),
                ],
              ),
            ),
            const SizedBox(height: 28),
            Text(
              context.tr('Сравнить тарифы', 'Compare plans'),
              style: t.textTheme.headlineSmall,
            ),
            const SizedBox(height: 14),
            if (plans.isEmpty)
              StudioNotice(
                message: context.tr(
                  'Тарифы пока недоступны',
                  'Plans are unavailable right now',
                ),
              ),
            if (plan != null) ...[
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final item in plans)
                    StudioChoice(
                      label: Text('${item['name']}'),
                      selected: item['slug'] == plan['slug'],
                      onSelected: (_) =>
                          setState(() => selected = '${item['slug']}'),
                    ),
                ],
              ),
              const SizedBox(height: 14),
              StudioResize(
                duration: studioDuration(context),
                alignment: Alignment.topCenter,
                child: StudioPanel(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Wrap(
                        alignment: WrapAlignment.spaceBetween,
                        crossAxisAlignment: WrapCrossAlignment.end,
                        spacing: 20,
                        runSpacing: 10,
                        children: [
                          Text(
                            '${plan['name']}',
                            style: t.textTheme.titleLarge,
                          ),
                          Text(
                            '${plan['price_monthly']} ₽',
                            style: t.textTheme.headlineMedium,
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        context.tr('в месяц', 'per month'),
                        textAlign: TextAlign.end,
                        style: t.textTheme.bodySmall,
                      ),
                      const SizedBox(height: 18),
                      Text('${plan['description'] ?? ''}'),
                      const SizedBox(height: 12),
                      StudioRow(
                        dense: true,
                        leading: const Icon(Icons.forum_outlined, size: 18),
                        title: Text(
                          context.tr('Сообщений в день', 'Messages per day'),
                        ),
                        trailing: Text(
                          '${plan['daily_chat_limit'] == -1 ? '∞' : plan['daily_chat_limit'] ?? '—'}',
                          style: t.textTheme.titleMedium,
                        ),
                      ),
                      if (plan['slug'] != 'free') ...[
                        const SizedBox(height: 14),
                        OutlinedButton(
                          onPressed: () async {
                            await Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => PaymentScreen(plan: plan),
                              ),
                            );
                            if (context.mounted) reload();
                          },
                          child: Text(context.tr('Подробнее', 'View plan')),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 22),
            StudioDisclosure(
              title: Text(context.tr('История платежей', 'Payment history')),
              leading: const StudioGlyph(Icons.receipt_long_outlined, size: 34),
              expandedCrossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (payments.isEmpty)
                  Text(context.tr('Платежей пока нет', 'No payments yet')),
                for (final payment in payments)
                  StudioRow(
                    title: Text(
                      '${payment['tier_slug']} · ${payment['amount']} ${payment['currency']}',
                    ),
                    subtitle: Text(
                      '${payment['status']} · ${payment['created_at']}',
                    ),
                  ),
              ],
            ),
          ],
        );
      },
    ),
  );
}

class PaymentScreen extends StatelessWidget {
  const PaymentScreen({super.key, required this.plan});
  final Json plan;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: StudioTopBar(
      title: Text(context.tr('Оформление подписки', 'Choose subscription')),
    ),
    body: StudioActionLayout(
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          StudioHeader(
            eyebrow: context.tr('ВАШ ВЫБОР', 'YOUR SELECTION'),
            title: '${plan['name']}',
            icon: Icons.workspace_premium_outlined,
          ),
          StudioPanel(
            tone: StudioTone.accent,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  context.tr('Стоимость подписки', 'Subscription price'),
                  style: Theme.of(context).textTheme.labelLarge,
                ),
                const SizedBox(height: 18),
                Text(
                  '${plan['price_monthly']} ₽',
                  style: Theme.of(context).textTheme.displaySmall,
                ),
                Text(context.tr('в месяц', 'per month')),
                const SizedBox(height: 20),
                const Divider(),
                const SizedBox(height: 12),
                Text('${plan['description'] ?? ''}'),
              ],
            ),
          ),
          const SizedBox(height: 22),
          StudioNotice(
            icon: Icons.schedule_rounded,
            message: context.tr(
              'Покупка подписок пока недоступна. Мы сообщим, когда оплата будет подключена.',
              'Subscriptions are not available for purchase yet. We will let you know when payments are ready.',
            ),
          ),
        ],
      ),
      action: FilledButton(
        onPressed: null,
        child: Text(
          context.tr(
            'Оплата пока недоступна',
            'Payments are not available yet',
          ),
        ),
      ),
    ),
  );
}

class _UsageMeter extends StatelessWidget {
  const _UsageMeter({required this.label, this.used, this.limit});
  final String label;
  final dynamic used, limit;
  @override
  Widget build(BuildContext context) {
    final usedCount = num.tryParse('$used');
    final limitCount = num.tryParse('$limit');
    final value = usedCount != null && limitCount != null && limitCount > 0
        ? (usedCount / limitCount).clamp(0.0, 1.0).toDouble()
        : 0.0;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
              Text(
                '${usedCount ?? '—'} / ${limitCount == -1 ? '∞' : limitCount ?? '—'}',
                style: Theme.of(context).textTheme.labelLarge,
              ),
            ],
          ),
          if (limitCount != null && limitCount >= 0) ...[
            const SizedBox(height: 10),
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: value),
              duration: studioDuration(context),
              builder: (context, v, _) => ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: v,
                  minHeight: 3,
                  semanticsLabel: label,
                  semanticsValue: '${(v * 100).round()}%',
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
