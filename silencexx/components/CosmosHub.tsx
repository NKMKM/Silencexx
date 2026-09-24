/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COSMOS — Орбитальный центр навигации
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Пользователь в центре, функции вращаются вокруг как планеты
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import CosmicTheme, { C, G, O, GL, T, S, A } from '@/constants/theme.cosmic';
import { authApi } from '@/services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CENTER_X = SCREEN_WIDTH / 2;
const CENTER_Y = SCREEN_HEIGHT / 2 - 50;

// Планеты орбитальной навигации
const PLANETS = [
  { id: 'echo', label: 'Echo', icon: 'chatbubble', route: '/(tabs)', orbit: 'inner', angle: 270, color: C.starCore },
  { id: 'rhythm', label: 'Rhythm', icon: 'pulse', route: '/(tabs)/tasks', orbit: 'middle', angle: 315, color: C.energy },
  { id: 'mirror', label: 'Mirror', icon: 'water', route: '/(tabs)/calendar', orbit: 'middle', angle: 45, color: C.aurora },
  { id: 'signal', label: 'Signal', icon: 'radio', route: '/(tabs)/inbox', orbit: 'outer', angle: 0, color: C.nova },
  { id: 'void', label: 'Void', icon: 'person', route: '/(tabs)/settings', orbit: 'outer', angle: 180, color: C.twilight },
];

// Компонент планеты
interface PlanetProps {
  planet: typeof PLANETS[0];
  orbitRadius: number;
  rotationOffset: SharedValue<number>;
  onPress: () => void;
}

const Planet: React.FC<PlanetProps> = ({ planet, orbitRadius, rotationOffset, onPress }) => {
  const scale = useSharedValue(1);
  const planetSize = planet.orbit === 'inner' ? O.planet : planet.orbit === 'middle' ? O.moon : O.asteroid;
  
  const animatedStyle = useAnimatedStyle(() => {
    const angle = (planet.angle + rotationOffset.value) * (Math.PI / 180);
    const x = CENTER_X + orbitRadius * Math.cos(angle) - planetSize / 2;
    const y = CENTER_Y + orbitRadius * Math.sin(angle) - planetSize / 2;
    
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: scale.value },
      ],
      position: 'absolute',
      left: 0,
      top: 0,
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(1.15, A.spring.bouncy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, A.spring.gentle);
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
      >
        <LinearGradient
          colors={[planet.color, `${planet.color}88`]}
          style={[
            styles.planet,
            {
              width: planetSize,
              height: planetSize,
              borderRadius: planetSize / 2,
            },
          ]}
        >
          <Ionicons name={planet.icon as any} size={planetSize * 0.45} color={C.starlight} />
        </LinearGradient>
        <Text style={[styles.planetLabel, { width: planetSize + 20, marginLeft: -10 }]}>
          {planet.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

// Компонент орбитального кольца
const OrbitRing: React.FC<{ radius: number; opacity: number }> = ({ radius, opacity }) => (
  <View
    style={[
      styles.orbitRing,
      {
        width: radius * 2,
        height: radius * 2,
        borderRadius: radius,
        left: CENTER_X - radius,
        top: CENTER_Y - radius,
        opacity,
      },
    ]}
  />
);

export default function CosmosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [userName, setUserName] = useState('');
  const [userInitial, setUserInitial] = useState('?');
  
  // Анимации
  const rotationOffset = useSharedValue(0);
  const starPulse = useSharedValue(1);
  const starGlow = useSharedValue(0.3);
  
  // Загрузка данных пользователя
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await authApi.getCurrentUser();
        if (user?.name) {
          setUserName(user.name);
          setUserInitial(user.name.charAt(0).toUpperCase());
        }
      } catch (e) {
        console.log('User not loaded');
      }
    };
    loadUser();
  }, []);
  
  // Анимация пульсации звезды
  useEffect(() => {
    starPulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    
    starGlow.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);
  
  // Жест вращения орбиты
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Вращаем орбиту при свайпе
      rotationOffset.value += event.velocityX * 0.01;
    })
    .onEnd((event) => {
      // Инерция вращения
      rotationOffset.value = withTiming(
        rotationOffset.value + event.velocityX * 0.05,
        { duration: 500, easing: Easing.out(Easing.cubic) }
      );
    });
  
  // Долгое нажатие на звезду — SANCTUARY
  const [sanctuaryTimer, setSanctuaryTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  
  const handleStarPressIn = () => {
    const timer = setTimeout(() => {
      router.push('/panic');
    }, 800);
    setSanctuaryTimer(timer);
  };
  
  const handleStarPressOut = () => {
    if (sanctuaryTimer) {
      clearTimeout(sanctuaryTimer);
      setSanctuaryTimer(null);
    }
  };
  
  // Стиль анимированной звезды
  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: starPulse.value }],
    shadowOpacity: starGlow.value,
  }));
  
  const navigateTo = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={G.deepVoid as any}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Фоновые частицы */}
      <View style={styles.particlesContainer}>
        {[...Array(20)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.particle,
              {
                left: Math.random() * SCREEN_WIDTH,
                top: Math.random() * SCREEN_HEIGHT,
                opacity: Math.random() * 0.3 + 0.1,
                width: Math.random() * 3 + 1,
                height: Math.random() * 3 + 1,
              },
            ]}
          />
        ))}
      </View>
      
      {/* Заголовок */}
      <View style={[styles.header, { paddingTop: insets.top + S.md }]}>
        <Text style={styles.greeting}>
          {new Date().getHours() < 12 ? 'Доброе утро' : new Date().getHours() < 18 ? 'Добрый день' : 'Добрый вечер'}
        </Text>
        <Text style={styles.userName}>{userName || 'Путешественник'}</Text>
      </View>
      
      <GestureDetector gesture={panGesture}>
        <View style={styles.orbitContainer}>
          {/* Орбитальные кольца */}
          <OrbitRing radius={O.inner} opacity={0.15} />
          <OrbitRing radius={O.middle} opacity={0.1} />
          <OrbitRing radius={O.outer} opacity={0.05} />
          
          {/* Планеты */}
          {PLANETS.map((planet) => {
            const radius = planet.orbit === 'inner' ? O.inner : planet.orbit === 'middle' ? O.middle : O.outer;
            return (
              <Planet
                key={planet.id}
                planet={planet}
                orbitRadius={radius}
                rotationOffset={rotationOffset}
                onPress={() => navigateTo(planet.route)}
              />
            );
          })}
          
          {/* Центральная звезда (пользователь) */}
          <Pressable
            onPressIn={handleStarPressIn}
            onPressOut={handleStarPressOut}
            style={[
              styles.starContainer,
              {
                left: CENTER_X - O.star / 2,
                top: CENTER_Y - O.star / 2,
              },
            ]}
          >
            <Animated.View style={[styles.starGlow, starAnimatedStyle]}>
              <LinearGradient
                colors={G.starCore as any}
                style={styles.star}
              >
                <Text style={styles.starInitial}>{userInitial}</Text>
              </LinearGradient>
            </Animated.View>
          </Pressable>
        </View>
      </GestureDetector>
      
      {/* Подсказка */}
      <View style={[styles.hintContainer, { paddingBottom: insets.bottom + S.xl }]}>
        <Text style={styles.hintText}>Свайпай для вращения • Удерживай центр для помощи</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.void,
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: 'absolute',
    backgroundColor: C.starlight,
    borderRadius: 10,
  },
  header: {
    paddingHorizontal: S.lg,
    zIndex: 10,
  },
  greeting: {
    fontSize: T.size.asteroid,
    color: C.twilight,
    fontWeight: T.weight.medium,
    letterSpacing: T.tracking.wide,
  },
  userName: {
    fontSize: T.size.planet,
    color: C.starlight,
    fontWeight: T.weight.bold,
    letterSpacing: T.tracking.tight,
    marginTop: S.micro,
  },
  orbitContainer: {
    flex: 1,
    position: 'relative',
  },
  orbitRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: C.starCore,
    borderStyle: 'dashed',
  },
  planet: {
    alignItems: 'center',
    justifyContent: 'center',
    ...GL.soft,
  },
  planetLabel: {
    fontSize: T.size.dust,
    color: C.twilight,
    textAlign: 'center',
    marginTop: S.xs,
    fontWeight: T.weight.medium,
  },
  starContainer: {
    position: 'absolute',
    width: O.star,
    height: O.star,
  },
  starGlow: {
    width: O.star,
    height: O.star,
    borderRadius: O.star / 2,
    ...GL.pulse,
  },
  star: {
    width: O.star,
    height: O.star,
    borderRadius: O.star / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starInitial: {
    fontSize: T.size.star,
    color: C.starlight,
    fontWeight: T.weight.bold,
  },
  hintContainer: {
    alignItems: 'center',
    paddingHorizontal: S.lg,
  },
  hintText: {
    fontSize: T.size.dust,
    color: C.mist,
    textAlign: 'center',
  },
});
