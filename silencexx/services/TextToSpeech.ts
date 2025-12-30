import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

export interface TextToSpeechOptions {
  language?: string;
  pitch?: number; // 0.5 - 2.0
  rate?: number; // 0.5 - 2.0
  volume?: number; // 0 - 1
}

export class TextToSpeechService {
  private isSpeaking = false;
  private currentUtterance: string = '';

  async speak(
    text: string,
    options: TextToSpeechOptions = {}
  ): Promise<void> {
    try {
      // Stop previous speech if still playing
      if (this.isSpeaking) {
        await this.stop();
      }

      const {
        language = 'en',
        pitch = 1.0,
        rate = 1.0,
        volume = 1.0,
      } = options;

      this.currentUtterance = text;
      this.isSpeaking = true;

      console.log('[TextToSpeech] Speaking text:', text);

      // Platform-specific voice selection
      const voice = Platform.OS === 'ios' ? 'Samantha' : '';

      await Speech.speak(text, {
        language,
        pitch,
        rate,
        volume,
        voice: voice || undefined,
        onDone: () => {
          console.log('[TextToSpeech] Speech completed');
          this.isSpeaking = false;
        },
        onError: (error) => {
          console.error('[TextToSpeech] Speech error:', error);
          this.isSpeaking = false;
        },
      });
    } catch (error) {
      console.error('[TextToSpeech] Error speaking text:', error);
      this.isSpeaking = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.isSpeaking) {
        await Speech.stop();
        this.isSpeaking = false;
        console.log('[TextToSpeech] Speech stopped');
      }
    } catch (error) {
      console.error('[TextToSpeech] Error stopping speech:', error);
    }
  }

  async pause(): Promise<void> {
    try {
      // Note: pause might not be available on all platforms
      if (this.isSpeaking) {
        await Speech.pause();
        console.log('[TextToSpeech] Speech paused');
      }
    } catch (error) {
      console.error('[TextToSpeech] Error pausing speech:', error);
    }
  }

  async resume(): Promise<void> {
    try {
      if (this.isSpeaking && this.currentUtterance) {
        await this.speak(this.currentUtterance);
      }
    } catch (error) {
      console.error('[TextToSpeech] Error resuming speech:', error);
    }
  }

  isSpeakingNow(): boolean {
    return this.isSpeaking;
  }

  // Get available voices (platform specific)
  async getAvailableVoices(): Promise<any[]> {
    try {
      // This API is limited on React Native
      console.log('[TextToSpeech] Getting available voices');
      return [];
    } catch (error) {
      console.error('[TextToSpeech] Error getting voices:', error);
      return [];
    }
  }

  // Get supported languages
  getSupportedLanguages(): string[] {
    return [
      'en', // English
      'es', // Spanish
      'fr', // French
      'de', // German
      'it', // Italian
      'pt', // Portuguese
      'ru', // Russian
      'ja', // Japanese
      'zh', // Chinese
      'ko', // Korean
      'ar', // Arabic
    ];
  }

  // Platform-specific voices
  getPlatformVoice(): string {
    if (Platform.OS === 'ios') {
      return 'Samantha';
    } else if (Platform.OS === 'android') {
      return 'FEMALE'; // Android default
    }
    return 'default';
  }
}

export const textToSpeechService = new TextToSpeechService();
