import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageContext, Language, getTranslations } from './i18n';

const LANGUAGE_STORAGE_KEY = '@cloudmind_language';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ru');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored && (stored === 'ru' || stored === 'en')) {
        setLanguageState(stored as Language);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  if (!isLoaded) {
    return null; // или можно показать загрузочный экран
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: getTranslations(language),
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}
