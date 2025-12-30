/**
 * API Types для системы подписок
 * Используется в фронтенде для работы с лимитами
 */

export interface SubscriptionLimits {
  userId: number;
  tierId: number;
  tierName: 'Free' | 'Plus' | 'Professional';
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

export interface LimitsResponse {
  success: boolean;
  limits?: SubscriptionLimits;
  error?: string;
}

export interface LimitExceededError {
  success: false;
  error: string;
  reason?: string;
  limits?: SubscriptionLimits;
}

export interface SubscriptionTier {
  id: number;
  name: string;
  slug: 'free' | 'plus' | 'pro';
  dailyChatLimit: number;
  dailyVoiceLimit: number;
  dailyMoodAnalysisLimit: number;
  dailyJournalLimit: number;
  chatHistoryDays: number;
  hasTTS: boolean;
  hasExport: boolean;
  priorityLevel: number;
}

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  free: {
    id: 1,
    name: 'Free',
    slug: 'free',
    dailyChatLimit: 5,
    dailyVoiceLimit: 1,
    dailyMoodAnalysisLimit: 3,
    dailyJournalLimit: 1,
    chatHistoryDays: 30,
    hasTTS: false,
    hasExport: false,
    priorityLevel: 1,
  },
  plus: {
    id: 2,
    name: 'Plus',
    slug: 'plus',
    dailyChatLimit: 50,
    dailyVoiceLimit: 999,
    dailyMoodAnalysisLimit: 999,
    dailyJournalLimit: 999,
    chatHistoryDays: 180,
    hasTTS: true,
    hasExport: true,
    priorityLevel: 2,
  },
  pro: {
    id: 3,
    name: 'Professional',
    slug: 'pro',
    dailyChatLimit: 200,
    dailyVoiceLimit: 999,
    dailyMoodAnalysisLimit: 999,
    dailyJournalLimit: 999,
    chatHistoryDays: 999,
    hasTTS: true,
    hasExport: true,
    priorityLevel: 3,
  },
};

/**
 * Получить оставшееся количество запросов
 */
export function getRemainingRequests(limits: SubscriptionLimits, type: 'chat' | 'voice' | 'mood' | 'journal'): number {
  switch (type) {
    case 'chat':
      return Math.max(0, limits.dailyChatLimit - limits.dailyChatUsed);
    case 'voice':
      return Math.max(0, limits.dailyVoiceLimit - limits.dailyVoiceUsed);
    case 'mood':
      return Math.max(0, limits.dailyMoodAnalysisLimit - limits.dailyMoodAnalysisUsed);
    case 'journal':
      return Math.max(0, limits.dailyJournalLimit - limits.dailyJournalUsed);
    default:
      return 0;
  }
}

/**
 * Проверить, достигнут ли лимит
 */
export function isLimitReached(limits: SubscriptionLimits, type: 'chat' | 'voice' | 'mood' | 'journal'): boolean {
  return getRemainingRequests(limits, type) === 0;
}

/**
 * Получить процент использования лимита
 */
export function getLimitPercentage(limits: SubscriptionLimits, type: 'chat' | 'voice' | 'mood' | 'journal'): number {
  let limit = 0;
  let used = 0;

  switch (type) {
    case 'chat':
      limit = limits.dailyChatLimit;
      used = limits.dailyChatUsed;
      break;
    case 'voice':
      limit = limits.dailyVoiceLimit;
      used = limits.dailyVoiceUsed;
      break;
    case 'mood':
      limit = limits.dailyMoodAnalysisLimit;
      used = limits.dailyMoodAnalysisUsed;
      break;
    case 'journal':
      limit = limits.dailyJournalLimit;
      used = limits.dailyJournalUsed;
      break;
  }

  if (limit === 999) return 100; // Unlimited
  return Math.round((used / limit) * 100);
}

/**
 * Получить сообщение об ограничении
 */
export function getLimitMessage(limits: SubscriptionLimits, type: 'chat' | 'voice' | 'mood' | 'journal'): string {
  const remaining = getRemainingRequests(limits, type);
  const typeNames = {
    chat: 'сообщений в чате',
    voice: 'голосовых сообщений',
    mood: 'анализов настроения',
    journal: 'записей в журнал',
  };

  if (remaining === 0) {
    return `Дневной лимит ${typeNames[type]} исчерпан. Попробуйте завтра.`;
  }

  return `Осталось ${remaining} ${typeNames[type]} сегодня`;
}
