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
export async function createPayment(_req: Request, res: Response) {
  return res.status(503).json({ success: false, error: 'Payments are unavailable until server-side payment verification is configured' });
}

/**
 * Подтвердить платёж (завершить платёж)
 */
export async function confirmPayment(_req: Request, res: Response) {
  return res.status(503).json({ success: false, error: 'Payments are unavailable until server-side payment verification is configured' });
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
