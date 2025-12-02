import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DISCLAIMER_KEY = 'disclaimer_accepted';

export const useDisclaimerModal = () => {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Проверить, принял ли пользователь дисклеймер
  const checkDisclaimer = async () => {
    try {
      const accepted = await AsyncStorage.getItem(DISCLAIMER_KEY);
      // Показываем дисклеймер каждый раз при входе новой сессии
      // Если нужно показывать только один раз, замените условие
      setShowDisclaimer(!accepted);
    } catch (error) {
      console.error('Error checking disclaimer:', error);
      setShowDisclaimer(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Пометить дисклеймер как принятый
  const acceptDisclaimer = async () => {
    try {
      await AsyncStorage.setItem(DISCLAIMER_KEY, 'true');
      setShowDisclaimer(false);
    } catch (error) {
      console.error('Error accepting disclaimer:', error);
    }
  };

  // Отклонить дисклеймер (выход из приложения)
  const rejectDisclaimer = async () => {
    try {
      await AsyncStorage.removeItem(DISCLAIMER_KEY);
      setShowDisclaimer(false);
    } catch (error) {
      console.error('Error rejecting disclaimer:', error);
    }
  };

  return {
    showDisclaimer,
    isLoading,
    checkDisclaimer,
    acceptDisclaimer,
    rejectDisclaimer,
  };
};
