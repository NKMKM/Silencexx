import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

/**
 * Обработчик завершения сессии
 * Вызывается когда сессия была удалена на другом устройстве
 */
export const handleSessionTerminated = async () => {
  console.log('🚪 [SessionHandler] Session terminated by another device');
  
  // Удаляем токены
  await AsyncStorage.removeItem('auth_token');
  await AsyncStorage.removeItem('user_data');
  
  // Показываем уведомление
  Alert.alert(
    'Сессия завершена',
    'Ваша сессия была завершена на другом устройстве. Пожалуйста, войдите снова.',
    [
      {
        text: 'OK',
        onPress: () => {
          // Перенаправляем на логин
          try {
            router.replace('/login');
          } catch (error) {
            console.error('Navigation error:', error);
          }
        },
      },
    ],
    { cancelable: false }
  );
};

/**
 * Обработчик ошибок авторизации
 */
export const handleUnauthorized = async () => {
  console.log('🔒 [SessionHandler] Unauthorized, clearing session');
  
  await AsyncStorage.removeItem('auth_token');
  await AsyncStorage.removeItem('user_data');
  
  try {
    router.replace('/login');
  } catch (error) {
    console.error('Navigation error:', error);
  }
};
