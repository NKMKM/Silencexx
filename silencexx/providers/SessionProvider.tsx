import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';
import { authApi } from '@/services/api';

// Публичные страницы, где не нужна проверка авторизации
const PUBLIC_ROUTES = ['/', '/login', '/register', '/otp'];

interface SessionProviderProps {
  children: React.ReactNode;
}

/**
 * Провайдер для глобальной проверки сессий
 * Проверяет валидность сессии:
 * 1. При возвращении приложения из фона
 * 2. Периодически каждые 5 секунд (независимо от экрана)
 */
export function SessionProvider({ children }: SessionProviderProps) {
  const router = useRouter();
  const segments = useSegments();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const isCheckingRef = useRef(false);
  const lastCheckRef = useRef<number>(0);

  const checkSession = async (force = false) => {
    // Получаем текущий путь
    const currentPath = segments.length > 0 ? `/${segments.join('/')}` : '/';
    
    // Пропускаем проверку на публичных страницах
    if (PUBLIC_ROUTES.some(route => currentPath.startsWith(route))) {
      return;
    }

    // Защита от слишком частых проверок (минимум 2 секунды между проверками)
    const now = Date.now();
    if (!force && now - lastCheckRef.current < 2000) {
      return;
    }

    // Защита от одновременных проверок
    if (isCheckingRef.current) {
      return;
    }

    lastCheckRef.current = now;

    try {
      isCheckingRef.current = true;

      const token = await AsyncStorage.getItem('auth_token');
      
      if (!token) {
        console.log('🔒 [SessionProvider] No token found, redirecting to login');
        router.replace('/login');
        return;
      }

      // Проверяем валидность токена через запрос к API
      console.log('🔍 [SessionProvider] Checking session validity...');
      const response = await authApi.getProfile();
      
      if (!response.success) {
        console.log('❌ [SessionProvider] Session invalid, redirecting to login');
        await AsyncStorage.multiRemove(['auth_token', 'user_data']);
        router.replace('/login');
      } else {
        console.log('✅ [SessionProvider] Session valid');
      }
    } catch (error: any) {
      console.error('❌ [SessionProvider] Session check failed:', error.message || error);
      
      // Если ошибка 401 или 403 - сессия невалидна
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('🚪 [SessionProvider] Unauthorized, clearing session');
        await AsyncStorage.multiRemove(['auth_token', 'user_data']);
        router.replace('/login');
      }
      // Игнорируем другие ошибки (например, сетевые проблемы)
    } finally {
      isCheckingRef.current = false;
    }
  };

  useEffect(() => {
    console.log('🔐 [SessionProvider] Initializing session monitoring');

    // Подписка на изменения состояния приложения
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // Когда приложение возвращается из фона в активное состояние
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('📱 [SessionProvider] App became active, checking session...');
        checkSession(true);
      }
      appStateRef.current = nextAppState;
    });

    // Периодическая проверка каждые 5 секунд (работает всегда, независимо от экрана)
    intervalRef.current = setInterval(() => {
      if (AppState.currentState === 'active') {
        console.log('⏰ [SessionProvider] Periodic session check...');
        checkSession();
      }
    }, 5000) as ReturnType<typeof setInterval>;

    return () => {
      console.log('🔐 [SessionProvider] Cleaning up session monitoring');
      subscription.remove();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return <>{children}</>;
}
