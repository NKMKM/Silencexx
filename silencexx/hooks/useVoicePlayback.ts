/**
 * React Hook для управления воспроизведением аудио
 * silencexx/hooks/useVoicePlayback.ts
 *
 * Предоставляет простой интерфейс для работы с воспроизведением аудио в компонентах
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  AudioPlaybackManager,
  getPlaybackManager,
  destroyPlaybackManager,
} from '../services/audioPlayback';
import {
  PlaybackConfig,
  PlaybackStatus,
  PlaybackState,
  VoiceError,
} from '../types/voice';

/**
 * Интерфейс для хука useVoicePlayback
 */
export interface UseVoicePlaybackReturn {
  // Состояние
  status: PlaybackStatus;
  currentTime: number; // в миллисекундах
  duration: number; // в миллисекундах
  progress: number; // 0-1
  isPlaying: boolean;
  isPaused: boolean;
  error: Error | null;

  // Функции
  playAudio: (uri: string, config?: PlaybackConfig) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (timeMs: number) => Promise<void>;
  setRate: (rate: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;

  // Утилиты
  playbackState: PlaybackState;
  reset: () => void;
}

/**
 * Hook для управления воспроизведением аудио
 *
 * @param autoCleanup - Автоматически очищать ресурсы при размонтировании компонента (default: true)
 * @returns Объект с функциями и состоянием для управления воспроизведением
 *
 * @example
 * const { playAudio, pause, resume, currentTime, duration } = useVoicePlayback();
 *
 * return (
 *   <View>
 *     <ProgressBar
 *       current={currentTime}
 *       total={duration}
 *       onSeek={(time) => seekTo(time)}
 *     />
 *     <Button title="Play" onPress={() => playAudio(audioUri)} />
 *     <Button title="Pause" onPress={() => pause()} />
 *     <Button title="Resume" onPress={() => resume()} />
 *   </View>
 * );
 */
export function useVoicePlayback(autoCleanup: boolean = true): UseVoicePlaybackReturn {
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<Error | null>(null);

  const playbackManagerRef = useRef<AudioPlaybackManager | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Инициализируем менеджер при первом монтировании
  useEffect(() => {
    playbackManagerRef.current = getPlaybackManager();
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      // Очищаем ресурсы при размонтировании если включен autoCleanup
      if (autoCleanup) {
        if (playbackManagerRef.current?.isPlaying()) {
          playbackManagerRef.current.stop().catch(error => {
            console.warn('Error stopping playback on unmount:', error);
          });
        }
        destroyPlaybackManager().catch(error => {
          console.warn('Error destroying playback manager:', error);
        });
        playbackManagerRef.current = null;
      }
    };
  }, [autoCleanup]);

  /**
   * Обновить состояние только если компонент еще смонтирован
   */
  const updateState = useCallback(
    (
      newStatus: PlaybackStatus,
      newCurrentTime: number,
      newDuration: number,
      newError?: Error | null
    ) => {
      if (!isMountedRef.current) return;

      setStatus(newStatus);
      setCurrentTime(newCurrentTime);
      setDuration(newDuration);
      setProgress(newDuration > 0 ? newCurrentTime / newDuration : 0);

      if (newError !== undefined) {
        setError(newError);
      }
    },
    []
  );

  /**
   * Загрузить и начать воспроизведение аудио
   */
  const playAudio = useCallback(
    async (uri: string, config?: PlaybackConfig) => {
      try {
        setError(null);

        const playbackConfig: PlaybackConfig = {
          rate: config?.rate || 1,
          progressUpdateInterval: config?.progressUpdateInterval || 500,
          onProgress: (current: number, total: number) => {
            if (isMountedRef.current) {
              setCurrentTime(current);
              setDuration(total);
              setProgress(total > 0 ? current / total : 0);
            }
          },
          onFinish: () => {
            if (isMountedRef.current) {
              setStatus('stopped');
            }
            config?.onFinish?.();
          },
          onError: (err: Error) => {
            if (isMountedRef.current) {
              setError(err);
              setStatus('error');
            }
            config?.onError?.(err);
          },
        };

        if (playbackManagerRef.current) {
          await playbackManagerRef.current.playAudio(uri, playbackConfig);
          updateState('playing', 0, playbackManagerRef.current.getDuration());
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        updateState('error', currentTime, duration, error);
        throw error;
      }
    },
    [currentTime, duration, updateState]
  );

  /**
   * Приостановить воспроизведение
   */
  const pause = useCallback(async () => {
    try {
      if (playbackManagerRef.current) {
        await playbackManagerRef.current.pause();
        updateState('paused', playbackManagerRef.current.getCurrentTime(), playbackManagerRef.current.getDuration());
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to pause');
      updateState('error', currentTime, duration, error);
      throw error;
    }
  }, [currentTime, duration, updateState]);

  /**
   * Возобновить воспроизведение
   */
  const resume = useCallback(async () => {
    try {
      if (playbackManagerRef.current) {
        await playbackManagerRef.current.resume();
        updateState('playing', playbackManagerRef.current.getCurrentTime(), playbackManagerRef.current.getDuration());
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to resume');
      updateState('error', currentTime, duration, error);
      throw error;
    }
  }, [currentTime, duration, updateState]);

  /**
   * Остановить воспроизведение
   */
  const stop = useCallback(async () => {
    try {
      if (playbackManagerRef.current) {
        await playbackManagerRef.current.stop();
        updateState('idle', 0, 0);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to stop');
      updateState('error', currentTime, duration, error);
      throw error;
    }
  }, [currentTime, duration, updateState]);

  /**
   * Перемотать на определенное время
   */
  const seekTo = useCallback(
    async (timeMs: number) => {
      try {
        if (playbackManagerRef.current) {
          await playbackManagerRef.current.seekTo(timeMs);
          updateState(status, timeMs, playbackManagerRef.current.getDuration());
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to seek');
        updateState('error', currentTime, duration, error);
        throw error;
      }
    },
    [status, currentTime, duration, updateState]
  );

  /**
   * Установить скорость воспроизведения
   */
  const setRate = useCallback(
    async (rate: number) => {
      try {
        if (playbackManagerRef.current) {
          await playbackManagerRef.current.setRate(rate);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to set rate');
        setError(error);
        throw error;
      }
    },
    []
  );

  /**
   * Установить громкость
   */
  const setVolume = useCallback(
    async (volume: number) => {
      try {
        if (playbackManagerRef.current) {
          await playbackManagerRef.current.setVolume(volume);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to set volume');
        setError(error);
        throw error;
      }
    },
    []
  );

  /**
   * Сбросить состояние
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setCurrentTime(0);
    setDuration(0);
    setProgress(0);
    setError(null);
  }, []);

  /**
   * Получить текущее состояние
   */
  const playbackState: PlaybackState = {
    status,
    duration,
    currentTime,
    isPlaying: status === 'playing',
    isPaused: status === 'paused',
    progress,
    error: error || undefined,
  };

  return {
    // Состояние
    status,
    currentTime,
    duration,
    progress,
    isPlaying: status === 'playing',
    isPaused: status === 'paused',
    error,

    // Функции
    playAudio,
    pause,
    resume,
    stop,
    seekTo,
    setRate,
    setVolume,

    // Утилиты
    playbackState,
    reset,
  };
}
