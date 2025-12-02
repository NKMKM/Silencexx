import React, { useMemo } from 'react';
import { StyleSheet, ViewStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AnimatedGradientProps {
  lightColors: readonly [string, string, ...string[]];
  darkColors: readonly [string, string, ...string[]];
  isDark: boolean;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export const AnimatedGradient = React.memo(({
  lightColors,
  darkColors,
  isDark,
  style,
  children,
}: AnimatedGradientProps) => {
  const finalStyle = useMemo(() => style || StyleSheet.absoluteFill, [style]);
  
  // Используем градиент на обеих платформах
  const colors = isDark ? darkColors : lightColors;

  return (
    <LinearGradient
      colors={[...colors]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      pointerEvents="none"
      style={finalStyle}
    >
      {children}
    </LinearGradient>
  );
});
