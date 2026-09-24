import { Request, Response } from 'express';
import { query } from './db';
import { verifyToken } from './auth';
import crypto from 'crypto';

/**
 * Симуляция платежной системы (для demo)
 * В продакшене заменить на Stripe, YooKassa и т.д.
 */

export interface PaymentRequest {
  userId: number;
  tierSlug: 'free' | 'plus' | 'pro';
  amount: number;
  currency: string;
  paymentMethod: 'card' | 'apple' | 'google' | 'sbp';
  email: string;
}

export interface PaymentTransaction {
  id: string;
  userId: number;
  tierSlug: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: string;
  email: string;
  createdAt: Date;
  completedAt?: Date;
  failureReason?: string;
}

/**
 * Создать платёж
 */
export async function createPayment(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
    }

    let userId: number;
    try {
      const decoded = verifyToken(token);
      userId = decoded.userId;
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Невалидный токен' });
    }

    const { tierSlug, paymentMethod, email } = req.body;

    if (!tierSlug || !paymentMethod || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tierSlug, paymentMethod, email',
      });
    }

    // Получить информацию о тарифе
    const tierResult = await query(
      `SELECT id, name, price_monthly FROM subscription_tiers WHERE slug = $1`,
      [tierSlug]
    );

    if (tierResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Tier not found' });
    }

    const tier = tierResult.rows[0];
    const amount = tier.price_monthly;

    // Создать транзакцию в БД
    const transactionId = `pay_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    const insertResult = await query(
      `
      INSERT INTO payment_transactions 
      (transaction_id, user_id, tier_slug, amount, currency, payment_method, email, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id, transaction_id, status, created_at
      `,
      [transactionId, userId, tierSlug, amount, 'RUB', paymentMethod, email, 'pending']
    );

    console.log(`💳 Payment created for user ${userId}: ${transactionId}`);

    res.json({
      success: true,
      transactionId,
      amount,
      tier: tier.name,
      status: 'pending',
      createdAt: insertResult.rows[0].created_at,
    });
  } catch (error) {
    console.error('❌ Error creating payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment',
    });
  }
}

/**
 * Подтвердить платёж (завершить платёж)
 */
export async function confirmPayment(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
    }

    let userId: number;
    try {
      const decoded = verifyToken(token);
      userId = decoded.userId;
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Невалидный токен' });
    }

    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ success: false, error: 'Missing transactionId' });
    }

    // Получить информацию о платеже
    const paymentResult = await query(
      `SELECT * FROM payment_transactions WHERE transaction_id = $1 AND user_id = $2`,
      [transactionId, userId]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    const payment = paymentResult.rows[0];

    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Payment already ${payment.status}`,
      });
    }

    // В реальной системе здесь проходил бы платеж через Stripe/YooKassa
    // Для демо - просто одобряем платеж
    const isApproved = Math.random() > 0.05; // 95% успешность для demo

    if (!isApproved) {
      // Платеж отклонён
      await query(
        `
        UPDATE payment_transactions 
        SET status = $1, failure_reason = $2, completed_at = NOW()
        WHERE transaction_id = $3
        `,
        ['failed', 'Payment declined by payment processor', transactionId]
      );

      console.log(`❌ Payment failed: ${transactionId}`);

      return res.json({
        success: false,
        error: 'Payment declined',
        transactionId,
      });
    }

    // Платеж одобрен - обновляем подписку
    const tierResult = await query(
      `SELECT id FROM subscription_tiers WHERE slug = $1`,
      [payment.tier_slug]
    );

    if (tierResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Tier not found' });
    }

    const tierId = tierResult.rows[0].id;

    // Установить подписку на 30 дней
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await query(
      `
      UPDATE users 
      SET subscription_tier_id = $1, subscription_expires_at = $2
      WHERE id = $3
      `,
      [tierId, expiresAt, userId]
    );

    // Отметить платеж как завершённый
    await query(
      `
      UPDATE payment_transactions 
      SET status = $1, completed_at = NOW()
      WHERE transaction_id = $2
      `,
      ['completed', transactionId]
    );

    // Логировать в историю подписок
    await query(
      `
      INSERT INTO subscription_history (user_id, tier_id, started_at, status)
      VALUES ($1, $2, NOW(), $3)
      `,
      [userId, tierId, 'active']
    );

    console.log(
      `✅ Payment confirmed: ${transactionId} - User ${userId} upgraded to tier ${payment.tier_slug}`
    );

    res.json({
      success: true,
      transactionId,
      message: 'Subscription activated successfully',
      expiresAt,
    });
  } catch (error) {
    console.error('❌ Error confirming payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm payment',
    });
  }
}

/**
 * Получить историю платежей пользователя
 */
export async function getPaymentHistory(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
    }

    let userId: number;
    try {
      const decoded = verifyToken(token);
      userId = decoded.userId;
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Невалидный токен' });
    }

    const result = await query(
      `
      SELECT 
        transaction_id,
        tier_slug,
        amount,
        currency,
        payment_method,
        status,
        created_at,
        completed_at,
        failure_reason
      FROM payment_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [userId]
    );

    res.json({
      success: true,
      payments: result.rows,
    });
  } catch (error) {
    console.error('❌ Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment history',
    });
  }
}

/**
 * Получить список доступных тарифов
 */
export async function getAvailablePlans(req: Request, res: Response) {
  try {
    const result = await query(
      `
      SELECT 
        id,
        slug,
        name,
        price_monthly,
        daily_chat_limit,
        daily_voice_limit,
        daily_mood_analysis_limit,
        daily_journal_limit,
        chat_history_days,
        has_tts,
        has_export,
        priority_level,
        description
      FROM subscription_tiers
      ORDER BY priority_level
      `
    );

    res.json({
      success: true,
      plans: result.rows,
    });
  } catch (error) {
    console.error('❌ Error fetching available plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plans',
    });
  }
}

/**
 * Отменить подписку
 */
export async function cancelSubscription(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
    }

    let userId: number;
    try {
      const decoded = verifyToken(token);
      userId = decoded.userId;
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Невалидный токен' });
    }

    // Переключить на Free план
    const freeResult = await query(
      `SELECT id FROM subscription_tiers WHERE slug = $1`,
      ['free']
    );

    if (freeResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Free tier not found' });
    }

    const freeTierId = freeResult.rows[0].id;

    await query(
      `
      UPDATE users 
      SET subscription_tier_id = $1, subscription_expires_at = NULL
      WHERE id = $2
      `,
      [freeTierId, userId]
    );

    // Логировать отмену
    await query(
      `
      INSERT INTO subscription_history (user_id, tier_id, status)
      VALUES ($1, $2, $3)
      `,
      [userId, freeTierId, 'cancelled']
    );

    console.log(`❌ Subscription cancelled for user ${userId}`);

    res.json({
      success: true,
      message: 'Subscription cancelled. You are now on Free plan',
    });
  } catch (error) {
    console.error('❌ Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription',
    });
  }
}

/**
 * Получить текущую подписку пользователя
 */
export async function getCurrentSubscription(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
    }

    let userId: number;
    try {
      const decoded = verifyToken(token);
      userId = decoded.userId;
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Невалидный токен' });
    }

    const result = await query(
      `
      SELECT 
        st.id,
        st.slug,
        st.name,
        st.price_monthly,
        st.daily_chat_limit,
        st.daily_voice_limit,
        st.daily_mood_analysis_limit,
        st.daily_journal_limit,
        st.chat_history_days,
        st.has_tts,
        st.has_export,
        u.subscription_expires_at
      FROM users u
      LEFT JOIN subscription_tiers st ON u.subscription_tier_id = st.id
      WHERE u.id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const subscription = result.rows[0];
    const expiresAt = subscription.subscription_expires_at
      ? new Date(subscription.subscription_expires_at)
      : null;
    const isExpired = expiresAt && expiresAt < new Date();

    res.json({
      success: true,
      subscription: {
        ...subscription,
        isExpired: isExpired || false,
        daysUntilExpiry: expiresAt
          ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching current subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription',
    });
  }
}
