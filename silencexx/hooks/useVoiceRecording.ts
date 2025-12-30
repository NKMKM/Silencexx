/**
 * React Hook для управления записью аудио
 * silencexx/hooks/useVoiceRecording.ts
 *
 * Предоставляет простой интерфейс для работы с записью аудио в компонентах
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  AudioRecordingManager,
  getRecordingManager,
  destroyRecordingManager,
} from '../services/audioRecording';
import {
  RecordingConfig,
  RecordingResult,
  RecordingStatus,
  RecordingState,
  AUDIO_FORMATS,
  VoiceError,
} from '../types/voice';

/**
 * Интерфейс для хука useVoiceRecording
 */
export interface UseVoiceRecordingReturn {
  // Состояние
  status: RecordingStatus;
  duration: number; // в миллисекундах
  isRecording: boolean;
  isPaused: boolean;
  error: Error | null;

  // Функции
  startRecording: (config?: Partial<RecordingConfig>) => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  stopRecording: () => Promise<RecordingResult | null>;
  cancelRecording: () => Promise<void>;

  // Утилиты
  recordingState: RecordingState;
  reset: () => void;
}

/**
 * Hook для управления записью аудио
 *
 * @param autoCleanup - Автоматически очищать ресурсы при размонтировании компонента (default: true)
 * @returns Объект с функциями и состоянием для управления записью
 *
 * @example
 * const { startRecording, stopRecording, duration, isRecording } = useVoiceRecording();
 *
 * return (
 *   <View>
 *     <Text>{duration}ms</Text>
 *     <Button
 *       title={isRecording ? 'Stop' : 'Start'}
 *       onPress={() => {
 *         if (isRecording) {
 *           stopRecording();
 *         } else {
 *           startRecording();
 *         }
 *       }}
 *     />
 *   </View>
 * );
 */
export function useVoiceRecording(autoCleanup: boolean = true): UseVoiceRecordingReturn {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [duration, setDuration] = useState<number>(0);
  const [error, setError] = useState<Error | null>(null);

  const recordingManagerRef = useRef<AudioRecordingManager | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Инициализируем менеджер при первом монтировании
  useEffect(() => {
    recordingManagerRef.current = getRecordingManager();
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      // Очищаем ресурсы при размонтировании если включен autoCleanup
      if (autoCleanup) {
        if (recordingManagerRef.current?.isRecording()) {
          recordingManagerRef.current.stopRecording().catch(error => {
            console.warn('Error stopping recording on unmount:', error);
          });
        }
        destroyRecordingManager().catch(error => {
          console.warn('Error destroying recording manager:', error);
        });
        recordingManagerRef.current = null;
      }
    };
  }, [autoCleanup]);

  /**
   * Обновить состояние только если компонент еще смонтирован
   */
  const updateState = useCallback((newStatus: RecordingStatus, newDuration: number, newError?: Error | null) => {
    if (!isMountedRef.current) return;

    setStatus(newStatus);
    setDuration(newDuration);
    if (newError !== undefined) {
      setError(newError);
    }
  }, []);

  /**
   * Запустить запись аудио
   */
  const startRecording = useCallback(
    async (config?: Partial<RecordingConfig>) => {
      try {
        setError(null);

        const recordingConfig: RecordingConfig = {
          format: config?.format || AUDIO_FORMATS.STANDARD,
          maxDuration: config?.maxDuration || 5 * 60 * 1000, // 5 minutes default
          onProgress: (duration: number) => {
            if (isMountedRef.current) {
              setDuration(duration);
            }
          },
          onError: (err: Error) => {
            if (isMountedRef.current) {
              setError(err);
              setStatus('error');
            }
          },
        };

        if (recordingManagerRef.current) {
          await recordingManagerRef.current.startRecording(recordingConfig);
          updateState('recording', 0);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        updateState('error', 0, error);
        throw error;
      }
    },
    [updateState]
  );

  /**
   * Приостановить запись
   */
  const pauseRecording = useCallback(async () => {
    try {
      if (recordingManagerRef.current) {
        await recordingManagerRef.current.pauseRecording();
        updateState('paused', recordingManagerRef.current.getDuration());
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to pause');
      updateState('error', duration, error);
      throw error;
    }
  }, [duration, updateState]);

  /**
   * Возобновить запись
   */
  const resumeRecording = useCallback(async () => {
    try {
      if (recordingManagerRef.current) {
        await recordingManagerRef.current.resumeRecording();
        updateState('recording', recordingManagerRef.current.getDuration());
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to resume');
      updateState('error', duration, error);
      throw error;
    }
  }, [duration, updateState]);

  /**
   * Остановить запись и вернуть результат
   */
  const stopRecording = useCallback(async (): Promise<RecordingResult | null> => {
    try {
      if (!recordingManagerRef.current) {
        return null;
      }

      const result = await recordingManagerRef.current.stopRecording();
      updateState('stopped', result.duration);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to stop');
      updateState('error', duration, error);
      throw error;
    }
  }, [duration, updateState]);

  /**
   * Отменить запись
   */
  const cancelRecording = useCallback(async () => {
    try {
      if (recordingManagerRef.current) {
        await recordingManagerRef.current.cancelRecording();
        updateState('idle', 0);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to cancel');
      updateState('error', 0, error);
      throw error;
    }
  }, [updateState]);

  /**
   * Сбросить состояние
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setDuration(0);
    setError(null);
  }, []);

  /**
   * Получить текущее состояние
   */
  const recordingState: RecordingState = {
    status,
    duration,
    isRecording: status === 'recording',
    isPaused: status === 'paused',
    error: error || undefined,
  };

  return {
    // Состояние
    status,
    duration,
    isRecording: status === 'recording',
    isPaused: status === 'paused',
    error,

    // Функции
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,

    // Утилиты
    recordingState,
    reset,
  };
}
