import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@/utils/ThemeContext';

export interface SeparatorProps {
  style?: ViewStyle;
  orientation?: 'horizontal' | 'vertical';
}

export function Separator({ style, orientation = 'horizontal' }: SeparatorProps) {
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';

  const baseStyle: ViewStyle = {
    backgroundColor: isDark ? '#374151' : '#e5e7eb',
  };

  const orientationStyle: ViewStyle =
    orientation === 'horizontal'
      ? { height: 1, width: '100%' }
      : { width: 1, height: '100%' };

  return <View style={[baseStyle, orientationStyle, style]} />;
}
