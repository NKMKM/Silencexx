import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Theme } from '@/constants/theme';

/**
 * ZENITH Splash Screen
 * Минималистичный, тёмный, с акцентом на типографику
 */
export default function SplashScreen() {
  const router = useRouter();
  
  // Animation values - subtle, purposeful motion
  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const lineWidth = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    // Sequence: Logo appears → Line extends → Text fades in
    
    // 1. Logo fade in with scale
    logoOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    logoScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    
    // 2. Accent line extends
    lineWidth.value = withDelay(400, withTiming(48, { duration: 500, easing: Easing.out(Easing.cubic) }));
    
    // 3. Text appears
    textOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
    textTranslateY.value = withDelay(600, withSpring(0, { damping: 20, stiffness: 150 }));
    
    // 4. Subtle pulse on logo
    pulseScale.value = withDelay(1200, 
      withTiming(1.03, { duration: 1500, easing: Easing.inOut(Easing.ease) })
    );

    // Navigate to login after 3 seconds (faster for better UX)
    const timer = setTimeout(() => {
      router.replace('/login');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value * pulseScale.value },
    ],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    width: lineWidth.value,
    opacity: interpolate(lineWidth.value, [0, 48], [0, 1]),
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Main content - centered */}
      <View style={styles.content}>
        {/* Logo mark - geometric, minimal */}
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <View style={styles.logoMark}>
            <View style={styles.logoInner}>
              <Text style={styles.logoIcon}>✦</Text>
            </View>
          </View>
        </Animated.View>
        
        {/* Accent line */}
        <Animated.View style={[styles.accentLine, lineStyle]} />
        
        {/* App name and tagline */}
        <Animated.View style={[styles.textContainer, textStyle]}>
          <Text style={styles.appName}>Zenith</Text>
          <Text style={styles.tagline}>Твой спокойный разум</Text>
        </Animated.View>
      </View>
      
      {/* Bottom indicator */}
      <View style={styles.bottomIndicator}>
        <View style={styles.loadingDot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.background.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.gutter,
  },
  
  // Logo
  logoContainer: {
    marginBottom: Theme.spacing.xxl,
  },
  logoMark: {
    width: 96,
    height: 96,
    borderRadius: Theme.radius.xxl,
    backgroundColor: Theme.background.elevated,
    borderWidth: 1,
    borderColor: Theme.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  logoInner: {
    width: 64,
    height: 64,
    borderRadius: Theme.radius.xl,
    backgroundColor: Theme.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  logoIcon: {
    fontSize: 32,
    color: Theme.text.inverse,
  },
  
  // Accent line
  accentLine: {
    height: 3,
    backgroundColor: Theme.accent.primary,
    borderRadius: Theme.radius.full,
    marginBottom: Theme.spacing.xl,
  },
  
  // Text
  textContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: Theme.typography.size.hero,
    fontWeight: Theme.typography.weight.bold,
    color: Theme.text.primary,
    letterSpacing: Theme.typography.tracking.tight,
    marginBottom: Theme.spacing.sm,
  },
  tagline: {
    fontSize: Theme.typography.size.md,
    fontWeight: Theme.typography.weight.regular,
    color: Theme.text.tertiary,
    letterSpacing: Theme.typography.tracking.wide,
  },
  
  // Bottom
  bottomIndicator: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.accent.primary,
    opacity: 0.6,
  },
});
