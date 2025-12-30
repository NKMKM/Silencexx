/**
 * Типы и интерфейсы для голосовых сообщений
 * silencexx/types/voice.ts
 */

/**
 * Статусы записи аудио
 */
export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopped' | 'error';

/**
 * Статусы воспроизведения аудио
 */
export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';

/**
 * Формат аудио файла
 */
export interface AudioFormat {
  mimeType: 'audio/mp4' | 'audio/wav' | 'audio/mpeg';
  fileExtension: 'm4a' | 'wav' | 'mp3';
  sampleRate: number; // Hz
  bitrate: number; // kbps
  channels: 1 | 2;
}

/**
 * Конфигурация для записи аудио
 */
export interface RecordingConfig {
  format: AudioFormat;
  maxDuration: number; // milliseconds
  onProgress?: (duration: number) => void;
  onError?: (error: Error) => void;
}

/**
 * Результат записи аудио
 */
export interface RecordingResult {
  uri: string; // file path
  duration: number; // milliseconds
  size: number; // bytes
  mimeType: string;
  sampleRate: number;
  channels: number;
  bitrate: number;
}

/**
 * Голосовое сообщение
 */
export interface VoiceMessage {
  id?: string;
  userId: number;
  chatId: number;
  audioUri: string; // local or remote URI
  duration: number; // milliseconds
  size: number; // bytes
  mimeType: string;
  transcript?: string; // транскрипция (если есть)
  isTranscribed: boolean;
  createdAt: string; // ISO 8601
  isLocal?: boolean; // еще не отправлено на сервер
  uploadProgress?: number; // 0-100 for upload progress
}

/**
 * История голосового сообщения (для UI)
 */
export interface VoiceMessageDisplayed extends VoiceMessage {
  isPlaying?: boolean;
  isPaused?: boolean;
  currentTime?: number;
  sender: 'user' | 'ai';
}

/**
 * Конфигурация для воспроизведения
 */
export interface PlaybackConfig {
  rate?: number; // 0.5, 1, 1.5, 2
  progressUpdateInterval?: number; // milliseconds
  onProgress?: (current: number, total: number) => void;
  onFinish?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Состояние записи
 */
export interface RecordingState {
  status: RecordingStatus;
  duration: number; // milliseconds
  isRecording: boolean;
  isPaused: boolean;
  error?: Error | null;
}

/**
 * Состояние воспроизведения
 */
export interface PlaybackState {
  status: PlaybackStatus;
  duration: number; // total duration
  currentTime: number; // current playback position
  isPlaying: boolean;
  isPaused: boolean;
  progress: number; // 0-1
  error?: Error | null;
}

/**
 * Параметры для отправки голосового сообщения на сервер
 */
export interface SendVoiceMessageParams {
  chatId: number;
  audioUri: string; // local file URI
  duration: number;
  size: number;
  mimeType: string;
  transcript?: string;
  isTranscribed: boolean;
  mood?: string;
  language?: string;
}

/**
 * Ответ сервера при отправке голосового сообщения
 */
export interface SendVoiceMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  message?: VoiceMessage;
}

/**
 * Параметры для загрузки голосовых сообщений из истории
 */
export interface LoadVoiceMessagesParams {
  chatId: number;
  limit?: number;
  offset?: number;
}

/**
 * Ответ сервера при загрузке голосовых сообщений
 */
export interface LoadVoiceMessagesResponse {
  success: boolean;
  messages: VoiceMessage[];
  total: number;
  error?: string;
}

/**
 * Стандартные конфигурации аудио
 */
export const AUDIO_FORMATS: Record<string, AudioFormat> = {
  HIGH_QUALITY: {
    mimeType: 'audio/mp4',
    fileExtension: 'm4a',
    sampleRate: 44100,
    bitrate: 128,
    channels: 1,
  },
  STANDARD: {
    mimeType: 'audio/mp4',
    fileExtension: 'm4a',
    sampleRate: 32000,
    bitrate: 64,
    channels: 1,
  },
  LOW_QUALITY: {
    mimeType: 'audio/mp4',
    fileExtension: 'm4a',
    sampleRate: 16000,
    bitrate: 32,
    channels: 1,
  },
  WAV: {
    mimeType: 'audio/wav',
    fileExtension: 'wav',
    sampleRate: 44100,
    bitrate: 0, // WAV не использует bitrate в традиционном смысле
    channels: 1,
  },
};

/**
 * Стандартные ограничения
 */
export const VOICE_CONSTRAINTS = {
  MAX_RECORDING_DURATION: 5 * 60 * 1000, // 5 minutes in milliseconds
  MIN_RECORDING_DURATION: 1000, // 1 second
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50 MB
  MIN_FILE_SIZE: 1024, // 1 KB
  ALLOWED_MIME_TYPES: ['audio/mp4', 'audio/wav', 'audio/mpeg'],
  UPLOAD_CHUNK_SIZE: 1024 * 1024, // 1 MB chunks
  UPLOAD_TIMEOUT: 30000, // 30 seconds
  PLAYBACK_BUFFER_TIME: 500, // milliseconds
};

/**
 * Константы для локализации сообщений
 */
export const VOICE_MESSAGES_I18N = {
  ru: {
    recordingStarted: 'Запись началась',
    recordingStopped: 'Запись остановлена',
    recordingPaused: 'Запись приостановлена',
    recordingResumed: 'Запись возобновлена',
    recordingCanceled: 'Запись отменена',
    recordingError: 'Ошибка при записи аудио',
    playbackStarted: 'Воспроизведение началось',
    playbackPaused: 'Воспроизведение приостановлено',
    playbackResumed: 'Воспроизведение возобновлено',
    playbackStopped: 'Воспроизведение остановлено',
    playbackError: 'Ошибка при воспроизведении аудио',
    uploadError: 'Ошибка при отправке голосового сообщения',
    uploadSuccess: 'Голосовое сообщение отправлено',
    permissionDenied: 'Разрешение на запись микрофона отклонено',
    deviceNotSupported: 'Устройство не поддерживает запись аудио',
  },
  en: {
    recordingStarted: 'Recording started',
    recordingStopped: 'Recording stopped',
    recordingPaused: 'Recording paused',
    recordingResumed: 'Recording resumed',
    recordingCanceled: 'Recording canceled',
    recordingError: 'Error recording audio',
    playbackStarted: 'Playback started',
    playbackPaused: 'Playback paused',
    playbackResumed: 'Playback resumed',
    playbackStopped: 'Playback stopped',
    playbackError: 'Error playing audio',
    uploadError: 'Error sending voice message',
    uploadSuccess: 'Voice message sent',
    permissionDenied: 'Microphone permission denied',
    deviceNotSupported: 'Device does not support audio recording',
  },
};

/**
 * Типы ошибок для голосовых сообщений
 */
export class VoiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'VoiceError';
  }
}

export const VOICE_ERROR_CODES = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RECORDING_FAILED: 'RECORDING_FAILED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FORMAT: 'INVALID_FORMAT',
  PLAYBACK_FAILED: 'PLAYBACK_FAILED',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  DEVICE_NOT_SUPPORTED: 'DEVICE_NOT_SUPPORTED',
  UNKNOWN: 'UNKNOWN',
};
