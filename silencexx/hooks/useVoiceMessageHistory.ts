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
        // Добавляем локальное сообщение в историю
        const localMessage: VoiceMessageDisplayed = {
          id: messageId,
          userId,
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

        // Подготавливаем FormData для загрузки файла
        const formData = new FormData();
        formData.append('chatId', chatId.toString());
        formData.append('audioUri', audioUri);
        formData.append('duration', duration.toString());
        formData.append('size', size.toString());
        formData.append('mimeType', mimeType);

        if (mood) {
          formData.append('mood', mood);
        }

        // Загружаем с отслеживанием прогресса
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', event => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            uploadProgressRef.current.set(messageId, percentComplete);

            // Обновляем UI
            const updatedMsg = { ...localMessage, uploadProgress: percentComplete };
            messagesRef.current.set(messageId, updatedMsg);

            if (isMountedRef.current) {
              const newMessages = messages.map(m =>
                m.id === messageId ? updatedMsg : m
              );
              updateState(newMessages);
            }
          }
        });

        return new Promise((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status === 200) {
              try {
                const response = JSON.parse(xhr.responseText) as SendVoiceMessageResponse;

                if (response.success && response.message) {
                  const serverMessage: VoiceMessageDisplayed = {
                    ...response.message,
                    sender: 'user',
                    isPlaying: false,
                    isPaused: false,
                    currentTime: 0,
                  };

                  // Заменяем локальное сообщение на серверное
                  const newMessages = messages.map(m =>
                    m.id === messageId ? serverMessage : m
                  );

                  messagesRef.current.delete(messageId);
                  if (serverMessage.id) {
                    messagesRef.current.set(serverMessage.id, serverMessage);
                  }

                  updateState(newMessages);
                  resolve(response.message);
                } else {
                  const error = new VoiceError(
                    VOICE_ERROR_CODES.UPLOAD_FAILED,
                    response.error || 'Failed to send message'
                  );
                  reject(error);
                }
              } catch (err) {
                reject(new Error('Invalid server response'));
              }
            } else {
              reject(new VoiceError(
                VOICE_ERROR_CODES.UPLOAD_FAILED,
                `Upload failed with status ${xhr.status}`
              ));
            }
          };

          xhr.onerror = () => {
            reject(new VoiceError(
              VOICE_ERROR_CODES.NETWORK_ERROR,
              'Network error during upload'
            ));
          };

          xhr.ontimeout = () => {
            reject(new VoiceError(
              VOICE_ERROR_CODES.TIMEOUT,
              'Upload timeout'
            ));
          };

          xhr.timeout = VOICE_CONSTRAINTS.UPLOAD_TIMEOUT;

          xhr.open('POST', '/api/voice-messages');
          // Authorization header будет добавлен в API interceptor
          xhr.send(formData);
        });
      } catch (err) {
        // Удаляем неудачно отправленное сообщение
        const newMessages = messages.filter(m => m.id !== messageId);
        updateState(newMessages);

        const error = err instanceof Error ? err : new Error('Failed to send message');
        if (isMountedRef.current) {
          setError(error);
        }

        throw error;
      }
    },
    [userId, messages, updateState]
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
