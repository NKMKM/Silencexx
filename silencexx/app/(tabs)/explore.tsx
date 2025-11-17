import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/utils/ThemeContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedGradient } from '@/components/AnimatedGradient';

export default function ExploreScreen() {
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';

  // Анимация появления
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const rotate = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    scale.value = withSpring(1, { damping: 15, stiffness: 100 });
    
    // Более плавная анимация для иконки
    rotate.value = withRepeat(
      withSequence(
        withTiming(8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  return (
    <View style={styles.container}>
      <AnimatedGradient
        lightColors={['#e0e7ff', '#ddd6fe', '#e9d5ff']}
        darkColors={['#0f172a', '#1e293b', '#334155']}
        isDark={isDark}
      />
      <Animated.View style={[styles.content, containerStyle]}>
        <Animated.View style={[styles.iconContainer, iconStyle]}>
          <Ionicons 
            name="compass" 
            size={80} 
            color={isDark ? '#a78bfa' : '#8b5cf6'} 
          />
        </Animated.View>
        <Text style={[styles.title, { color: isDark ? '#e2e8f0' : '#1e293b' }]}>
          Исследовать
        </Text>
        <Text style={[styles.subtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
          Скоро здесь появится что-то интересное ✨
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
});
