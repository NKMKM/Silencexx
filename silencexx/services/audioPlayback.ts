/**
 * Сервис для воспроизведения аудио
 * silencexx/services/audioPlayback.ts
 *
 * Управляет воспроизведением аудио с поддержкой pause/resume/stop,
 * отслеживанием прогресса и правильной очисткой ресурсов
 */

import { Audio, AVPlaybackStatus } from 'expo-av';
import {
  PlaybackConfig,
  PlaybackStatus,
  PlaybackState,
  VoiceError,
  VOICE_ERROR_CODES,
  VOICE_CONSTRAINTS,
} from '../types/voice';

/**
 * Класс для управления воспроизведением аудио
 */
export class AudioPlaybackManager {
  private sound: Audio.Sound | null = null;
  private status: PlaybackStatus = 'idle';
  private duration: number = 0;
  private currentTime: number = 0;
  private rate: number = 1;
  private progressInterval: NodeJS.Timeout | null = null;
  private onProgress?: (current: number, total: number) => void;
  private onFinish?: () => void;
  private onError?: (error: Error) => void;
  private audioUri: string | null = null;
  private audioMode: Audio.AudioMode | null = null;

  constructor() {
    this.initializeAudioMode();
  }

  /**
   * Инициализация режима аудио
   */
  private async initializeAudioMode(): Promise<void> {
    try {
      // Сохраняем текущий режим для восстановления
      this.audioMode = await Audio.getAudioMode();

      // Устанавливаем режим для воспроизведения
      await Audio.setAudioMode({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpiece: false,
      });
    } catch (error) {
      console.error('Error initializing audio mode:', error);
    }
  }

  /**
   * Загрузить и начать воспроизведение аудио
   */
  async playAudio(uri: string, config?: PlaybackConfig): Promise<void> {
    try {
      // Если уже что-то воспроизводится, остановляем
      if (this.status === 'playing' || this.status === 'paused' || this.status === 'loading') {
        await this.stop();
      }

      this.audioUri = uri;
      this.onProgress = config?.onProgress;
      this.onFinish = config?.onFinish;
      this.onError = config?.onError;
      this.rate = config?.rate || 1;

      this.status = 'loading';

      // Создаем новый Sound объект
      this.sound = new Audio.Sound();

      // Подписываемся на обновления статуса
      this.sound.setOnPlaybackStatusUpdate(this.handlePlaybackStatusUpdate.bind(this));

      // Загружаем аудио
      await this.sound.loadAsync({ uri });

      // Проверяем статус после загрузки
      const soundStatus = await this.sound.getStatusAsync();
      if (!soundStatus.isLoaded) {
        throw new VoiceError(
          VOICE_ERROR_CODES.PLAYBACK_FAILED,
          'Failed to load audio file'
        );
      }

      this.duration = soundStatus.durationMillis || 0;

      // Устанавливаем скорость воспроизведения если есть
      if (this.rate !== 1 && soundStatus.canUseVolumeBoostAndPlaybackRate) {
        try {
          await this.sound.setRateAsync(this.rate, true);
        } catch (error) {
          console.warn('Could not set playback rate:', error);
        }
      }

      // Начинаем воспроизведение
      await this.sound.playAsync();

      this.status = 'playing';
      this.currentTime = 0;

      // Запускаем отслеживание прогресса
      this.startProgressTracking();

      console.log('Playback started, duration:', this.duration, 'ms');
    } catch (error) {
      this.status = 'error';
      const voiceError = error instanceof VoiceError ? error : new VoiceError(
        VOICE_ERROR_CODES.PLAYBACK_FAILED,
        'Failed to start playback',
        { originalError: error, uri }
      );
      this.onError?.(voiceError);
      throw voiceError;
    }
  }

  /**
   * Приостановить воспроизведение
   */
  async pause(): Promise<void> {
    if (this.status !== 'playing') {
      throw new VoiceError(
        VOICE_ERROR_CODES.PLAYBACK_FAILED,
        'Playback is not active'
      );
    }

    try {
      if (this.sound) {
        await this.sound.pauseAsync();
      }
      this.status = 'paused';
      this.stopProgressTracking();
      console.log('Playback paused at', this.currentTime, 'ms');
    } catch (error) {
      this.status = 'error';
      const voiceError = new VoiceError(
        VOICE_ERROR_CODES.PLAYBACK_FAILED,
        'Failed to pause playback',
        { originalError: error }
      );
      this.onError?.(voiceError);
      throw voiceError;
    }
  }

  /**
   * Возобновить воспроизведение
   */
  async resume(): Promise<void> {
    if (this.status !== 'paused') {
      throw new VoiceError(
        VOICE_ERROR_CODES.PLAYBACK_FAILED,
        'Playback is not paused'
      );
    }

    try {
      if (this.sound) {
        await this.sound.playAsync();
      }
      this.status = 'playing';
      this.startProgressTracking();
      console.log('Playback resumed');
    } catch (error) {
      this.status = 'error';
      const voiceError = new VoiceError(
        VOICE_ERROR_CODES.PLAYBACK_FAILED,
        'Failed to resume playback',
        { originalError: error }
      );
      this.onError?.(voiceError);
      throw voiceError;
    }
  }

  /**
   * Остановить воспроизведение
   */
  async stop(): Promise<void> {
    try {
      this.stopProgressTracking();

      if (this.sound) {
        await this.sound.stopAsync();
      }

      this.status = 'idle';
      this.currentTime = 0;
      this.duration = 0;

      console.log('Playback stopped');
    } catch (error) {
      console.error('Error stopping playback:', error);
    }
  }

  /**
   * Перемотать на определенное время
   */
  async seekTo(timeMs: number): Promise<void> {
    if (!this.sound) {
      throw new VoiceError(
        VOICE_ERROR_CODES.PLAYBACK_FAILED,
        'No audio loaded'
      );
    }

    try {
      if (timeMs < 0 || timeMs > this.duration) {
        throw new VoiceError(
          VOICE_ERROR_CODES.PLAYBACK_FAILED,
          `Invalid seek time: ${timeMs}ms (duration: ${this.duration}ms)`
        );
      }

      await this.sound.setPositionAsync(timeMs);
      this.currentTime = timeMs;

      console.log('Seeked to', timeMs, 'ms');
    } catch (error) {
      const voiceError = error instanceof VoiceError ? error : new VoiceError(
        VOICE_ERROR_CODES.PLAYBACK_FAILED,
        'Failed to seek',
        { originalError: error, timeMs }
      );
      this.onError?.(voiceError);
      throw voiceError;
    }
  }

  /**
   * Установить скорость воспроизведения
   */
  async setRate(rate: number): Promise<void> {
    if (!this.sound) {
      throw new VoiceError(
        VOICE_ERROR_CODES.PLAYBACK_FAILED,
        'No audio loaded'
      );
    }

    try {
      const soundStatus = await this.sound.getStatusAsync();
      if (!soundStatus.canUseVolumeBoostAndPlaybackRate) {
        throw new VoiceError(
          VOICE_ERROR_CODES.PLAYBACK_FAILED,
          'Playback rate not supported on this device'
        );
      }

      // Валидируем скорость (обычно 0.5 - 2.0)
      if (rate < 0.5 || rate > 2.0) {
        throw new VoiceError(
          VOICE_ERROR_CODES.PLAYBACK_FAILED,
          'Playback rate must be between 0.5 and 2.0'
        );
      }

      await this.sound.setRateAsync(rate, true);
      this.rate = rate;

      console.log('Playback rate set to', rate);
    } catch (error) {
      const voiceError = error instanceof VoiceError ? error : new VoiceError(
        VOICE_ERROR_CODES.PLAYBACK_FAILED,
        'Failed to set playback rate',
        { originalError: error, rate }
      );
      this.onError?.(voiceError);
      throw voiceError;
    }
  }

  /**
   * Установить громкость
   */
  async setVolume(volume: number): Promise<void> {
    if (!this.sound) {
      throw new VoiceError(
        VOICE_ERROR_CODES.PLAYBACK_FAILED,
        'No audio loaded'
      );
    }

    try {
      if (volume < 0 || volume > 1) {
        throw new VoiceError(
          VOICE_ERROR_CODES.PLAYBACK_FAILED,
          'Volume must be between 0 and 1'
        );
      }

      await this.sound.setVolumeAsync(volume);

      console.log('Volume set to', volume);
    } catch (error) {
      const voiceError = error instanceof VoiceError ? error : new VoiceError(
        VOICE_ERROR_CODES.PLAYBACK_FAILED,
        'Failed to set volume',
        { originalError: error, volume }
      );
      this.onError?.(voiceError);
      throw voiceError;
    }
  }

  /**
   * Получить текущее состояние воспроизведения
   */
  getState(): PlaybackState {
    return {
      status: this.status,
      duration: this.duration,
      currentTime: this.currentTime,
      isPlaying: this.status === 'playing',
      isPaused: this.status === 'paused',
      progress: this.duration > 0 ? this.currentTime / this.duration : 0,
      error: this.status === 'error' ? new Error('Playback error') : undefined,
    };
  }

  /**
   * Получить текущее время воспроизведения в миллисекундах
   */
  getCurrentTime(): number {
    return this.currentTime;
  }

  /**
   * Получить общую длительность аудио в миллисекундах
   */
  getDuration(): number {
    return this.duration;
  }

  /**
   * Получить статус воспроизведения
   */
  getStatus(): PlaybackStatus {
    return this.status;
  }

  /**
   * Получить прогресс (0-1)
   */
  getProgress(): number {
    return this.duration > 0 ? this.currentTime / this.duration : 0;
  }

  /**
   * Проверить, идет ли воспроизведение
   */
  isPlaying(): boolean {
    return this.status === 'playing';
  }

  /**
   * Проверить, приостановлено ли воспроизведение
   */
  isPaused(): boolean {
    return this.status === 'paused';
  }

  /**
   * Обработчик обновления статуса воспроизведения
   */
  private handlePlaybackStatusUpdate(status: AVPlaybackStatus): void {
    if (!status.isLoaded) {
      if (status.error) {
        this.status = 'error';
        const error = new VoiceError(
          VOICE_ERROR_CODES.PLAYBACK_FAILED,
          `Playback error: ${status.error}`
        );
        this.onError?.(error);
      }
      return;
    }

    this.currentTime = status.positionMillis || 0;

    // Проверяем окончание воспроизведения
    if (status.didJustFinish && !status.isLooping) {
      this.status = 'stopped';
      this.stopProgressTracking();
      this.onFinish?.();
      console.log('Playback finished');
    }
  }

  /**
   * Запустить отслеживание прогресса
   */
  private startProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    const interval = VOICE_CONSTRAINTS.PLAYBACK_BUFFER_TIME;

    this.progressInterval = setInterval(() => {
      this.onProgress?.(this.currentTime, this.duration);
    }, interval);
  }

  /**
   * Остановить отслеживание прогресса
   */
  private stopProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  /**
   * Очистить все ресурсы
   */
  private async cleanup(): Promise<void> {
    this.stopProgressTracking();

    if (this.sound) {
      try {
        await this.sound.unloadAsync();
      } catch (error) {
        console.warn('Error unloading sound:', error);
      }
      this.sound = null;
    }

    this.status = 'idle';
    this.currentTime = 0;
    this.duration = 0;
    this.audioUri = null;
  }

  /**
   * Уничтожить менеджер (очистить все ресурсы)
   */
  async destroy(): Promise<void> {
    await this.cleanup();

    // Пытаемся восстановить предыдущий режим аудио
    if (this.audioMode) {
      try {
        await Audio.setAudioMode(this.audioMode);
      } catch (error) {
        console.warn('Error restoring audio mode:', error);
      }
    }

    this.onProgress = undefined;
    this.onFinish = undefined;
    this.onError = undefined;
  }
}

/**
 * Синглтон для глобального управления воспроизведением
 * Гарантирует, что воспроизводится только один звук одновременно
 */
let playbackManager: AudioPlaybackManager | null = null;

/**
 * Получить глобальный менеджер воспроизведения
 */
export function getPlaybackManager(): AudioPlaybackManager {
  if (!playbackManager) {
    playbackManager = new AudioPlaybackManager();
  }
  return playbackManager;
}

/**
 * Очистить глобальный менеджер воспроизведения
 */
export async function destroyPlaybackManager(): Promise<void> {
  if (playbackManager) {
    await playbackManager.destroy();
    playbackManager = null;
  }
}
