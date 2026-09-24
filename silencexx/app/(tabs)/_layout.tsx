import { Tabs } from 'expo-router';
import React, { memo, useEffect, useRef, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Platform, 
  Animated as RNAnimated,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/theme';

/**
 * Стандартный полноширинный таб-бар
 */

const TabIcon = memo(({ 
  name, 
  outlineName, 
  focused,
  color,
}: { 
  name: keyof typeof Ionicons.glyphMap; 
  outlineName: keyof typeof Ionicons.glyphMap; 
  focused: boolean;
  color: string;
}) => {
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;
  
  useEffect(() => {
    RNAnimated.spring(scaleAnim, {
      toValue: focused ? 1.15 : 1,
      damping: 15,
      stiffness: 180,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <View style={styles.iconContainer}>
      <RNAnimated.View style={[styles.iconWrapper, { transform: [{ scale: scaleAnim }] }]}>
        <View style={[
          styles.iconBackground,
          focused && { backgroundColor: `${color}20` }
        ]}>
          <Ionicons
            name={focused ? name : outlineName}
            size={24}
            color={focused ? color : Theme.text.tertiary}
          />
        </View>
      </RNAnimated.View>
      {focused && (
        <View style={[styles.activeIndicator, { backgroundColor: color }]} />
      )}
    </View>
  );
});

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        lazy: true,
        tabBarStyle: {
          backgroundColor: Theme.background.primary,
          borderTopWidth: 1,
          borderTopColor: Theme.border.primary,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          display: isKeyboardVisible ? 'none' : 'flex',
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
            },
            android: {
              elevation: 10,
            },
          }),
        },
        tabBarActiveTintColor: Theme.accent.primary,
        tabBarInactiveTintColor: Theme.text.tertiary,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarHideOnKeyboard: true,
      }}>
      
      {/* Чат с ИИ */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Чат',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="chatbubble"
              outlineName="chatbubble-outline"
              focused={focused}
              color={Theme.accent.primary}
            />
          ),
        }}
      />
      
      {/* Задания */}
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Задания',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="sparkles"
              outlineName="sparkles-outline"
              focused={focused}
              color="#10B981"
            />
          ),
        }}
      />
      
      {/* Календарь */}
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Календарь',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="calendar"
              outlineName="calendar-outline"
              focused={focused}
              color="#8B5CF6"
            />
          ),
        }}
      />
      
      {/* Inbox */}
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="mail"
              outlineName="mail-outline"
              focused={focused}
              color="#06B6D4"
            />
          ),
        }}
      />
      
      {/* Профиль */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Профиль',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="person"
              outlineName="person-outline"
              focused={focused}
              color="#EC4899"
            />
          ),
        }}
      />
      
      {/* Hidden explore tab */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
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
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBackground: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
});
