import { Audio } from 'expo-av';
import { Platform } from 'react-native';
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
      
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Microphone permission denied');
      }

      this.audioLevelCallback = onAudioLevel || null;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false
      });

      this.recording = new Audio.Recording();
      
      const recordingOptions = {
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      await this.recording.prepareToRecordAsync(recordingOptions);
      await this.recording.startAsync();
      console.log('[VoiceService] Recording started successfully');

      this.setupMeteringInterval();
    } catch (error) {
      console.error('[VoiceService] Error starting recording:', error);
      throw new Error('Failed to start recording');
    }
  }

  /**
   * Остановить запись и вернуть URI файла
   */
  async stopRecording(): Promise<string | null> {
    try {
      if (this.meteringInterval) {
        clearInterval(this.meteringInterval);
        this.meteringInterval = null;
      }

      if (!this.recording) {
        console.warn('[VoiceService] No recording in progress');
        return null;
      }

      console.log('[VoiceService] Stopping recording...');
      await this.recording.stopAndUnloadAsync();

      const uri = this.recording.getURI();
      console.log('[VoiceService] Recording stopped, URI:', uri);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false
      });

      this.recording = null;
      return uri;
    } catch (error) {
      console.error('[VoiceService] Error stopping recording:', error);
      throw error;
    }
  }

  /**
   * Отменить запись
   */
  async cancelRecording(): Promise<void> {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }
      if (this.meteringInterval) {
        clearInterval(this.meteringInterval);
        this.meteringInterval = null;
      }
    } catch (error) {
      console.error('[VoiceService] Error canceling recording:', error);
    }
  }

  private setupMeteringInterval() {
    if (this.meteringInterval) clearInterval(this.meteringInterval);
    
    this.meteringInterval = setInterval(async () => {
      if (this.recording && this.audioLevelCallback) {
        try {
          const status = await this.recording.getStatusAsync();
          if (status.isRecording && status.metering !== undefined) {
             const minDb = -60;
             const db = status.metering;
             const normalized = Math.max(0, Math.min(1, (db - minDb) / (0 - minDb)));
             this.audioLevelCallback(normalized);
          }
        } catch (e) {
          // ignore status read errors
        }
      }
    }, 100);
  }

  /**
   * Транскрибировать аудио (распознавание речи)
   */
  async transcribeAudio(uri: string, language?: SupportedLanguage): Promise<TranscriptionResult> {
    const targetLanguage = language || this.currentLanguage;
    console.log(`[VoiceService] Transcribing audio: ${uri}, language: ${targetLanguage}`);
    
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'recording.m4a';
      const fileType = 'audio/m4a';
      
      // @ts-ignore
      formData.append('audio', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type: fileType,
      });
      
      formData.append('language', targetLanguage);
      formData.append('task', 'transcribe');

      const response = await axiosInstance.post('/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        transformRequest: (data) => data,
      });

      console.log('[VoiceService] Transcription success:', response.data);
      
      return {
        text: response.data.text || '',
        language: response.data.language || this.currentLanguage,
        confidence: response.data.confidence || 0.9,
        isTranscribed: true
      };

    } catch (error: any) {
      console.error('[VoiceService] Transcription error:', error?.message);
      return {
        text: '',
        language: this.currentLanguage,
        confidence: 0,
        isTranscribed: false
      };
    }
  }

  /**
   * Отправить голосовое сообщение в чат
   */
  async sendVoiceMessage(
    audioUri: string, 
    chatId: number | null, 
    conversationHistory: any[] = [],
    language?: SupportedLanguage
  ): Promise<any> {
    const targetLanguage = language || this.currentLanguage;
    console.log(`[VoiceService] Sending voice message to chat ${chatId}`);
    
    try {
      const formData = new FormData();
      const filename = audioUri.split('/').pop() || 'voice_message.m4a';
      const fileType = 'audio/m4a';

      // @ts-ignore
      formData.append('audio', {
        uri: Platform.OS === 'ios' ? audioUri.replace('file://', '') : audioUri,
        name: filename,
        type: fileType,
      });

      formData.append('language', targetLanguage);
      if (chatId) formData.append('chatId', String(chatId));
      
      if (conversationHistory && conversationHistory.length > 0) {
        formData.append('conversationHistory', JSON.stringify(conversationHistory));
      }

      console.log('[VoiceService] Uploading to /chat-with-voice...');

      const response = await axiosInstance.post('/chat-with-voice', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        transformRequest: (data) => data,
      });

      console.log('[VoiceService] Process response:', response.data);
      return response.data;

    } catch (error: any) {
      console.error('[VoiceService] Send voice message error:', error?.response?.data || error.message);
      throw new Error(error?.response?.data?.error || 'Failed to process voice message');
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
}

// Синглтон экземпляр
export const voiceService = new VoiceService();
