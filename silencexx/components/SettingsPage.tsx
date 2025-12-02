import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { authApi } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/utils/ThemeContext';

interface UserProfile {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
}

interface Session {
  id: number;
  device_type: string;
  session_ip: string;
  created_at: string;
  last_active: string | null;
  is_current: boolean;
}

export default function SettingsPage() {
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const dynamicStyles = useMemo(() => ({
    containerBg: isDark
      ? Platform.OS === 'ios'
        ? '#1a1f2e'
        : '#111827'
      : Platform.OS === 'ios'
      ? '#F9FAFB'
      : '#FAFBFC',
    cardBg: isDark
      ? Platform.OS === 'ios'
        ? 'rgba(30, 41, 59, 0.5)'
        : '#1e293b'
      : Platform.OS === 'ios'
      ? '#FFF'
      : '#f8fafc',
    cardBorder: isDark ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
    primaryText: isDark ? '#f1f5f9' : '#111827',
    secondaryText: isDark ? '#94a3b8' : '#6B7280',
    tertiaryText: isDark ? '#64748b' : '#9CA3AF',
    lightBg: isDark
      ? Platform.OS === 'ios'
        ? 'rgba(99, 102, 241, 0.1)'
        : 'rgba(99, 102, 241, 0.15)'
      : Platform.OS === 'ios'
      ? '#F3F4F6'
      : '#F9FAFB',
    lightRedBg: isDark
      ? Platform.OS === 'ios'
        ? 'rgba(239, 68, 68, 0.15)'
        : 'rgba(239, 68, 68, 0.2)'
      : Platform.OS === 'ios'
      ? '#FEE2E2'
      : '#FEF2F2',
  }), [isDark]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('📊 [SettingsPage] Начало загрузки данных...');
      
      const [profileData, sessionsData] = await Promise.all([
        authApi.getProfile(),
        authApi.getSessions(),
      ]);

      console.log('📊 [SettingsPage] Profile data:', profileData);
      console.log('📊 [SettingsPage] Sessions data:', sessionsData);

      if (profileData.success) {
        setProfile(profileData.user);
        console.log('✅ [SettingsPage] Профиль установлен');
      }

      if (sessionsData.success) {
        console.log('📊 [SettingsPage] Sessions array:', sessionsData.sessions);
        console.log('📊 [SettingsPage] Sessions count:', sessionsData.sessions?.length || 0);
        setSessions(sessionsData.sessions);
        console.log('✅ [SettingsPage] Сессии установлены');
      }
    } catch (error) {
      console.error('❌ [SettingsPage] Error loading settings data:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные профиля');
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('🏁 [SettingsPage] Загрузка завершена');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDeleteSession = async (sessionId: number, isCurrent: boolean) => {
    if (isCurrent) {
      Alert.alert(
        'Выход',
        'Вы уверены, что хотите выйти из системы?',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Выйти',
            style: 'destructive',
            onPress: async () => {
              try {
                await authApi.logout();
                router.replace('/login');
              } catch (error) {
                console.error('Logout error:', error);
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Удалить сессию',
        'Завершить сессию на этом устройстве?',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Удалить',
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await authApi.deleteSession(sessionId);
                if (result.success) {
                  setSessions(sessions.filter(s => s.id !== sessionId));
                  Alert.alert('Успешно', 'Сессия удалена');
                }
              } catch (error) {
                console.error('Delete session error:', error);
                Alert.alert('Ошибка', 'Не удалось удалить сессию');
              }
            },
          },
        ]
      );
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти из системы?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            try {
              await authApi.logout();
              router.replace('/login');
            } catch (error) {
              console.error('Logout error:', error);
              router.replace('/login');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Неизвестно';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    return formatDate(dateString);
  };

  const getDeviceIcon = (deviceType: string) => {
    const type = deviceType.toLowerCase();
    if (type.includes('ios') || type.includes('iphone')) return 'phone-portrait-outline';
    if (type.includes('android')) return 'phone-portrait-outline';
    if (type.includes('tablet') || type.includes('ipad')) return 'tablet-portrait-outline';
    if (type.includes('web') || type.includes('browser')) return 'desktop-outline';
    return 'hardware-chip-outline';
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: dynamicStyles.containerBg }]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={[styles.loadingText, { color: dynamicStyles.secondaryText }]}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: dynamicStyles.containerBg }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="person-circle-outline" size={24} color="#8B5CF6" />
          <Text style={[styles.sectionTitle, { color: dynamicStyles.primaryText }]}>Профиль</Text>
        </View>

        <View style={[styles.card, { backgroundColor: dynamicStyles.cardBg, borderColor: dynamicStyles.cardBorder }]}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {profile?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color={dynamicStyles.secondaryText} />
              <Text style={[styles.infoLabel, { color: dynamicStyles.secondaryText }]}>Имя:</Text>
              <Text style={[styles.infoValue, { color: dynamicStyles.primaryText }]}>{profile?.name || 'Не указано'}</Text>
            </View>

            {profile?.email && (
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={20} color={dynamicStyles.secondaryText} />
                <Text style={[styles.infoLabel, { color: dynamicStyles.secondaryText }]}>Email:</Text>
                <Text style={[styles.infoValue, { color: dynamicStyles.primaryText }]}>{profile.email}</Text>
              </View>
            )}

            {profile?.phone && (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={20} color={dynamicStyles.secondaryText} />
                <Text style={[styles.infoLabel, { color: dynamicStyles.secondaryText }]}>Телефон:</Text>
                <Text style={[styles.infoValue, { color: dynamicStyles.primaryText }]}>{profile.phone}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color={dynamicStyles.secondaryText} />
              <Text style={[styles.infoLabel, { color: dynamicStyles.secondaryText }]}>Регистрация:</Text>
              <Text style={[styles.infoValue, { color: dynamicStyles.primaryText }]}>
                {profile?.createdAt ? formatDate(profile.createdAt) : 'Не указано'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Sessions Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="phone-portrait-outline" size={24} color="#8B5CF6" />
          <Text style={[styles.sectionTitle, { color: dynamicStyles.primaryText }]}>Активные устройства</Text>
        </View>

        {(() => {
          console.log('🔍 [SettingsPage] Рендер секции сессий. Sessions.length:', sessions.length);
          console.log('🔍 [SettingsPage] Sessions:', sessions);
          return null;
        })()}

        {sessions.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: dynamicStyles.cardBg }]}>
            <Ionicons name="phone-portrait-outline" size={48} color={dynamicStyles.tertiaryText} />
            <Text style={[styles.emptyStateText, { color: dynamicStyles.tertiaryText }]}>Нет активных сессий</Text>
          </View>
        ) : (
          sessions.map((session) => (
            <View
              key={session.id}
              style={[
                styles.sessionCard,
                { backgroundColor: dynamicStyles.cardBg, borderColor: dynamicStyles.cardBorder },
                session.is_current && styles.currentSessionCard,
              ]}
            >
              <View style={styles.sessionHeader}>
                <View style={[styles.sessionIcon, { backgroundColor: dynamicStyles.lightBg }]}>
                  <Ionicons
                    name={getDeviceIcon(session.device_type)}
                    size={24}
                    color={session.is_current ? '#8B5CF6' : dynamicStyles.secondaryText}
                  />
                </View>
                <View style={styles.sessionInfo}>
                  <Text style={[styles.sessionDevice, { color: dynamicStyles.primaryText }]}>
                    {session.device_type}
                    {session.is_current && (
                      <Text style={styles.currentBadge}> (Текущее)</Text>
                    )}
                  </Text>
                  <Text style={[styles.sessionMeta, { color: dynamicStyles.secondaryText }]}>
                    IP: {session.session_ip}
                  </Text>
                  <Text style={[styles.sessionMeta, { color: dynamicStyles.secondaryText }]}>
                    Создано: {formatDate(session.created_at)}
                  </Text>
                  {session.last_active && (
                    <Text style={[styles.sessionMeta, { color: dynamicStyles.secondaryText }]}>
                      Активность: {getTimeAgo(session.last_active)}
                    </Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  { backgroundColor: dynamicStyles.lightBg },
                  session.is_current && [styles.logoutButton, { backgroundColor: dynamicStyles.lightRedBg }],
                ]}
                onPress={() => handleDeleteSession(session.id, session.is_current)}
              >
                <Ionicons
                  name={session.is_current ? 'log-out-outline' : 'trash-outline'}
                  size={20}
                  color={session.is_current ? '#EF4444' : dynamicStyles.secondaryText}
                />
                <Text
                  style={[
                    styles.deleteButtonText,
                    { color: dynamicStyles.secondaryText },
                    session.is_current && styles.logoutButtonText,
                  ]}
                >
                  {session.is_current ? 'Выйти' : 'Удалить'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Actions Section */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutMainButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FFF" />
          <Text style={styles.logoutMainButtonText}>Выйти из системы</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0,
    shadowRadius: 8,
    elevation: Platform.OS === 'ios' ? 3 : 0,
    borderWidth: 1,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  profileAvatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
  },
  profileInfo: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 100,
  },
  infoValue: {
    fontSize: 14,
    flex: 1,
  },
  sessionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: Platform.OS === 'ios' ? 0.05 : 0,
    shadowRadius: 4,
    elevation: Platform.OS === 'ios' ? 2 : 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  currentSessionCard: {
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  sessionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDevice: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  currentBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  sessionMeta: {
    fontSize: 13,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  logoutButton: {},
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButtonText: {
    color: '#EF4444',
  },
  emptyState: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: Platform.OS === 'ios' ? 0.05 : 0,
    shadowRadius: 4,
    elevation: Platform.OS === 'ios' ? 2 : 0,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
  },
  logoutMainButton: {
    backgroundColor: '#EF4444',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutMainButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
