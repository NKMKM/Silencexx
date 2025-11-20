import { useEffect, useRef, useCallback } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '@/services/api';

// Публичные страницы, где не нужна проверка авторизации
const PUBLIC_ROUTES = ['/', '/login', '/register'];

/**
 * Hook для проверки статуса аутентификации
 * Проверяет валидность сессии при:
 * 1. Возвращении приложения из фона
 * 2. Периодически каждые 5 секунд (если приложение активно)
 */
export const useAuthCheck = () => {
  const router = useRouter();
  const segments = useSegments();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const isCheckingRef = useRef(false);
  const lastCheckRef = useRef<number>(0);
  const segmentsRef = useRef(segments);

  // Обновляем ref при изменении segments
  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  const checkAuth = useCallback(async (force = false) => {
    // Получаем текущий путь из ref
    const currentSegments = segmentsRef.current;
    const currentPath = currentSegments.length > 0 ? `/${currentSegments.join('/')}` : '/';
    
    // Пропускаем проверку на публичных страницах
    if (PUBLIC_ROUTES.includes(currentPath) || PUBLIC_ROUTES.some(route => currentPath.startsWith(route))) {
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
        console.log('🔒 [useAuthCheck] No token found, redirecting to login');
        router.replace('/login');
        return;
      }

      // Проверяем валидность токена через запрос к API
      console.log('🔍 [useAuthCheck] Checking session validity...');
      const response = await authApi.getProfile();
      
      if (!response.success) {
        console.log('❌ [useAuthCheck] Session invalid, redirecting to login');
        await AsyncStorage.multiRemove(['auth_token', 'user_data']);
        router.replace('/login');
      } else {
        console.log('✅ [useAuthCheck] Session valid');
      }
    } catch (error: any) {
      console.error('❌ [useAuthCheck] Auth check failed:', error.message || error);
      
      // Если ошибка 401 или 403 - сессия невалидна
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('🚪 [useAuthCheck] Unauthorized, clearing session');
        await AsyncStorage.multiRemove(['auth_token', 'user_data']);
        router.replace('/login');
      }
      // Игнорируем другие ошибки (например, сетевые проблемы)
      // чтобы не разлогинивать пользователя при временных проблемах
    } finally {
      isCheckingRef.current = false;
    }
  }, [router]);

  useEffect(() => {
    // Подписка на изменения состояния приложения
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // Когда приложение возвращается из фона в активное состояние
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('📱 [useAuthCheck] App became active, checking auth...');
        checkAuth();
      }
      appStateRef.current = nextAppState;
    });

    // Периодическая проверка каждые 5 секунд (только когда приложение активно)
    intervalRef.current = setInterval(() => {
      if (AppState.currentState === 'active') {
        console.log('⏰ [useAuthCheck] Periodic auth check...');
        checkAuth();
      }
    }, 5000) as ReturnType<typeof setInterval>;

    return () => {
      subscription.remove();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkAuth]);

  return { checkAuth };
};
