/**
 * Сервис для записи аудио
 * silencexx/services/audioRecording.ts
 * 
 * Управляет записью аудио с поддержкой pause/resume/cancel,
 * правильной обработкой разрешений, и очисткой ресурсов
 */

import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import {
  AudioFormat,
  RecordingConfig,
  RecordingResult,
  RecordingStatus,
  RecordingState,
  VoiceError,
  VOICE_ERROR_CODES,
  VOICE_CONSTRAINTS,
  AUDIO_FORMATS,
} from '../types/voice';

/**
 * Класс для управления записью аудио
 */
export class AudioRecordingManager {
  private recording: Audio.Recording | null = null;
  private status: RecordingStatus = 'idle';
  private duration: number = 0;
  private recordingUri: string | null = null;
  private startTime: number = 0;
  private pausedTime: number = 0;
  private progressInterval: NodeJS.Timeout | null = null;
  private maxDuration: number = VOICE_CONSTRAINTS.MAX_RECORDING_DURATION;
  private onProgress?: (duration: number) => void;
  private onError?: (error: Error) => void;
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

      // Устанавливаем режим для записи
      await Audio.setAudioMode({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpiece: false,
      });
    } catch (error) {
      console.error('Error initializing audio mode:', error);
    }
  }

  /**
   * Проверка разрешений на запись
   */
  private async checkPermissions(): Promise<boolean> {
    try {
      const permission = await Audio.requestPermissionsAsync();
      return permission.granted;
    } catch (error) {
      console.error('Error checking audio permissions:', error);
      return false;
    }
  }

  /**
   * Запустить запись аудио
   */
  async startRecording(config: RecordingConfig): Promise<void> {
    try {
      // Проверяем разрешения
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        throw new VoiceError(
          VOICE_ERROR_CODES.PERMISSION_DENIED,
          'Microphone permission denied',
          { platform: 'native' }
        );
      }

      // Проверяем, что еще ничего не записывается
      if (this.status === 'recording' || this.status === 'paused') {
        throw new VoiceError(
          VOICE_ERROR_CODES.RECORDING_FAILED,
          'Recording already in progress'
        );
      }

      // Очищаем предыдущую запись
      await this.cleanup();

      this.onProgress = config.onProgress;
      this.onError = config.onError;
      this.maxDuration = config.maxDuration || VOICE_CONSTRAINTS.MAX_RECORDING_DURATION;

      // Создаем новую запись
      this.recording = new Audio.Recording();

      // Устанавливаем параметры записи
      await this.recording.prepareToRecordAsync(this.getRecordingOptions(config.format));

      // Стартуем запись
      await this.recording.startAsync();

      this.status = 'recording';
      this.startTime = Date.now();
      this.pausedTime = 0;
      this.duration = 0;

      // Запускаем отслеживание длительности
      this.startProgressTracking();

      console.log('Recording started');
    } catch (error) {
      this.status = 'error';
      const voiceError = error instanceof VoiceError ? error : new VoiceError(
        VOICE_ERROR_CODES.RECORDING_FAILED,
        'Failed to start recording',
        { originalError: error }
      );
      this.onError?.(voiceError);
      throw voiceError;
    }
  }

  /**
   * Приостановить запись
   */
  async pauseRecording(): Promise<void> {
    if (this.status !== 'recording') {
      throw new VoiceError(
        VOICE_ERROR_CODES.RECORDING_FAILED,
        'Recording is not active'
      );
    }

    try {
      if (this.recording) {
        await this.recording.pauseAsync();
      }
      this.pausedTime = Date.now();
      this.status = 'paused';
      this.stopProgressTracking();
      console.log('Recording paused at', this.duration, 'ms');
    } catch (error) {
      this.status = 'error';
      const voiceError = new VoiceError(
        VOICE_ERROR_CODES.RECORDING_FAILED,
        'Failed to pause recording',
        { originalError: error }
      );
      this.onError?.(voiceError);
      throw voiceError;
    }
  }

  /**
   * Возобновить запись
   */
  async resumeRecording(): Promise<void> {
    if (this.status !== 'paused') {
      throw new VoiceError(
        VOICE_ERROR_CODES.RECORDING_FAILED,
        'Recording is not paused'
      );
    }

    try {
      if (this.recording) {
        await this.recording.resumeAsync();
      }

      // Добавляем время паузы к смещению
      if (this.pausedTime > 0) {
        const pauseDuration = Date.now() - this.pausedTime;
        this.startTime += pauseDuration;
        this.pausedTime = 0;
      }

      this.status = 'recording';
      this.startProgressTracking();
      console.log('Recording resumed');
    } catch (error) {
      this.status = 'error';
      const voiceError = new VoiceError(
        VOICE_ERROR_CODES.RECORDING_FAILED,
        'Failed to resume recording',
        { originalError: error }
      );
      this.onError?.(voiceError);
      throw voiceError;
    }
  }

  /**
   * Остановить запись и вернуть результат
   */
  async stopRecording(): Promise<RecordingResult> {
    if (this.status !== 'recording' && this.status !== 'paused') {
      throw new VoiceError(
        VOICE_ERROR_CODES.RECORDING_FAILED,
        'Recording is not active'
      );
    }

    try {
      this.stopProgressTracking();

      if (!this.recording) {
        throw new Error('Recording object is null');
      }

      // Проверяем минимальную длительность
      const recordedDuration = Date.now() - this.startTime;
      if (recordedDuration < VOICE_CONSTRAINTS.MIN_RECORDING_DURATION) {
        throw new VoiceError(
          VOICE_ERROR_CODES.RECORDING_FAILED,
          `Recording too short. Minimum ${VOICE_CONSTRAINTS.MIN_RECORDING_DURATION}ms required`,
          { duration: recordedDuration }
        );
      }

      // Останавливаем запись
      await this.recording.stopAndUnloadAsync();

      const recordingStatus = this.recording.getStatus() as any;
      if (!recordingStatus.uri) {
        throw new VoiceError(
          VOICE_ERROR_CODES.RECORDING_FAILED,
          'No recording URI obtained'
        );
      }

      this.recordingUri = recordingStatus.uri;
      this.status = 'stopped';

      // Получаем информацию о файле
      const fileInfo = await FileSystem.getInfoAsync(this.recordingUri);
      if (!fileInfo.exists) {
        throw new VoiceError(
          VOICE_ERROR_CODES.RECORDING_FAILED,
          'Recording file not created'
        );
      }

      const size = fileInfo.size || 0;

      // Проверяем максимальный размер
      if (size > VOICE_CONSTRAINTS.MAX_FILE_SIZE) {
        throw new VoiceError(
          VOICE_ERROR_CODES.FILE_TOO_LARGE,
          `File too large. Maximum ${VOICE_CONSTRAINTS.MAX_FILE_SIZE} bytes`,
          { size }
        );
      }

      console.log('Recording stopped, size:', size, 'bytes');

      return {
        uri: this.recordingUri,
        duration: recordedDuration,
        size,
        mimeType: 'audio/mp4',
        sampleRate: 44100,
        channels: 1,
        bitrate: 128,
      };
    } catch (error) {
      this.status = 'error';
      const voiceError = error instanceof VoiceError ? error : new VoiceError(
        VOICE_ERROR_CODES.RECORDING_FAILED,
        'Failed to stop recording',
        { originalError: error }
      );
      this.onError?.(voiceError);
      throw voiceError;
    }
  }

  /**
   * Отменить запись (удалить файл)
   */
  async cancelRecording(): Promise<void> {
    try {
      this.stopProgressTracking();

      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
      }

      // Удаляем файл если он существует
      if (this.recordingUri) {
        try {
          await FileSystem.deleteAsync(this.recordingUri);
        } catch (error) {
          console.warn('Could not delete recording file:', error);
        }
      }

      this.status = 'idle';
      this.recordingUri = null;
      this.duration = 0;
      this.startTime = 0;
      this.pausedTime = 0;

      console.log('Recording canceled and deleted');
    } catch (error) {
      this.status = 'error';
      console.error('Error canceling recording:', error);
    }
  }

  /**
   * Получить текущее состояние записи
   */
  getState(): RecordingState {
    return {
      status: this.status,
      duration: this.duration,
      isRecording: this.status === 'recording',
      isPaused: this.status === 'paused',
      error: this.status === 'error' ? new Error('Recording error') : null,
    };
  }

  /**
   * Получить текущую длительность записи в миллисекундах
   */
  getDuration(): number {
    return this.duration;
  }

  /**
   * Получить статус записи
   */
  getStatus(): RecordingStatus {
    return this.status;
  }

  /**
   * Проверить, идет ли запись
   */
  isRecording(): boolean {
    return this.status === 'recording';
  }

  /**
   * Проверить, приостановлена ли запись
   */
  isPaused(): boolean {
    return this.status === 'paused';
  }

  /**
   * Получить опции записи для expo-av
   */
  private getRecordingOptions(format: AudioFormat): Audio.RecordingOptions {
    return {
      isMeteringEnabled: true,
      android: {
        extension: `.${format.fileExtension}`,
        outputFormat: Audio.RecordingOptionAndroid.OutputFormat.DEFAULT,
        audioEncoder: Audio.RecordingOptionAndroid.AudioEncoder.DEFAULT,
        sampleRate: format.sampleRate,
        numberOfChannels: format.channels,
        bitRate: format.bitrate * 1000, // Convert kbps to bps
      },
      ios: {
        extension: `.${format.fileExtension}`,
        outputFormat: Audio.RecordingOptionIOS.OutputFormat.MPEG4AAC,
        audioQuality: Audio.RecordingOptionIOS.AudioQuality.HIGH,
        sampleRate: format.sampleRate,
        numberOfChannels: format.channels,
        bitRateStrategy: Audio.RecordingOptionIOS.BitRateStrategy.CONSTANT,
        bitRate: format.bitrate * 1000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: format.mimeType,
        bitsPerSecond: format.bitrate * 1000,
      },
    };
  }

  /**
   * Запустить отслеживание прогресса
   */
  private startProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    this.progressInterval = setInterval(() => {
      const elapsed = Date.now() - this.startTime;

      // Проверяем лимит времени
      if (elapsed >= this.maxDuration) {
        this.stopRecording().catch(error => {
          console.error('Error auto-stopping recording:', error);
        });
        return;
      }

      this.duration = elapsed;
      this.onProgress?.(this.duration);
    }, 100); // Update every 100ms
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

    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch (error) {
        console.warn('Error unloading recording:', error);
      }
      this.recording = null;
    }

    this.status = 'idle';
    this.duration = 0;
    this.startTime = 0;
    this.pausedTime = 0;
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
    this.onError = undefined;
  }
}

/**
 * Синглтон для глобального управления записью
 */
let recordingManager: AudioRecordingManager | null = null;

/**
 * Получить глобальный менеджер записи
 */
export function getRecordingManager(): AudioRecordingManager {
  if (!recordingManager) {
    recordingManager = new AudioRecordingManager();
  }
  return recordingManager;
}

/**
 * Очистить глобальный менеджер записи
 */
export async function destroyRecordingManager(): Promise<void> {
  if (recordingManager) {
    await recordingManager.destroy();
    recordingManager = null;
  }
}
