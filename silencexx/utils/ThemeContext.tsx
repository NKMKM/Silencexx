import { createContext, useContext, useState, useEffect, ReactNode, useRef, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme, Animated } from 'react-native';

export type Theme = 'light' | 'dark' | 'system';
export type ChatBackground = 'gradient' | 'clouds' | 'aurora' | 'minimal' | 'stars';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  chatBackground: ChatBackground;
  setChatBackground: (background: ChatBackground) => void;
  activeTheme: 'light' | 'dark';
  themeTransition: Animated.Value;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = '@cloudmind_theme';
const BACKGROUND_KEY = '@cloudmind_chat_background';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('system');
  const [chatBackground, setChatBackgroundState] = useState<ChatBackground>('gradient');
  const [isLoading, setIsLoading] = useState(true);
  const themeTransition = useRef(new Animated.Value(0)).current;

  const activeTheme: 'light' | 'dark' = 
    theme === 'system' 
      ? (systemScheme === 'dark' ? 'dark' : 'light')
      : theme;

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    // Animate theme transition
    Animated.timing(themeTransition, {
      toValue: activeTheme === 'dark' ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [activeTheme]);

  const loadSettings = async () => {
    try {
      const [savedTheme, savedBackground] = await Promise.all([
        AsyncStorage.getItem(THEME_KEY),
        AsyncStorage.getItem(BACKGROUND_KEY),
      ]);

      if (savedTheme) setThemeState(savedTheme as Theme);
      if (savedBackground) setChatBackgroundState(savedBackground as ChatBackground);
    } catch (error) {
      console.error('Error loading theme settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setTheme = useCallback(async (newTheme: Theme) => {
    try {
      setThemeState(newTheme);
      await AsyncStorage.setItem(THEME_KEY, newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }, []);

  const setChatBackground = useCallback(async (newBackground: ChatBackground) => {
    try {
      setChatBackgroundState(newBackground);
      await AsyncStorage.setItem(BACKGROUND_KEY, newBackground);
    } catch (error) {
      console.error('Error saving background:', error);
    }
  }, []);

  const contextValue = useMemo(
    () => ({ theme, setTheme, chatBackground, setChatBackground, activeTheme, themeTransition }),
    [theme, chatBackground, activeTheme, setTheme, setChatBackground]
  );

  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
