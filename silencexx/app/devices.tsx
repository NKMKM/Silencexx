import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/theme';

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
  const isDark = true; // Force dark theme

  const handleLogoutAll = () => {
    // Здесь в будущем можно вызвать API для завершения всех сессий
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Theme.accent.gradient}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 50 : 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Theme.accent.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: Theme.text.primary }]}>Устройства</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Text style={[styles.description, { color: Theme.text.secondary }]}>
          Здесь отображаются устройства, на которых выполнен вход в ваш аккаунт.
        </Text>

        {mockDevices.map((device) => (
          <View key={device.id} style={[styles.deviceCard, { backgroundColor: Theme.background.card, borderColor: Theme.background.tertiary }]}>
            <View style={styles.deviceIconContainer}>
              <LinearGradient
                colors={['#A855F7', '#C084FC']}
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
              <Text style={[styles.deviceName, { color: Theme.text.primary }]}>{device.name}</Text>
              <Text style={[styles.deviceType, { color: Theme.text.secondary }]}>{device.type}</Text>
              <Text style={[styles.deviceLastActive, { color: Theme.text.tertiary }]}>Активность: {device.lastActive}</Text>
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
          <TouchableOpacity style={[styles.logoutAllButton, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]} onPress={handleLogoutAll}>
            <Ionicons name="log-out" size={18} color="#fca5a5" />
            <Text style={[styles.logoutAllText, { color: '#fca5a5' }]}>Завершить все сессии и выйти</Text>
          </TouchableOpacity>
          <Text style={[styles.footerHint, { color: Theme.text.tertiary }]}>
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
