import { useState, useEffect } from 'react';
import { api } from '@/services/api';

export interface UserLimits {
  tier: string;
  dailyChatUsed: number;
  dailyChatLimit: number;
  dailyVoiceUsed: number;
  dailyVoiceLimit: number;
  dailyAnalysisUsed: number;
  dailyAnalysisLimit: number;
  dailyJournalUsed: number;
  dailyJournalLimit: number;
}

export function useSubscriptionLimits() {
  const [limits, setLimits] = useState<UserLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLimits();
  }, []);

  const loadLimits = async () => {
    try {
      setLoading(true);
      const response = await api.get('/subscriptions/limits');
      
      if (response.data?.success && response.data?.limits) {
        setLimits(response.data.limits);
        setError(null);
      } else {
        setError('Failed to load limits');
      }
    } catch (err) {
      console.error('Error loading subscription limits:', err);
      setError(err instanceof Error ? err.message : 'Error loading limits');
    } finally {
      setLoading(false);
    }
  };

  const refreshLimits = async () => {
    await loadLimits();
  };

  const canSendMessage = (): boolean => {
    if (!limits) return true;
    return limits.dailyChatUsed < limits.dailyChatLimit;
  };

  const canRecordVoice = (): boolean => {
    if (!limits) return true;
    return limits.dailyVoiceUsed < limits.dailyVoiceLimit;
  };

  const canPerformAnalysis = (): boolean => {
    if (!limits) return true;
    return limits.dailyAnalysisUsed < limits.dailyAnalysisLimit;
  };

  const canWriteJournal = (): boolean => {
    if (!limits) return true;
    return limits.dailyJournalUsed < limits.dailyJournalLimit;
  };

  const getRemainingMessages = (): number => {
    if (!limits) return 0;
    return limits.dailyChatLimit - limits.dailyChatUsed;
  };

  const getRemainingVoice = (): number => {
    if (!limits) return 0;
    return limits.dailyVoiceLimit - limits.dailyVoiceUsed;
  };

  return {
    limits,
    loading,
    error,
    refreshLimits,
    canSendMessage,
    canRecordVoice,
    canPerformAnalysis,
    canWriteJournal,
    getRemainingMessages,
    getRemainingVoice,
  };
}
