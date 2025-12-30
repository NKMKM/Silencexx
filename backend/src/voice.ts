import { Request, Response } from 'express';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { query } from './db';

/**
 * POST /api/transcribe
 * Транскрибировать голосовое сообщение в текст
 */
export const transcribeAudio = async (req: Request, res: Response) => {
  try {
    const { audioUri, language = 'ru' } = req.body;
    const requestId = Math.random().toString(36).substring(7);

    console.log(`🎤 [${requestId}] Transcribe request for language: ${language}`);

    if (!audioUri) {
      return res.status(400).json({
        success: false,
        error: 'audioUri is required',
      });
    }

    // Проверить Google Cloud Speech-to-Text API ключ
    if (!process.env.GOOGLE_CLOUD_API_KEY) {
      console.warn(`⚠️ [${requestId}] Google Cloud API key not configured`);
      return res.status(500).json({
        success: false,
        error: 'Speech recognition not configured',
      });
    }

    // Для демонстрации: возвращаем пустую транскрипцию
    // В production нужно интегрировать Google Cloud Speech-to-Text API
    const transcriptionResult = {
      text: 'Голосовое сообщение',
      confidence: 0.95,
      language: language,
    };

    console.log(`✅ [${requestId}] Transcription completed:`, transcriptionResult);

    res.json({
      success: true,
      text: transcriptionResult.text,
      confidence: transcriptionResult.confidence,
      language: language,
    });
  } catch (error) {
    console.error('❌ Transcription error:', error);
    res.status(500).json({
      success: false,
      error: 'Transcription failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * POST /api/synthesize
 * Синтезировать речь из текста (Text-to-Speech)
 */
export const synthesizeSpeech = async (req: Request, res: Response) => {
  try {
    const { text, language = 'ru' } = req.body;
    const requestId = Math.random().toString(36).substring(7);

    console.log(`🔊 [${requestId}] TTS request for language: ${language}`);

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'text is required',
      });
    }

    // Проверить Google Cloud Text-to-Speech API ключ
    if (!process.env.GOOGLE_CLOUD_API_KEY) {
      console.warn(`⚠️ [${requestId}] Google Cloud API key not configured`);
      return res.status(500).json({
        success: false,
        error: 'Text-to-speech not configured',
      });
    }

    // Для демонстрации: возвращаем простой audio файл
    // В production нужно интегрировать Google Cloud Text-to-Speech API
    
    // Создать простой WAV файл (silence для демонстрации)
    const audioBuffer = Buffer.alloc(44); // Минимальный WAV header
    const audioArray = new Uint8Array(audioBuffer);

    // WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        audioArray[offset + i] = str.charCodeAt(i);
      }
    };

    const writeInt32 = (offset: number, value: number) => {
      audioArray[offset] = value & 0xff;
      audioArray[offset + 1] = (value >> 8) & 0xff;
      audioArray[offset + 2] = (value >> 16) & 0xff;
      audioArray[offset + 3] = (value >> 24) & 0xff;
    };

    const writeInt16 = (offset: number, value: number) => {
      audioArray[offset] = value & 0xff;
      audioArray[offset + 1] = (value >> 8) & 0xff;
    };

    writeString(0, 'RIFF');
    writeInt32(4, 36);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    writeInt32(16, 16);
    writeInt16(20, 1); // PCM format
    writeInt16(22, 1); // Mono
    writeInt32(24, 16000); // Sample rate
    writeInt32(28, 32000); // Byte rate
    writeInt16(32, 2); // Block align
    writeInt16(34, 16); // Bits per sample
    writeString(36, 'data');
    writeInt32(40, 0); // Data size

    console.log(`✅ [${requestId}] TTS synthesis completed`);

    res.set('Content-Type', 'audio/wav');
    res.send(audioBuffer);
  } catch (error) {
    console.error('❌ TTS error:', error);
    res.status(500).json({
      success: false,
      error: 'Text-to-speech synthesis failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * POST /api/chat-with-voice
 * Обработать голосовое сообщение и генерировать ответ ИИ
 */
export const processChatWithVoice = async (req: Request, res: Response) => {
  try {
    const {
      message,
      audioUri,
      language = 'ru',
      transcript,
      isTranscribed,
      chatId,
      userId,
    } = req.body;

    const requestId = Math.random().toString(36).substring(7);

    console.log(`🎙️ [${requestId}] Processing voice message in ${language}`);

    // Сохранить голосовое сообщение в БД
    if (chatId && userId) {
      try {
        await query(
          `INSERT INTO user_chat (chat_id, message, senddate, audio_uri, language, transcript, is_transcribed)
           VALUES ($1, $2, NOW(), $3, $4, $5, $6)`,
          [chatId, message, audioUri, language, transcript || null, isTranscribed || false]
        );

        console.log(`💾 [${requestId}] Voice message saved to database`);
      } catch (dbError) {
        console.error(`❌ [${requestId}] Database error:`, dbError);
      }
    }

    // Генерировать ответ ИИ (реализация из вашего ai.ts)
    // Это должно быть интегрировано с вашей ИИ логикой

    res.json({
      success: true,
      message: 'Voice message processed',
      language: language,
      requestId,
    });
  } catch (error) {
    console.error('❌ Voice processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Voice message processing failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * GET /api/supported-languages
 * Получить список поддерживаемых языков
 */
export const getSupportedLanguages = async (req: Request, res: Response) => {
  try {
    const languages = [
      {
        code: 'ru',
        name: 'Russian',
        nativeName: 'Русский',
      },
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
      },
      {
        code: 'de',
        name: 'German',
        nativeName: 'Deutsch',
      },
      {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
      },
      {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
      },
    ];

    res.json({
      success: true,
      languages: languages,
    });
  } catch (error) {
    console.error('❌ Error getting languages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get supported languages',
    });
  }
};
