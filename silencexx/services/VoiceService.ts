import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import axios from 'axios';
import { api as axiosInstance } from './api';

export type SupportedLanguage = 'ru' | 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh';

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  speechRecognitionLocale: string;
  ttsLocale: string;
}

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageConfig> = {
  ru: {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    speechRecognitionLocale: 'ru-RU',
    ttsLocale: 'ru-RU',
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    speechRecognitionLocale: 'en-US',
    ttsLocale: 'en-US',
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    speechRecognitionLocale: 'es-ES',
    ttsLocale: 'es-ES',
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    speechRecognitionLocale: 'fr-FR',
    ttsLocale: 'fr-FR',
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    speechRecognitionLocale: 'de-DE',
    ttsLocale: 'de-DE',
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    speechRecognitionLocale: 'ja-JP',
    ttsLocale: 'ja-JP',
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    speechRecognitionLocale: 'zh-CN',
    ttsLocale: 'zh-CN',
  },
};

export interface TranscriptionResult {
  text: string;
  language: SupportedLanguage;
  confidence: number;
  isTranscribed: boolean;
}

export interface VoiceMessageMetadata {
  language: SupportedLanguage;
  transcript?: string;
  isTranscribed: boolean;
  duration?: number;
  confidenceScore?: number;
}

export class VoiceService {
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
  private meteringInterval: ReturnType<typeof setInterval> | null = null;
  private audioLevelCallback: ((level: number) => void) | null = null;
  private currentLanguage: SupportedLanguage = 'ru';

  /**
   * Установить язык для записи и транскрипции
   */
  setLanguage(language: SupportedLanguage): void {
    if (!SUPPORTED_LANGUAGES[language]) {
      console.warn(`[VoiceService] Unknown language: ${language}, using 'ru'`);
      this.currentLanguage = 'ru';
    } else {
      this.currentLanguage = language;
      console.log(`[VoiceService] Language set to: ${SUPPORTED_LANGUAGES[language].nativeName}`);
    }
  }

  /**
   * Получить текущий язык
   */
  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * Получить конфиг языка
   */
  getLanguageConfig(language?: SupportedLanguage): LanguageConfig {
    const lang = language || this.currentLanguage;
    return SUPPORTED_LANGUAGES[lang];
  }

  /**
   * Запустить запись голоса
   */
  async startRecording(onAudioLevel?: (level: number) => void): Promise<void> {
    try {
      console.log(`[VoiceService] Starting recording in ${SUPPORTED_LANGUAGES[this.currentLanguage].nativeName}`);
      
      // Запросить разрешения
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Microphone permission denied');
      }

      this.audioLevelCallback = onAudioLevel || null;

      // Настроить аудио режим
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      // Создать и запустить запись
      this.recording = new Audio.Recording();
      
      await this.recording.prepareToRecordAsync({
        isMeteringEnabled: true,
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
      });

      await this.recording.startAsync();
      console.log('[VoiceService] Recording started');

      // Установить интервал для отслеживания уровня звука
      this.setupMeteringInterval();
    } catch (error) {
      console.error('[VoiceService] Error starting recording:', error);
      throw error;
    }
  }

  /**
   * Остановить запись
   */
  async stopRecording(): Promise<string | null> {
    try {
      if (!this.recording) {
        console.warn('[VoiceService] No recording in progress');
        return null;
      }

      console.log('[VoiceService] Stopping recording...');
      await this.recording.stopAndUnloadAsync();

      const uri = this.recording.getURI();
      console.log('[VoiceService] Recording stopped, URI:', uri);

      if (this.meteringInterval) {
        clearInterval(this.meteringInterval);
        this.meteringInterval = null;
      }

      this.recording = null;
      return uri;
    } catch (error) {
      console.error('[VoiceService] Error stopping recording:', error);
      throw error;
    }
  }

  /**
   * Транскрибировать аудиофайл на сервере
   */
  async transcribeAudio(audioUri: string, language?: SupportedLanguage): Promise<TranscriptionResult> {
    try {
      const lang = language || this.currentLanguage;
      console.log(`[VoiceService] Transcribing audio in ${SUPPORTED_LANGUAGES[lang].nativeName}`);

      const formData = new FormData();
      formData.append('audioUri', audioUri);
      formData.append('language', lang);

      const response = await axiosInstance.post(
        '/transcribe',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const result: TranscriptionResult = {
        text: response.data.text || '',
        language: lang,
        confidence: response.data.confidence || 0.9,
        isTranscribed: true,
      };

      console.log('[VoiceService] Transcription result:', result);
      return result;
    } catch (error) {
      console.error('[VoiceService] Transcription error:', error);
      throw error;
    }
  }

  /**
   * Синтезировать речь из текста
   */
  async synthesizeSpeech(text: string, language?: SupportedLanguage): Promise<string | null> {
    try {
      const lang = language || this.currentLanguage;
      console.log(`[VoiceService] Synthesizing speech in ${SUPPORTED_LANGUAGES[lang].nativeName}`);

      const response = await axiosInstance.post(
        '/synthesize',
        {
          text,
          language: lang,
        },
        {
          responseType: 'arraybuffer',
        }
      );

      // Сохранить синтезированный файл
      const filename = `tts-${Date.now()}.wav`;
      const filepath = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(filepath, response.data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('[VoiceService] TTS audio saved:', filepath);
      return filepath;
    } catch (error) {
      console.error('[VoiceService] TTS error:', error);
      return null;
    }
  }

  /**
   * Воспроизвести аудиофайл
   */
  async playAudio(uri: string): Promise<void> {
    try {
      console.log('[VoiceService] Playing audio:', uri);

      if (this.sound) {
        await this.sound.unloadAsync();
      }

      this.sound = new Audio.Sound();
      await this.sound.loadAsync({ uri });
      
      // Настроить режим воспроизведения
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      await this.sound.playAsync();
      console.log('[VoiceService] Audio playback started');
    } catch (error) {
      console.error('[VoiceService] Playback error:', error);
      throw error;
    }
  }

  /**
   * Остановить воспроизведение
   */
  async stopPlayback(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
        console.log('[VoiceService] Playback stopped');
      }
    } catch (error) {
      console.error('[VoiceService] Error stopping playback:', error);
    }
  }

  /**
   * Получить длительность аудиофайла
   */
  async getAudioDuration(uri: string): Promise<number> {
    try {
      const sound = new Audio.Sound();
      await sound.loadAsync({ uri });
      const status = await sound.getStatusAsync();
      await sound.unloadAsync();
      return status.durationMillis || 0;
    } catch (error) {
      console.error('[VoiceService] Error getting duration:', error);
      return 0;
    }
  }

  /**
   * Удалить аудиофайл
   */
  async deleteAudio(uri: string): Promise<void> {
    try {
      if (uri && uri.startsWith('file://')) {
        await FileSystem.deleteAsync(uri);
        console.log('[VoiceService] Audio file deleted:', uri);
      }
    } catch (error) {
      console.error('[VoiceService] Error deleting audio:', error);
    }
  }

  /**
   * Очистить ресурсы
   */
  async cleanup(): Promise<void> {
    try {
      if (this.meteringInterval) {
        clearInterval(this.meteringInterval);
        this.meteringInterval = null;
      }

      if (this.recording) {
        await this.stopRecording();
      }

      if (this.sound) {
        await this.stopPlayback();
      }

      console.log('[VoiceService] Resources cleaned up');
    } catch (error) {
      console.error('[VoiceService] Cleanup error:', error);
    }
  }

  /**
   * Настроить интервал для отслеживания уровня звука
   */
  private setupMeteringInterval(): void {
    if (this.meteringInterval) {
      clearInterval(this.meteringInterval);
    }

    this.meteringInterval = setInterval(async () => {
      if (!this.recording) return;

      try {
        const status = await this.recording.getStatusAsync();
        if (status.metering !== undefined && this.audioLevelCallback) {
          const level = Math.max(0, (status.metering + 160) / 160);
          this.audioLevelCallback(Math.min(1, level));
        }
      } catch (error) {
        // Игнорировать ошибки чтения уровня звука
      }
    }, 100);
  }
}

// Синглтон экземпляр
export const voiceService = new VoiceService();
