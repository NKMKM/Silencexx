import React from 'react';
import { Text, TextStyle } from 'react-native';
import { Theme } from '@/constants/theme';

export interface LabelProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export function Label({ children, style }: LabelProps) {
  const baseStyle: TextStyle = {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.text.primary,
    marginBottom: 4,
  };

  return <Text style={[baseStyle, style]}>{children}</Text>;
}
