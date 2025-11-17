import axios from 'axios';
import Constants from 'expo-constants';

// Получаем API URL
const getApiUrl = () => {
  if (__DEV__) {
    // В разработке используйте свой ngrok URL или localhost
    // Пример: return 'https://your-ngrok-url.ngrok-free.app/api';
    // Для локальной сети: return 'http://192.168.x.x:3000/api';
    return 'http://localhost:3000/api';
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

// Типы
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

export default chatApi;
