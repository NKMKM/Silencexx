import axios from 'axios';

// Using Web Speech API wrapper or Google Cloud Speech-to-Text API
// For production, use Google Cloud Speech-to-Text API key

export interface SpeechRecognitionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
}

export class SpeechRecognitionService {
  private apiKey: string;
  private baseUrl = 'https://speech.googleapis.com/v1/speech:recognize';

  constructor(apiKey?: string) {
    // Get API key from environment or config
    this.apiKey = apiKey || process.env.GOOGLE_SPEECH_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('[SpeechRecognition] No API key provided. Using fallback service.');
    }
  }

  async recognizeAudio(audioBase64: string, language: string = 'en-US'): Promise<SpeechRecognitionResult> {
    try {
      if (!this.apiKey) {
        return this.fallbackRecognition(audioBase64, language);
      }

      const requestBody = {
        config: {
          encoding: 'LINEAR16', // WAV PCM format
          sampleRateHertz: 16000,
          languageCode: language,
          enableAutomaticPunctuation: true,
          model: 'default',
        },
        audio: {
          content: audioBase64,
        },
      };

      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      if (response.data.results && response.data.results.length > 0) {
        const transcript = response.data.results[0].alternatives[0].transcript;
        const confidence = response.data.results[0].alternatives[0].confidence || 0.9;

        console.log('[SpeechRecognition] Recognized text:', transcript);

        return {
          text: transcript,
          confidence,
          isFinal: true,
        };
      }

      throw new Error('No transcription results returned');
    } catch (error) {
      console.error('[SpeechRecognition] Error recognizing audio:', error);
      throw error;
    }
  }

  // Fallback method using alternative service or local processing
  private async fallbackRecognition(
    audioBase64: string,
    language: string
  ): Promise<SpeechRecognitionResult> {
    try {
      // Could use AssemblyAI, RevAI, or other service here
      // For now, return a placeholder
      console.log('[SpeechRecognition] Using fallback recognition method');

      // You can integrate with AssemblyAI or other service
      // Example: https://www.assemblyai.com/
      // or use Deepgram: https://deepgram.com/

      // Placeholder response
      return {
        text: 'Speech recognition not fully configured. Please set up API key.',
        confidence: 0,
        isFinal: false,
      };
    } catch (error) {
      console.error('[SpeechRecognition] Fallback recognition failed:', error);
      throw error;
    }
  }

  // Set API key dynamically
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  // Support multiple languages
  getSupportedLanguages(): string[] {
    return [
      'en-US', // English (US)
      'en-GB', // English (UK)
      'es-ES', // Spanish
      'fr-FR', // French
      'de-DE', // German
      'it-IT', // Italian
      'pt-BR', // Portuguese (Brazil)
      'ru-RU', // Russian
      'ja-JP', // Japanese
      'zh-CN', // Chinese (Simplified)
      'zh-TW', // Chinese (Traditional)
      'ko-KR', // Korean
      'ar-SA', // Arabic
    ];
  }
}

// Using local/simpler approach with expo-speech recognition fallback
export class LocalSpeechRecognition {
  async recognizeAudio(audioUri: string): Promise<SpeechRecognitionResult> {
    // This would use a local model or the device's native speech recognition
    // For iOS: use Speech framework
    // For Android: use SpeechRecognizer
    console.warn(
      '[LocalSpeechRecognition] Local recognition not yet implemented. Use Google API instead.'
    );

    return {
      text: '',
      confidence: 0,
      isFinal: false,
    };
  }
}

export const speechRecognitionService = new SpeechRecognitionService(
  typeof process !== 'undefined' && process.env?.GOOGLE_SPEECH_API_KEY
    ? process.env.GOOGLE_SPEECH_API_KEY
    : undefined
);

// Initialize API key if using React Native/Expo environment
export const initializeSpeechRecognition = (apiKey: string) => {
  speechRecognitionService.setApiKey(apiKey);
};
