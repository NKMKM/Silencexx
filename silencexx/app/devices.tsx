import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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

  const handleLogoutAll = () => {
    // Здесь в будущем можно вызвать API для завершения всех сессий
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#EEF2FF', '#FAF5FF', '#FFF1F2']}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#9333EA" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Устройства</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.description}>
          Здесь отображаются устройства, на которых выполнен вход в ваш аккаунт.
        </Text>

        {mockDevices.map((device) => (
          <View key={device.id} style={styles.deviceCard}>
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
              <Text style={styles.deviceName}>{device.name}</Text>
              <Text style={styles.deviceType}>{device.type}</Text>
              <Text style={styles.deviceLastActive}>Активность: {device.lastActive}</Text>
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
          <TouchableOpacity style={styles.logoutAllButton} onPress={handleLogoutAll}>
            <Ionicons name="log-out" size={18} color="#F97373" />
            <Text style={styles.logoutAllText}>Завершить все сессии и выйти</Text>
          </TouchableOpacity>
          <Text style={styles.footerHint}>
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
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
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
    color: '#64748B',
    marginBottom: 16,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 0,
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
    color: '#0F172A',
    marginBottom: 2,
  },
  deviceType: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 2,
  },
  deviceLastActive: {
    fontSize: 12,
    color: '#9CA3AF',
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
    backgroundColor: 'rgba(248, 250, 252, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.4)',
    gap: 8,
  },
  logoutAllText: {
    fontSize: 15,
    color: '#DC2626',
    fontWeight: '600',
  },
  footerHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
});

export { DevicesPage };
