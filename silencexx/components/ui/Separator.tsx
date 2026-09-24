import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Theme } from '@/constants/theme';

export interface SeparatorProps {
  style?: ViewStyle;
  orientation?: 'horizontal' | 'vertical';
}

export function Separator({ style, orientation = 'horizontal' }: SeparatorProps) {
  const baseStyle: ViewStyle = {
    backgroundColor: Theme.border.primary,
  };

  const orientationStyle: ViewStyle =
    orientation === 'horizontal'
      ? { height: 1, width: '100%' }
      : { width: 1, height: '100%' };

  return <View style={[baseStyle, orientationStyle, style]} />;
}
