import { createContext, useContext } from 'react';

export type Language = 'ru' | 'en';

export interface Translations {
  // Common
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    confirm: string;
    back: string;
  };
  // Navigation
  navigation: {
    chat: string;
    calendar: string;
    settings: string;
  };
  // Chat
  chat: {
    title: string;
    newChat: string;
    temporaryChat: string;
    inputPlaceholder: string;
    voiceAssistant: string;
  };
  // Calendar
  calendar: {
    title: string;
    newEntry: string;
    noEntries: string;
    today: string;
  };
  // Settings
  settings: {
    title: string;
    profile: string;
    subscription: string;
    darkTheme: string;
    chatBackground: string;
    notifications: string;
    reminders: string;
    language: string;
    help: string;
    privacy: string;
    terms: string;
  };
}

const translations: Record<Language, Translations> = {
  ru: {
    common: {
      save: 'Сохранить',
      cancel: 'Отмена',
      delete: 'Удалить',
      edit: 'Редактировать',
      confirm: 'Подтвердить',
      back: 'Назад',
    },
    navigation: {
      chat: 'Чат',
      calendar: 'Календарь',
      settings: 'Настройки',
    },
    chat: {
      title: 'CloudMind',
      newChat: 'Новый разговор',
      temporaryChat: 'Временный',
      inputPlaceholder: 'Напишите сообщение...',
      voiceAssistant: 'Голосовой помощник',
    },
    calendar: {
      title: 'Дневник мыслей',
      newEntry: 'Новая запись',
      noEntries: 'Нет записей за эту дату',
      today: 'Сегодня',
    },
    settings: {
      title: 'Настройки',
      profile: 'Профиль',
      subscription: 'Подписка',
      darkTheme: 'Тёмная тема',
      chatBackground: 'Фон чата',
      notifications: 'Push-уведомления',
      reminders: 'Напоминания',
      language: 'Язык',
      help: 'Помощь',
      privacy: 'Конфиденциальность',
      terms: 'Условия использования',
    },
  },
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      confirm: 'Confirm',
      back: 'Back',
    },
    navigation: {
      chat: 'Chat',
      calendar: 'Calendar',
      settings: 'Settings',
    },
    chat: {
      title: 'CloudMind',
      newChat: 'New Chat',
      temporaryChat: 'Temporary',
      inputPlaceholder: 'Type a message...',
      voiceAssistant: 'Voice Assistant',
    },
    calendar: {
      title: 'Thought Journal',
      newEntry: 'New Entry',
      noEntries: 'No entries for this date',
      today: 'Today',
    },
    settings: {
      title: 'Settings',
      profile: 'Profile',
      subscription: 'Subscription',
      darkTheme: 'Dark Theme',
      chatBackground: 'Chat Background',
      notifications: 'Push Notifications',
      reminders: 'Reminders',
      language: 'Language',
      help: 'Help',
      privacy: 'Privacy',
      terms: 'Terms of Use',
    },
  },
};

export const getTranslations = (language: Language): Translations => {
  return translations[language];
};

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

export const LanguageContext = createContext<LanguageContextType>({
  language: 'ru',
  setLanguage: () => {},
  t: translations.ru,
});

export const useLanguage = () => useContext(LanguageContext);
