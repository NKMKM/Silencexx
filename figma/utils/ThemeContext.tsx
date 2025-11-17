import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'light' | 'dark';
export type ChatBackground = 'gradient' | 'clouds' | 'aurora' | 'minimal' | 'stars';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  chatBackground: ChatBackground;
  setChatBackground: (background: ChatBackground) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('cloudmind-theme');
    return (saved as Theme) || 'light';
  });

  const [chatBackground, setChatBackground] = useState<ChatBackground>(() => {
    const saved = localStorage.getItem('cloudmind-chat-background');
    return (saved as ChatBackground) || 'gradient';
  });

  useEffect(() => {
    localStorage.setItem('cloudmind-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('cloudmind-chat-background', chatBackground);
  }, [chatBackground]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, chatBackground, setChatBackground }}>
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
