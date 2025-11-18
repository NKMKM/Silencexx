import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Получаем API URL
const getApiUrl = () => {
  if (__DEV__) {
    // Используем локальный IP адрес компьютера
    // ВАЖНО: Устройство и компьютер должны быть в одной Wi-Fi сети
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
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
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
}

export interface ChatResponse {
  success: boolean;
  response: string;
  isCrisis?: boolean;
  mood?: string;
  requestId?: string;
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
      const response = await api.post<AuthResponse>('/auth/register', {
        method,
        contact,
        name,
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
        error: error.response?.data?.error || 'Ошибка регистрации',
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
};

export default chatApi;

// Экспорт axios инстанса для прямого доступа (OAuth, Auth endpoints)
export { api as axiosInstance };
