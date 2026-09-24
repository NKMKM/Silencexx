import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '@/constants/theme';

export default function ExploreScreen() {
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
      <LinearGradient
        colors={[Theme.background.primary, Theme.background.secondary]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.content, containerStyle]}>
        <Animated.View style={[styles.iconContainer, iconStyle]}>
          <View style={styles.iconGlow}>
            <Ionicons 
              name="compass" 
              size={80} 
              color={Theme.accent.primary} 
            />
          </View>
        </Animated.View>
        <Text style={[styles.title, { color: Theme.text.primary }]}>
          Исследовать
        </Text>
        <Text style={[styles.subtitle, { color: Theme.text.secondary }]}>
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
  iconGlow: {
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
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
