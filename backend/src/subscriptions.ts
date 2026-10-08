import { Request, Response, NextFunction } from 'express';
import { query } from './db';
import { verifyToken } from './auth';

/**
 * Интерфейс для информации о лимитах пользователя
 */
export interface UserLimits {
  userId: number;
  tierId: number;
  tierName: string;
  dailyChatLimit: number;
  dailyChatUsed: number;
  dailyVoiceLimit: number;
  dailyVoiceUsed: number;
  dailyMoodAnalysisLimit: number;
  dailyMoodAnalysisUsed: number;
  dailyJournalLimit: number;
  dailyJournalUsed: number;
  chatHistoryDays: number;
  hasTTS: boolean;
  hasExport: boolean;
  priorityLevel: number;
  subscriptionExpiresAt: string | null;
  isExpired: boolean;
}

/**
 * Получить информацию о лимитах пользователя
 */
export async function getUserLimits(userId: number): Promise<UserLimits | null> {
  try {
    const result = await query(
      `
      SELECT 
        u.id as user_id,
        st.id as tier_id,
        st.name as tier_name,
        st.daily_chat_limit,
        st.daily_voice_limit,
        st.daily_mood_analysis_limit,
        st.daily_journal_limit,
        st.chat_history_days,
        st.has_tts,
        st.has_export,
        st.priority_level,
        u.subscription_expires_at,
        COALESCE(dl.chat_requests_used, 0) as daily_chat_used,
        COALESCE(dl.voice_messages_used, 0) as daily_voice_used,
        COALESCE(dl.mood_analysis_used, 0) as daily_mood_analysis_used,
        COALESCE(dl.journal_entries_used, 0) as daily_journal_used
      FROM users u
      LEFT JOIN subscription_tiers st ON st.id = CASE WHEN u.subscription_expires_at <= NOW() OR u.subscription_tier_id IS NULL THEN (SELECT id FROM subscription_tiers WHERE slug='free') ELSE u.subscription_tier_id END
      LEFT JOIN daily_limits dl ON u.id = dl.user_id AND dl.reset_date = CURRENT_DATE
      WHERE u.id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const expiresAt = row.subscription_expires_at ? new Date(row.subscription_expires_at) : null;
    const isExpired = expiresAt && expiresAt < new Date();

    return {
      userId: row.user_id,
      tierId: row.tier_id,
      tierName: row.tier_name || 'Free',
      dailyChatLimit: row.daily_chat_limit ?? 5,
      dailyChatUsed: row.daily_chat_used || 0,
      dailyVoiceLimit: row.daily_voice_limit ?? 1,
      dailyVoiceUsed: row.daily_voice_used || 0,
      dailyMoodAnalysisLimit: row.daily_mood_analysis_limit ?? 3,
      dailyMoodAnalysisUsed: row.daily_mood_analysis_used || 0,
      dailyJournalLimit: row.daily_journal_limit ?? 1,
      dailyJournalUsed: row.daily_journal_used || 0,
      chatHistoryDays: row.chat_history_days ?? 30,
      hasTTS: row.has_tts || false,
      hasExport: row.has_export || false,
      priorityLevel: row.priority_level ?? 1,
      subscriptionExpiresAt: row.subscription_expires_at,
      isExpired: isExpired || false,
    };
  } catch (error) {
    console.error('❌ Error getting user limits:', error);
    return null;
  }
}

/**
 * Увеличить счётчик использования лимита
 */
export async function incrementLimitCounter(
  userId: number,
  counterType: 'chat_requests' | 'voice_messages' | 'mood_analysis' | 'journal_entries'
): Promise<boolean> {
  try {
    const columnMap = {
      chat_requests: 'chat_requests_used',
      voice_messages: 'voice_messages_used',
      mood_analysis: 'mood_analysis_used',
      journal_entries: 'journal_entries_used',
    };

    const column = columnMap[counterType];

    // Создаём или обновляем запись за текущий день
    await query(
      `
      INSERT INTO daily_limits (user_id, reset_date, ${column})
      VALUES ($1, CURRENT_DATE, 1)
      ON CONFLICT (user_id, reset_date)
      DO UPDATE SET ${column} = daily_limits.${column} + 1, updated_at = NOW()
      `,
      [userId]
    );

    return true;
  } catch (error) {
    console.error(`❌ Error incrementing ${counterType}:`, error);
    return false;
  }
}

/**
 * Проверить, может ли пользователь использовать функцию
 */
export async function checkFeatureAccess(
  userId: number,
  feature: 'voice' | 'mood_analysis' | 'journal' | 'tts' | 'export'
): Promise<{ allowed: boolean; reason?: string; limitsInfo?: UserLimits }> {
  try {
    const limits = await getUserLimits(userId);

    if (!limits) {
      return { allowed: false, reason: 'User not found' };
    }


    switch (feature) {
      case 'voice':
        if (limits.dailyVoiceUsed >= limits.dailyVoiceLimit) {
          return {
            allowed: false,
            reason: `Daily voice message limit reached (${limits.dailyVoiceUsed}/${limits.dailyVoiceLimit})`,
            limitsInfo: limits,
          };
        }
        return { allowed: true, limitsInfo: limits };

      case 'mood_analysis':
        if (limits.dailyMoodAnalysisUsed >= limits.dailyMoodAnalysisLimit) {
          return {
            allowed: false,
            reason: `Daily mood analysis limit reached (${limits.dailyMoodAnalysisUsed}/${limits.dailyMoodAnalysisLimit})`,
            limitsInfo: limits,
          };
        }
        return { allowed: true, limitsInfo: limits };

      case 'journal':
        if (limits.dailyJournalUsed >= limits.dailyJournalLimit) {
          return {
            allowed: false,
            reason: `Daily journal entries limit reached (${limits.dailyJournalUsed}/${limits.dailyJournalLimit})`,
            limitsInfo: limits,
          };
        }
        return { allowed: true, limitsInfo: limits };

      case 'tts':
        if (!limits.hasTTS) {
          return {
            allowed: false,
            reason: 'Text-to-speech is not available in your subscription tier',
            limitsInfo: limits,
          };
        }
        return { allowed: true, limitsInfo: limits };

      case 'export':
        if (!limits.hasExport) {
          return {
            allowed: false,
            reason: 'Export is not available in your subscription tier',
            limitsInfo: limits,
          };
        }
        return { allowed: true, limitsInfo: limits };

      default:
        return { allowed: false, reason: 'Unknown feature' };
    }
  } catch (error) {
    console.error('❌ Error checking feature access:', error);
    return { allowed: false, reason: 'Internal server error' };
  }
}

/**
 * Проверить, может ли пользователь отправить сообщение (чат)
 */
export async function checkChatLimitAccess(userId: number): Promise<{
  allowed: boolean;
  reason?: string;
  limitsInfo?: UserLimits;
}> {
  try {
    const limits = await getUserLimits(userId);

    if (!limits) {
      return { allowed: false, reason: 'User not found' };
    }


    if (limits.dailyChatUsed >= limits.dailyChatLimit) {
      return {
        allowed: false,
        reason: `Daily chat limit reached (${limits.dailyChatUsed}/${limits.dailyChatLimit}). Next reset at 00:00 UTC`,
        limitsInfo: limits,
      };
    }

    return { allowed: true, limitsInfo: limits };
  } catch (error) {
    console.error('❌ Error checking chat limit:', error);
    return { allowed: false, reason: 'Internal server error' };
  }
}

/**
 * Middleware для проверки лимитов чата
 */
export const checkChatLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    const access = await checkChatLimitAccess(decoded.userId);

    if (!access.allowed) {
      return res.status(429).json({
        success: false,
        error: access.reason,
        limits: access.limitsInfo,
      });
    }

    if (!await reserveDailyLimit(decoded.userId, 'chat_requests', access.limitsInfo!.dailyChatLimit)) return res.status(429).json({ success: false, error: 'Daily chat limit reached' });

    // Сохраняем информацию о лимитах в request для дальнейшего использования
    (req as any).userLimits = access.limitsInfo;
    next();
  } catch (error) {
    console.error('❌ Error in checkChatLimit middleware:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Сбросить лимиты (вызывается ежедневно, например через cron)
 */
export async function resetDailyLimits(): Promise<boolean> {
  try {
    // Удаляем старые записи (старше 90 дней)
    await query(
      `DELETE FROM daily_limits WHERE reset_date < CURRENT_DATE - INTERVAL '90 days'`
    );

    console.log('✅ Daily limits reset completed');
    return true;
  } catch (error) {
    console.error('❌ Error resetting daily limits:', error);
    return false;
  }
}

/**
 * Установить подписку пользователю
 */
export async function setUserSubscription(
  userId: number,
  tierSlug: 'free' | 'plus' | 'pro',
  expiresAt?: Date
): Promise<boolean> {
  try {
    const tierResult = await query(
      `SELECT id FROM subscription_tiers WHERE slug = $1`,
      [tierSlug]
    );

    if (tierResult.rows.length === 0) {
      console.error(`❌ Tier ${tierSlug} not found`);
      return false;
    }

    const tierId = tierResult.rows[0].id;

    await query(
      `
      UPDATE users 
      SET subscription_tier_id = $1, subscription_expires_at = $2
      WHERE id = $3
      `,
      [tierId, expiresAt || null, userId]
    );

    // Логируем в историю
    await query(
      `
      INSERT INTO subscription_history (user_id, tier_id, started_at, ended_at, status)
      VALUES ($1, $2, NOW(), $3, 'active')
      `,
      [userId, tierId, expiresAt || null]
    );

    console.log(`✅ User ${userId} subscribed to ${tierSlug}`);
    return true;
  } catch (error) {
    console.error('❌ Error setting user subscription:', error);
    return false;
  }
}

/** Atomic admission: concurrent requests cannot exceed the selected daily quota. */
export async function reserveDailyLimit(userId: number, type: 'chat_requests' | 'voice_messages' | 'mood_analysis' | 'journal_entries', limit: number): Promise<boolean> {
  const columns = { chat_requests: 'chat_requests_used', voice_messages: 'voice_messages_used', mood_analysis: 'mood_analysis_used', journal_entries: 'journal_entries_used' };
  const column = columns[type];
  if (!column || !Number.isInteger(limit) || limit <= 0) return false;
  const result = await query(`INSERT INTO daily_limits (user_id,reset_date,${column}) VALUES ($1,CURRENT_DATE,1)
    ON CONFLICT (user_id,reset_date) DO UPDATE SET ${column}=daily_limits.${column}+1,updated_at=NOW()
    WHERE daily_limits.${column} < $2 RETURNING user_id`, [userId,limit]);
  return result.rows.length > 0;
}
