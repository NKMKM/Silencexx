import { Tabs } from 'expo-router';
import React, { useRef, useEffect, memo } from 'react';
import { Platform, Animated, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/utils/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Оптимизированный компонент анимированной иконки таба
const AnimatedTabIcon = memo(({ 
  name, 
  outlineName, 
  color, 
  focused 
}: { 
  name: any; 
  outlineName: any; 
  color: string; 
  focused: boolean;
}) => {
  const scaleAnim = useRef(new Animated.Value(focused ? 1.1 : 1)).current;
  const indicatorAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    // Упрощенная анимация для производительности
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1.1 : 1,
        friction: 4,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(indicatorAnim, {
        toValue: focused ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  return (
    <View style={styles.iconContainer}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Ionicons
          name={focused ? name : outlineName}
          size={24}
          color={color}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.indicator,
          { backgroundColor: color, opacity: indicatorAnim },
        ]}
      />
    </View>
  );
});

export default function TabLayout() {
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        lazy: true, // Ленивая загрузка для производительности
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderTopColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)',
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          position: 'absolute',
          elevation: 0,
          shadowColor: isDark ? '#a78bfa' : '#8b5cf6',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.2 : 0.1,
          shadowRadius: 12,
        },
        tabBarActiveTintColor: isDark ? '#a78bfa' : '#8b5cf6',
        tabBarInactiveTintColor: isDark ? '#64748b' : '#94a3b8',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Главная',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name="home"
              outlineName="home-outline"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Дневник',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name="calendar"
              outlineName="calendar-outline"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Настройки',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name="settings"
              outlineName="settings-outline"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null, // Скрываем из навигации
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
