import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/utils/ThemeContext';

const mockDevices = [
  {
    id: '1',
    name: 'iPhone 15 Pro',
    type: 'Мобильное устройство',
    current: true,
    lastActive: 'Сейчас',
  },
  {
    id: '2',
    name: 'MacBook Air',
    type: 'Ноутбук',
    current: false,
    lastActive: '2 дня назад',
  },
];

export default function DevicesPage() {
  const router = useRouter();
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';

  const handleLogoutAll = () => {
    // Здесь в будущем можно вызвать API для завершения всех сессий
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ['#0f172a', '#1e293b', '#334155'] : ['#e0e7ff', '#ddd6fe', '#e9d5ff']}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 50 : 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#a78bfa' : '#8b5cf6'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>Устройства</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Text style={[styles.description, { color: isDark ? '#cbd5e1' : '#64748b' }]}>
          Здесь отображаются устройства, на которых выполнен вход в ваш аккаунт.
        </Text>

        {mockDevices.map((device) => (
          <View key={device.id} style={[styles.deviceCard, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.5)', borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)' }]}>
            <View style={styles.deviceIconContainer}>
              <LinearGradient
                colors={['#60A5FA', '#A78BFA']}
                style={styles.deviceIcon}
              >
                <Ionicons
                  name={device.type === 'Мобильное устройство' ? 'phone-portrait' : 'laptop-outline'}
                  size={20}
                  color="#fff"
                />
              </LinearGradient>
            </View>
            <View style={styles.deviceInfo}>
              <Text style={[styles.deviceName, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>{device.name}</Text>
              <Text style={[styles.deviceType, { color: isDark ? '#94a3b8' : '#64748b' }]}>{device.type}</Text>
              <Text style={[styles.deviceLastActive, { color: isDark ? '#64748b' : '#9ca3af' }]}>Активность: {device.lastActive}</Text>
            </View>
            {device.current && (
              <View style={styles.currentBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                <Text style={styles.currentBadgeText}>Текущее</Text>
              </View>
            )}
          </View>
        ))}

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.logoutAllButton, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(248, 250, 252, 0.95)', borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(248, 113, 113, 0.4)' }]} onPress={handleLogoutAll}>
            <Ionicons name="log-out" size={18} color={isDark ? '#fca5a5' : '#dc2626'} />
            <Text style={[styles.logoutAllText, { color: isDark ? '#fca5a5' : '#dc2626' }]}>Завершить все сессии и выйти</Text>
          </TouchableOpacity>
          <Text style={[styles.footerHint, { color: isDark ? '#64748b' : '#94a3b8' }]}>
            При завершении всех сессий приложение выйдет из аккаунта на этом и других устройствах.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  deviceIconContainer: {
    marginRight: 12,
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  deviceType: {
    fontSize: 13,
    marginBottom: 2,
  },
  deviceLastActive: {
    fontSize: 12,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  currentBadgeText: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
  },
  logoutAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    gap: 8,
  },
  logoutAllText: {
    fontSize: 15,
    fontWeight: '600',
  },
  footerHint: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
  },
});

export { DevicesPage };
