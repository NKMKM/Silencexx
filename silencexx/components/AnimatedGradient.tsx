import React, { useEffect, useMemo } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
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
  // Используем opacity для плавного перехода между двумя градиентами
  const opacity = useSharedValue(isDark ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(isDark ? 1 : 0, {
      duration: 300,
    });
  }, [isDark, opacity]);

  const darkGradientStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const finalStyle = useMemo(() => style || StyleSheet.absoluteFill, [style]);

  return (
    <>
      {/* Светлый градиент (фон) */}
      <LinearGradient
        colors={lightColors}
        style={finalStyle}
      />
      {/* Темный градиент (поверх с анимированной opacity) */}
      <Animated.View style={[StyleSheet.absoluteFill, darkGradientStyle, { backgroundColor: isDark ? '#1a1a2e' : '#e0e7ff' }]}>
        <LinearGradient
          colors={darkColors}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {/* Контент */}
      {children}
    </>
  );
});
