import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    
    // Приоритет 2: Локальный IP адрес (если в одной сети)
    console.log('📡 Using local network IP');
    return 'http://192.168.100.120:3000/api';
  }
  
  // Для продакшена замените на ваш реальный API URL
  return 'https://your-production-api.com/api';
};

const API_URL = getApiUrl();
console.log('🔌 API URL:', API_URL);

// Создаем axios инстанс
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor для добавления токена
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
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
export const chatApi = {
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
      const response = await api.get('/chats/list');
      return response.data;
    } catch (error) {
      console.error('❌ Error getting chat list:', error);
      throw error;
    }
  },

  /**
   * Получить сообщения из чата
   */
  getChatMessages: async (chatId: number): Promise<{ success: boolean; messages: ChatHistoryMessage[] }> => {
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
export const authApi = {
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
};

// Inbox API
export const inboxApi = {
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

export default chatApi;

// Экспорт axios инстанса для прямого доступа (OAuth, Auth endpoints)
export { api as axiosInstance };
