import 'package:flutter/material.dart';
import '../core/api.dart';
import '../core/app_state.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_spacing.dart';
import '../widgets/common.dart';

class SubscriptionScreen extends StatelessWidget {
  const SubscriptionScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
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
        return {for (final data in results) ...data};
      },
      builder: (context, data, reload) {
        final subscription = data['subscription'] as Json? ?? {};
        final limits = data['limits'] as Json? ?? {};
        return PageBody(
          children: [
            SectionCard(
              child: Row(
                children: [
                  const Icon(Icons.workspace_premium_outlined, color: AppColors.primaryBright),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      '${subscription['name'] ?? 'Free'}',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                  ),
                ],
              ),
            ),
            if (subscription['daysUntilExpiry'] != null)
              Text(
                context.tr(
                  'Осталось дней: ${subscription['daysUntilExpiry']}',
                  'Days remaining: ${subscription['daysUntilExpiry']}',
                ),
              ),
            SectionCard(
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
                    ListTile(
                      title: Text(pair.$2),
                      trailing: Text(
                        '${limits['daily${pair.$1}Used'] ?? 0} / ${limits['daily${pair.$1}Limit'] == -1 ? '∞' : limits['daily${pair.$1}Limit'] ?? '—'}',
                      ),
                    ),
                ],
              ),
            ),
            if (subscription['slug'] != 'free' && subscription['slug'] != null)
              ActionButton(
                label: context.tr('Отменить подписку', 'Cancel subscription'),
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
            const SizedBox(height: AppSpacing.xl),
            Text(
              context.tr('Тарифы', 'Plans'),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            for (final plan in rows(data, 'plans'))
              SectionCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${plan['name']} · ${plan['price_monthly']} ₽ / ${context.tr('мес.', 'month')}',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text('${plan['description'] ?? ''}'),
                    Text(
                      context.tr(
                        'Сообщений в день: ${plan['daily_chat_limit'] == -1 ? '∞' : plan['daily_chat_limit']}',
                        'Messages per day: ${plan['daily_chat_limit'] == -1 ? '∞' : plan['daily_chat_limit']}',
                      ),
                    ),
                    if (plan['slug'] != 'free') ...[
                      const SizedBox(height: AppSpacing.sm),
                      FilledButton(
                        onPressed: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => PaymentScreen(plan: plan),
                            ),
                          );
                          if (context.mounted) reload();
                        },
                        child: Text(context.tr('Выбрать', 'Choose')),
                      ),
                    ],
                  ],
                ),
              ),
            const SizedBox(height: AppSpacing.xl),
            Text(
              context.tr('История платежей', 'Payment history'),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            for (final payment in rows(data, 'payments'))
              ListTile(
                title: Text(
                  '${payment['tier_slug']} · ${payment['amount']} ${payment['currency']}',
                ),
                subtitle: Text(
                  '${payment['status']} · ${payment['created_at']}',
                ),
              ),
          ],
        );
      },
    ),
  );
}

class PaymentScreen extends StatefulWidget {
  const PaymentScreen({super.key, required this.plan});
  final Json plan;
  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  final email = TextEditingController();
  String? transactionId;
  @override
  void dispose() {
    email.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(context.tr('Оформление подписки', 'Choose subscription')),
    ),
    body: PageBody(
      children: [
        Text(
          '${widget.plan['name']} · ${widget.plan['price_monthly']} ₽',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: AppSpacing.lg),
        SectionCard(
          child: Text(
            context.tr(
              'Демонстрационный платёж. Реального списания денег нет. Backend пока использует симуляцию оплаты.',
              'Demo payment. No money will be charged. The backend currently simulates payments.',
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        TextField(
          controller: email,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(labelText: 'Email'),
        ),
        const SizedBox(height: AppSpacing.md),
        ActionButton(
          label: context.tr(
            'Активировать в демо-режиме',
            'Activate in demo mode',
          ),
          action: () async {
            if (!RegExp(r'^\S+@\S+\.\S+$').hasMatch(email.text.trim())) {
              throw ApiException(
                context.tr('Введите email.', 'Enter an email address.'),
              );
            }
            final api = context.app.api;
            if (transactionId == null) {
              final payment = await api.call(
                '/payments/create',
                method: 'POST',
                body: {
                  'tierSlug': widget.plan['slug'],
                  'paymentMethod': 'card',
                  'email': email.text.trim(),
                },
              );
              transactionId = payment['transactionId'] as String;
            }
            await api.call(
              '/payments/confirm',
              method: 'POST',
              body: {'transactionId': transactionId},
            );
            if (context.mounted) Navigator.pop(context);
          },
        ),
      ],
    ),
  );
}
