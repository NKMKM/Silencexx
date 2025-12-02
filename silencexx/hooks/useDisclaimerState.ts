import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DISCLAIMER_SHOW_KEY = 'disclaimer_show_pending';

export const useDisclaimerState = () => {
  const [shouldShowDisclaimer, setShouldShowDisclaimer] = useState(false);

  // Проверяем AsyncStorage при монтировании
  useEffect(() => {
    const checkDisclaimer = async () => {
      try {
        const value = await AsyncStorage.getItem(DISCLAIMER_SHOW_KEY);
        if (value === 'true') {
          setShouldShowDisclaimer(true);
          // Удаляем флаг после показа
          await AsyncStorage.removeItem(DISCLAIMER_SHOW_KEY);
        }
      } catch (error) {
        console.error('Error checking disclaimer state:', error);
      }
    };

    checkDisclaimer();
  }, []);

  const setShowDisclaimerAfterLogin = async () => {
    try {
      await AsyncStorage.setItem(DISCLAIMER_SHOW_KEY, 'true');
    } catch (error) {
      console.error('Error setting disclaimer state:', error);
    }
  };

  return {
    shouldShowDisclaimer,
    setShouldShowDisclaimer,
    setShowDisclaimerAfterLogin,
  };
};
