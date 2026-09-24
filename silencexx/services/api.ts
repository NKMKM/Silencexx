import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { handleSessionTerminated, handleUnauthorized } from './sessionHandler';

// Пытаемся загрузить ngrok URL из файла
let ngrokConfig = { apiUrl: '' };
try {
  ngrokConfig = require('../ngrok-url.json');
} catch (error) {
  console.log('⚠️  ngrok-url.json not found, using fallback URL');
}

// Получаем API URL
const getApiUrl = () => {
  if (__DEV__) {
    // Приоритет 1: Ngrok URL из файла (если backend запущен с ngrok)
    if (ngrokConfig.apiUrl && ngrokConfig.apiUrl !== 'http://localhost:3000/api') {
      console.log('🌐 Using ngrok URL from config');
      return ngrokConfig.apiUrl;
    }
    
    // Приоритет 2: Используем localhost для веб, и локальный IP для мобильного
    // Это правильнее, чем угадывать IP
    const isWeb = Platform.OS === 'web';
    if (isWeb) {
      console.log('📱 Web platform, using localhost');
      return 'http://localhost:3000/api';
    } else {
      // Для мобильного - используем локальный IP или ngrok
      console.log('📡 Mobile platform, using local network IP');
      // Если вы знаете IP своей машины, замените здесь
      // В противном случае используйте ngrok или создайте ngrok-url.json
      return 'http://192.168.100.120:3000/api';
    }
  }
  
  // Для продакшена замените на ваш реальный API URL
  return 'https://your-production-api.com/api';
};

const API_URL = getApiUrl();
console.log('🔌 API URL:', API_URL);

// Экспортируем функцию для получения базового URL (без /api)
export const getBaseURL = () => {
  return API_URL.replace('/api', '');
};

// Создаем axios инстанс
const api = axios.create({
  baseURL: API_URL,
  timeout: 200000, // 200 seconds - match backend timeout for Ollama responses
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // Обход предупреждения ngrok
  },
});

// Interceptor для добавления токена
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    console.log('🔑 Token check:', token ? `Found (${token.substring(0, 20)}...)` : 'NOT FOUND');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor для обработки ошибок авторизации
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Проверяем если это завершенная сессия
      if (error.response?.data?.session_terminated) {
        console.log('🚪 Session terminated, handling redirect...');
        handleSessionTerminated();
      } else {
        console.log('🔒 Unauthorized, handling redirect...');
        handleUnauthorized();
      }
    }
    return Promise.reject(error);
  }
);

// Типы для Auth
export interface User {
  id: number;
  name: string;
  contact: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  requiresOTP?: boolean;
  contact?: string;
  message?: string;
  error?: string;
}

// Типы для Chat
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ChatRequest {
  message: string;
  mood?: string;
  conversationHistory?: ChatMessage[];
  chatId?: number;
}

export interface ChatResponse {
  success: boolean;
  response: string;
  isCrisis?: boolean;
  mood?: string;
  requestId?: string;
}

export interface ChatHistoryItem {
  id: number;
  user_id: number;
  last_message: string;
  last_message_date: string;
}

export interface ChatHistoryMessage {
  sender: 'user' | 'ai';
  message: string;
  senddate: string;
}

// New interface for messages from /chats/:chatId/messages endpoint
export interface ApiMessage {
  id: number;
  chat_id: number;
  user_id: number;
  role: 'user' | 'assistant';
  type?: 'text' | 'voice';
  text?: string;
  audio_url?: string;
  status?: 'uploaded' | 'transcribing' | 'ready' | 'error';
  created_at: string;
}

export interface CrisisDetectionRequest {
  message: string;
}

export interface CrisisDetectionResponse {
  isCrisis: boolean;
  keywords?: string[];
}

export interface MoodAnalysisRequest {
  message: string;
}

export interface MoodAnalysisResponse {
  mood: string;
  score: number;
}

// Типы для Inbox
export interface AnonymousMessage {
  id: number;
  message: string;
  sent_at: string;
  is_read: boolean;
}

export interface SendWishResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ReceivedMessagesResponse {
  success: boolean;
  messages: AnonymousMessage[];
}

export interface CanSendResponse {
  success: boolean;
  canSend: boolean;
  hoursLeft?: number;
  minutesLeft?: number;
  nextAvailable?: string;
}

// API методы
const chatApi = {
  /**
   * Отправить голосовое сообщение (New Architecture)
   */
  sendVoiceMessage: async (chatId: string, audioUri: string) => {
    const formData = new FormData();
    formData.append('chatId', chatId);
    
    // Determining file name/type
    const filename = audioUri.split('/').pop() || 'voice.m4a';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `audio/${match[1]}` : 'audio/m4a';

    formData.append('audio', {
      uri: audioUri,
      name: filename,
      type,
    } as any);

    try {
        console.log('📤 Sending voice message to:', API_URL + '/messages/voice');
        const response = await api.post('/messages/voice', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            transformRequest: (data) => data, // Avoid axios messing up FormData
        });
        console.log('✅ Voice message sent, received:', response.data);
        return response.data;
    } catch (error: any) {
        console.error('❌ Upload voice error:', error.response?.data || error.message);
        throw error;
    }
  },

  /**
   * Отправить сообщение AI и получить ответ
   */
  sendMessage: async (request: ChatRequest): Promise<ChatResponse> => {
    try {
      console.log('📤 Sending message to AI:', request.message.substring(0, 50));
      const response = await api.post<ChatResponse>('/chat', request);
      console.log('✅ Received AI response');
      return response.data;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || 
          'Не удалось подключиться к серверу. Проверьте, запущен ли backend.';
        throw new Error(errorMessage);
      }
      throw error;
    }
  },

  /**
   * Проверить сообщение на кризисные сигналы
   */
  detectCrisis: async (request: CrisisDetectionRequest): Promise<CrisisDetectionResponse> => {
    try {
      const response = await api.post<CrisisDetectionResponse>('/detect-crisis', request);
      return response.data;
    } catch (error) {
      console.error('❌ Error detecting crisis:', error);
      throw error;
    }
  },

  /**
   * Проанализировать настроение из сообщения
   */
  analyzeMood: async (request: MoodAnalysisRequest): Promise<MoodAnalysisResponse> => {
    try {
      const response = await api.post<MoodAnalysisResponse>('/analyze-mood', request);
      return response.data;
    } catch (error) {
      console.error('❌ Error analyzing mood:', error);
      throw error;
    }
  },

  /**
   * Проверить здоровье сервера
   */
  healthCheck: async (): Promise<{ status: string; timestamp: string }> => {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      throw error;
    }
  },

  /**
   * Получить данные профиля пользователя
   */
  getProfile: async (): Promise<any> => {
    try {
      const response = await api.get('/auth/profile');
      return response.data;
    } catch (error) {
      console.error('❌ Error getting profile:', error);
      throw error;
    }
  },

  /**
   * Получить список активных сессий
   */
  getSessions: async (): Promise<any> => {
    try {
      const response = await api.get('/auth/sessions');
      return response.data;
    } catch (error) {
      console.error('❌ Error getting sessions:', error);
      throw error;
    }
  },

  /**
   * Удалить сессию (выйти с устройства)
   */
  deleteSession: async (sessionId: number): Promise<any> => {
    try {
      const response = await api.delete(`/auth/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting session:', error);
      throw error;
    }
  },

  /**
   * Выход из системы (удаление текущей сессии)
   */
  logout: async (): Promise<any> => {
    try {
      const response = await api.post('/auth/logout');
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      return response.data;
    } catch (error) {
      console.error('❌ Error logging out:', error);
      // Даже при ошибке удаляем локальные данные
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      throw error;
    }
  },

  /**
   * Создать новый чат
   */
  createChat: async (isTemporary: boolean = false): Promise<{ success: boolean; chatId: number }> => {
    try {
      const response = await api.post('/chats/create', { isTemporary });
      return response.data;
    } catch (error) {
      console.error('❌ Error creating chat:', error);
      throw error;
    }
  },

  /**
   * Получить список всех чатов
   */
  getChatList: async (): Promise<{ success: boolean; chats: ChatHistoryItem[] }> => {
    try {
      console.log('📋 Fetching chat list from:', API_URL + '/chats/list');
      const response = await api.get('/chats/list');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error getting chat list:', error);
      console.error('❌ Response data:', error.response?.data);
      console.error('❌ Response status:', error.response?.status);
      console.error('❌ Response headers:', error.response?.headers);
      throw error;
    }
  },

  /**
   * Получить сообщения из чата
   */
  getChatMessages: async (chatId: string | number): Promise<{ success: boolean; messages: ApiMessage[] }> => {
    try {
      const response = await api.get(`/chats/${chatId}/messages`);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting chat messages:', error);
      throw error;
    }
  },

  /**
   * Удалить чат
   */
  deleteChatHistory: async (chatId: number): Promise<{ success: boolean }> => {
    try {
      const response = await api.delete(`/chats/${chatId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting chat:', error);
      throw error;
    }
  },
};
// Authentication API
const authApi = {
  /**
   * Регистрация нового пользователя
   */
  register: async (
    method: 'email' | 'phone',
    contact: string,
    name: string,
    password: string
  ): Promise<AuthResponse> => {
    try {
      console.log('📤 Sending registration request to:', api.defaults.baseURL);
      console.log('📦 Request data:', { method, contact, name, passwordLength: password.length });
      
      const response = await api.post<AuthResponse>('/auth/register', {
        method,
        contact,
        name,
        password,
      });
      
      console.log('✅ Registration response:', response.data);
      
      if (response.data.token) {
        await AsyncStorage.setItem('auth_token', response.data.token);
        await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Registration API error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Ошибка регистрации',
      };
    }
  },

  /**
   * Вход в систему
   */
  login: async (
    method: 'email' | 'phone',
    contact: string,
    password?: string
  ): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/auth/login', {
        method,
        contact,
        password,
      });
      
      if (response.data.token) {
        await AsyncStorage.setItem('auth_token', response.data.token);
        await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка входа',
      };
    }
  },

  /**
   * Проверка OTP кода
   */
  verifyOTP: async (contact: string, code: string): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/auth/verify-otp', {
        contact,
        code,
      });
      
      if (response.data.token) {
        await AsyncStorage.setItem('auth_token', response.data.token);
        await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Неверный код',
      };
    }
  },

  /**
   * Повторная отправка OTP
   */
  resendOTP: async (contact: string): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/auth/resend-otp', {
        contact,
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка отправки кода',
      };
    }
  },

  /**
   * Восстановление пароля
   */
  resetPassword: async (
    contact: string,
    newPassword: string,
    otpCode?: string
  ): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/auth/reset-password', {
        contact,
        newPassword,
        otpCode,
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка сброса пароля',
      };
    }
  },

  /**
   * Выход из системы
   */
  logout: async (): Promise<void> => {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user_data');
  },

  /**
   * Получить текущего пользователя
   */
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Проверить авторизацию
   */
  isAuthenticated: async (): Promise<boolean> => {
    const token = await AsyncStorage.getItem('auth_token');
    return !!token;
  },

  /**
   * Получить данные профиля пользователя
   */
  getProfile: async (): Promise<any> => {
    try {
      const response = await api.get('/auth/profile');
      return response.data;
    } catch (error) {
      console.error('❌ Error getting profile:', error);
      throw error;
    }
  },

  /**
   * Получить список активных сессий
   */
  getSessions: async (): Promise<any> => {
    try {
      const response = await api.get('/auth/sessions');
      return response.data;
    } catch (error) {
      console.error('❌ Error getting sessions:', error);
      throw error;
    }
  },

  /**
   * Удалить сессию (выйти с устройства)
   */
  deleteSession: async (sessionId: number): Promise<any> => {
    try {
      const response = await api.delete(`/auth/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting session:', error);
      throw error;
    }
  },

  /**
   * Обновить профиль (имя, телефон)
   */
  updateProfile: async (data: { name?: string; phone?: string }): Promise<any> => {
    try {
      const response = await api.put('/auth/profile', data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error updating profile:', error);
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  /**
   * Сменить пароль
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<any> => {
    try {
      const response = await api.post('/auth/change-password', { currentPassword, newPassword });
      return response.data;
    } catch (error: any) {
      console.error('❌ Error changing password:', error);
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  /**
   * Загрузить аватар
   */
  uploadAvatar: async (uri: string): Promise<any> => {
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('avatar', {
        uri,
        name: filename,
        type,
      } as any);
      
      const response = await api.post('/auth/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ Error uploading avatar:', error);
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },
};
// Inbox API
const inboxApi = {
  /**
   * Отправить анонимное пожелание
   */
  sendWish: async (message: string): Promise<SendWishResponse> => {
    try {
      const response = await api.post('/inbox/send', { message });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  /**
   * Получить полученные сообщения
   */
  getReceived: async (): Promise<ReceivedMessagesResponse> => {
    try {
      const response = await api.get('/inbox/received');
      return response.data;
    } catch (error) {
      console.error('❌ Error getting received messages:', error);
      throw error;
    }
  },

  /**
   * Проверить можно ли отправить сообщение
   */
  canSend: async (): Promise<CanSendResponse> => {
    try {
      const response = await api.get('/inbox/can-send');
      return response.data;
    } catch (error) {
      console.error('❌ Error checking send availability:', error);
      throw error;
    }
  },

  /**
   * Пометить сообщение как прочитанное
   */
  markAsRead: async (messageId: number): Promise<{ success: boolean }> => {
    try {
      const response = await api.post(`/inbox/${messageId}/mark-read`);
      return response.data;
    } catch (error) {
      console.error('❌ Error marking message as read:', error);
      throw error;
    }
  },
};


// Journal API (diary)
const journalApi = {
  /**
   * Получить запись за дату YYYY-MM-DD
   */
  getEntry: async (date: string) => {
    try {
      const response = await api.get('/journal/entry', { params: { date } });
      return response.data;
    } catch (error: any) {
      console.error('❌ Error getting journal entry:', error?.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Получить список дат с записями
   */
  listEntries: async () => {
    try {
      const response = await api.get('/journal/list');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error getting journal list:', error?.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Создать запись (date YYYY-MM-DD)
   */
  createEntry: async (date: string, content: string) => {
    try {
      const response = await api.post('/journal/entry', { date, content });
      return response.data;
    } catch (error: any) {
      console.error('❌ Error creating journal entry:', error?.response?.data || error.message);
      throw error;
    }
  },
};

// Daily Tasks API (AI-generated tasks)
export interface DailyTask {
  id: number;
  title: string;
  description: string;
  status: 'locked' | 'opened' | 'completed';
  theme: string;
  streak: number;
  expiresAt: string;
  createdAt: string;
}

const dailyTasksApi = {
  /**
   * Получить текущее задание (или сгенерировать новое)
   */
  getTask: async (): Promise<{ success: boolean; task: DailyTask }> => {
    try {
      const response = await api.get('/daily-task');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error getting daily task:', error?.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Открыть задание (статус: locked -> opened)
   */
  openTask: async (taskId: number): Promise<{ success: boolean; status: string }> => {
    try {
      const response = await api.put('/daily-task/open', { taskId });
      return response.data;
    } catch (error: any) {
      console.error('❌ Error opening task:', error?.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Завершить задание
   */
  completeTask: async (taskId: number): Promise<{ success: boolean; status: string; reward?: any }> => {
    try {
      const response = await api.put('/daily-task/complete', { taskId });
      return response.data;
    } catch (error: any) {
      console.error('❌ Error completing task:', error?.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Получить историю стрика
   */
  getStreak: async (): Promise<{ success: boolean; streak: number; history: boolean[] }> => {
    try {
      const response = await api.get('/daily-task/streak');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error getting streak:', error?.response?.data || error.message);
      throw error;
    }
  },
};

// Экспорт всех API сервисов
export { chatApi, authApi, inboxApi, journalApi, dailyTasksApi, api };
export default chatApi;
