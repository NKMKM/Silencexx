import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '@/utils/ThemeContext';

export interface LabelProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export function Label({ children, style }: LabelProps) {
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';

  const baseStyle: TextStyle = {
    fontSize: 14,
    fontWeight: '500',
    color: isDark ? '#f3f4f6' : '#0f172a',
    marginBottom: 4,
  };

  return <Text style={[baseStyle, style]}>{children}</Text>;
}
