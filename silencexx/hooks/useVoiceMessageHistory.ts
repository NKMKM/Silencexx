/**
 * React Hook для управления историей голосовых сообщений в чате
 * silencexx/hooks/useVoiceMessageHistory.ts
 *
 * Управляет загрузкой, отправкой и кэшированием голосовых сообщений
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  VoiceMessage,
  VoiceMessageDisplayed,
  SendVoiceMessageParams,
  SendVoiceMessageResponse,
  LoadVoiceMessagesParams,
  LoadVoiceMessagesResponse,
  VoiceError,
  VOICE_ERROR_CODES,
  VOICE_CONSTRAINTS,
} from '../types/voice';

/**
 * Интерфейс для хука useVoiceMessageHistory
 */
export interface UseVoiceMessageHistoryReturn {
  // Состояние
  messages: VoiceMessageDisplayed[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;

  // Функции
  loadMessages: (chatId: number, limit?: number, offset?: number) => Promise<void>;
  sendMessage: (
    chatId: number,
    audioUri: string,
    duration: number,
    size: number,
    mimeType: string,
    mood?: string
  ) => Promise<VoiceMessage | null>;
  deleteMessage: (messageId: string) => Promise<void>;
  updateMessagePlaybackState: (messageId: string, isPlaying: boolean, currentTime?: number) => void;
  addLocalMessage: (message: VoiceMessage) => void;

  // Утилиты
  getTotalDuration: () => number;
  getCacheKey: (chatId: number) => string;
  clearCache: () => Promise<void>;
}

/**
 * Hook для управления историей голосовых сообщений в чате
 *
 * @param userId - ID пользователя (для изоляции)
 * @param enableCache - Включить кэширование сообщений (default: true)
 * @returns Объект с функциями и состоянием для управления голосовыми сообщениями
 *
 * @example
 * const { messages, sendMessage, loadMessages } = useVoiceMessageHistory(userId);
 *
 * useEffect(() => {
 *   loadMessages(chatId);
 * }, [chatId]);
 *
 * const handleSendVoice = async (audioUri, duration) => {
 *   await sendMessage(chatId, audioUri, duration, size, 'audio/mp4', mood);
 * };
 */
export function useVoiceMessageHistory(userId: number, enableCache: boolean = true): UseVoiceMessageHistoryReturn {
  const [messages, setMessages] = useState<VoiceMessageDisplayed[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const isMountedRef = useRef<boolean>(true);
  const cacheRef = useRef<Map<string, VoiceMessageDisplayed[]>>(new Map());
  const messagesRef = useRef<Map<string, VoiceMessageDisplayed>>(new Map());
  const uploadProgressRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Получить ключ кэша для чата
   */
  const getCacheKey = useCallback((chatId: number): string => {
    return `voice_messages_${userId}_${chatId}`;
  }, [userId]);

  /**
   * Обновить состояние только если компонент еще смонтирован
   */
  const updateState = useCallback(
    (newMessages: VoiceMessageDisplayed[], isError?: Error | null, isLoadingMore?: boolean) => {
      if (!isMountedRef.current) return;

      setMessages(newMessages);

      if (isError !== undefined) {
        setError(isError);
      }

      if (isLoadingMore !== undefined) {
        setIsLoading(isLoadingMore);
      }

      // Обновляем кэш если включен
      if (enableCache && newMessages.length > 0) {
        const cacheKey = getCacheKey(newMessages[0].chatId);
        cacheRef.current.set(cacheKey, newMessages);
      }

      // Обновляем индекс сообщений
      newMessages.forEach(msg => {
        messagesRef.current.set(msg.id || msg.audioUri, msg);
      });
    },
    [enableCache, getCacheKey]
  );

  /**
   * Загрузить голосовые сообщения из чата
   */
  const loadMessages = useCallback(
    async (chatId: number, limit: number = 50, offset: number = 0) => {
      try {
        setIsLoading(true);
        setError(null);

        // Проверяем кэш
        const cacheKey = getCacheKey(chatId);
        if (enableCache && offset === 0) {
          const cached = cacheRef.current.get(cacheKey);
          if (cached && cached.length > 0) {
            updateState(cached, null, false);
            return;
          }

          // Пытаемся загрузить из AsyncStorage
          try {
            const cachedData = await AsyncStorage.getItem(cacheKey);
            if (cachedData) {
              const parsed = JSON.parse(cachedData) as VoiceMessageDisplayed[];
              updateState(parsed, null, false);
              return;
            }
          } catch (err) {
            console.warn('Error loading cache:', err);
          }
        }

        // Загружаем с сервера
        try {
          const response = await fetch(
            `/api/voice-messages?chatId=${chatId}&userId=${userId}&limit=${limit}&offset=${offset}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                // Authorization header будет добавлен в API interceptor
              },
            }
          );

          if (!response.ok) {
            throw new VoiceError(
              VOICE_ERROR_CODES.NETWORK_ERROR,
              `Failed to load messages: ${response.status}`
            );
          }

          const data = (await response.json()) as LoadVoiceMessagesResponse;

          if (!data.success) {
            throw new VoiceError(
              VOICE_ERROR_CODES.NETWORK_ERROR,
              data.error || 'Failed to load messages'
            );
          }

          const displayMessages: VoiceMessageDisplayed[] = data.messages.map(msg => ({
            ...msg,
            isPlaying: false,
            isPaused: false,
            currentTime: 0,
            sender: msg.userId === userId ? 'user' : 'ai',
          }));

          // Если это первая загрузка, заменяем сообщения
          if (offset === 0) {
            updateState(displayMessages, null, false);
          } else {
            // Если это подгрузка, добавляем к существующим
            const updated = [...messages, ...displayMessages];
            updateState(updated, null, false);
          }

          // Сохраняем в кэш
          if (enableCache) {
            try {
              await AsyncStorage.setItem(cacheKey, JSON.stringify(displayMessages));
            } catch (err) {
              console.warn('Error saving cache:', err);
            }
          }

          setHasMore(displayMessages.length === limit);
        } catch (err) {
          const error = err instanceof Error ? err : new Error('Unknown error');
          updateState(messages, error, false);
          throw error;
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load messages');
        if (isMountedRef.current) {
          setError(error);
          setIsLoading(false);
        }
      }
    },
    [userId, messages, enableCache, getCacheKey, updateState]
  );

  /**
   * Отправить голосовое сообщение на сервер
   * 
   * НОВЫЙ PIPELINE:
   * 1. Отправляет аудиофайл
   * 2. Backend транскрибирует в текст (Whisper)
   * 3. Backend отправляет текст в Ollama
   * 4. Backend сохраняет оба сообщения в БД
   * 5. Возвращает результат с обоими сообщениями (пользователя + ИИ)
   */
  const sendMessage = useCallback(
    async (
      chatId: number,
      audioUri: string,
      duration: number,
      size: number,
      mimeType: string,
      mood?: string
    ): Promise<VoiceMessage | null> => {
      const messageId = `${Date.now()}_${Math.random()}`;

      try {
        // Импортируем voiceApi для использования нового endpoint
        const { voiceApi } = await import('../services/api');
        const { useAuth } = await import('./useAuthCheck');

        // Получаем userId из localStorage/AsyncStorage
        let currentUserId = userId;
        if (!currentUserId) {
          // Fallback: попробуем получить из токена
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const userStr = await AsyncStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            currentUserId = user.id;
          }
        }

        // Добавляем локальное сообщение в историю (оптимистичное обновление)
        const localMessage: VoiceMessageDisplayed = {
          id: messageId,
          userId: currentUserId,
          chatId,
          audioUri,
          duration,
          size,
          mimeType,
          isTranscribed: false,
          createdAt: new Date().toISOString(),
          isLocal: true,
          uploadProgress: 0,
          sender: 'user',
          isPlaying: false,
          isPaused: false,
          currentTime: 0,
        };

        // Добавляем в сообщения
        const updated = [...messages, localMessage];
        updateState(updated);

        console.log(`🎤 Sending voice message to backend... (${size} bytes, ${duration}ms)`);

        // НОВЫЙ PIPELINE: используем processVoiceMessage который делает:
        // 1. Транскрибирование (Whisper)
        // 2. Ollama ответ
        // 3. Сохранение в БД
        // 4. Возврат результата
        const response = await voiceApi.processVoiceMessage(
          chatId,
          currentUserId,
          audioUri,
          duration,
          size,
          mimeType,
          'ru', // language
          mood
        );

        console.log('✅ Voice message processed successfully');
        console.log(`   User transcription: "${response.userMessage.text}"`);
        console.log(`   AI response: "${response.aiMessage.text.substring(0, 50)}..."`);

        if (response.success && response.userMessage && response.aiMessage) {
          // Создаем сообщение пользователя
          const userMessage: VoiceMessageDisplayed = {
            id: response.userMessage.id || messageId,
            userId: currentUserId,
            chatId,
            audioUri: response.userMessage.audioUri,
            text: response.userMessage.text, // Транскрибирование
            duration,
            size,
            mimeType,
            isTranscribed: true,
            createdAt: response.userMessage.createdAt || new Date().toISOString(),
            isLocal: false,
            uploadProgress: 100,
            sender: 'user',
            isPlaying: false,
            isPaused: false,
            currentTime: 0,
          };

          // Создаем сообщение ИИ
          const aiMessage: VoiceMessageDisplayed = {
            id: response.aiMessage.id?.toString() || `ai_${Date.now()}`,
            userId: currentUserId,
            chatId,
            text: response.aiMessage.text, // Ответ от Ollama
            duration: 0,
            size: 0,
            mimeType: 'text/plain',
            isTranscribed: false,
            createdAt: response.aiMessage.createdAt || new Date().toISOString(),
            isLocal: false,
            uploadProgress: 100,
            sender: 'ai',
            isPlaying: false,
            isPaused: false,
            currentTime: 0,
          };

          // Добавляем оба сообщения в историю
          const newMessages = messages
            .filter(m => m.id !== messageId) // Удаляем локальное
            .concat([userMessage, aiMessage]); // Добавляем оба

          messagesRef.current.delete(messageId);
          messagesRef.current.set(userMessage.id, userMessage);
          messagesRef.current.set(aiMessage.id, aiMessage);

          updateState(newMessages);

          // Сохраняем в кэш
          const cacheKey = getCacheKey(chatId);
          if (cacheKey) {
            try {
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              await AsyncStorage.setItem(cacheKey, JSON.stringify(newMessages));
            } catch (err) {
              console.warn('Failed to update cache:', err);
            }
          }

          return userMessage;
        } else {
          const error = new VoiceError(
            VOICE_ERROR_CODES.UPLOAD_FAILED,
            response.error || 'Failed to process voice message'
          );
          throw error;
        }
      } catch (err) {
        // Удаляем неудачно отправленное сообщение
        const newMessages = messages.filter(m => m.id !== messageId);
        updateState(newMessages);

        const error = err instanceof Error ? err : new Error('Failed to send message');
        console.error('❌ Error sending voice message:', error);

        if (isMountedRef.current) {
          setError(error);
        }

        throw error;
      }
    },
    [userId, messages, updateState, getCacheKey]
  );

  /**
   * Удалить голосовое сообщение
   */
  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        const response = await fetch(`/api/voice-messages/${messageId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new VoiceError(
            VOICE_ERROR_CODES.NETWORK_ERROR,
            `Failed to delete message: ${response.status}`
          );
        }

        const newMessages = messages.filter(m => m.id !== messageId);
        messagesRef.current.delete(messageId);
        updateState(newMessages);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to delete message');
        if (isMountedRef.current) {
          setError(error);
        }

        throw error;
      }
    },
    [messages, updateState]
  );

  /**
   * Обновить состояние воспроизведения сообщения
   */
  const updateMessagePlaybackState = useCallback(
    (messageId: string, isPlaying: boolean, currentTime: number = 0) => {
      const updated = messages.map(m => {
        if (m.id === messageId) {
          return {
            ...m,
            isPlaying,
            currentTime,
          };
        }
        // Останавливаем воспроизведение других сообщений
        return { ...m, isPlaying: false };
      });

      updateState(updated);
    },
    [messages, updateState]
  );

  /**
   * Добавить локальное сообщение
   */
  const addLocalMessage = useCallback(
    (message: VoiceMessage) => {
      const displayMessage: VoiceMessageDisplayed = {
        ...message,
        sender: message.userId === userId ? 'user' : 'ai',
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
      };

      const updated = [...messages, displayMessage];
      updateState(updated);

      if (message.id) {
        messagesRef.current.set(message.id, displayMessage);
      }
    },
    [userId, messages, updateState]
  );

  /**
   * Получить общую длительность всех сообщений
   */
  const getTotalDuration = useCallback((): number => {
    return messages.reduce((sum, msg) => sum + (msg.duration || 0), 0);
  }, [messages]);

  /**
   * Очистить кэш
   */
  const clearCache = useCallback(async () => {
    try {
      cacheRef.current.clear();
      messagesRef.current.clear();
      uploadProgressRef.current.clear();

      // Очищаем AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const voiceKeys = keys.filter(k => k.startsWith('voice_messages_'));
      await AsyncStorage.multiRemove(voiceKeys);
    } catch (err) {
      console.warn('Error clearing cache:', err);
    }
  }, []);

  return {
    // Состояние
    messages,
    isLoading,
    error,
    hasMore,

    // Функции
    loadMessages,
    sendMessage,
    deleteMessage,
    updateMessagePlaybackState,
    addLocalMessage,

    // Утилиты
    getTotalDuration,
    getCacheKey,
    clearCache,
  };
}
