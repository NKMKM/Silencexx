import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/utils/ThemeContext';
import { useRouter } from 'expo-router';
import { authApi } from '@/services/api';
import { AnimatedGradient } from '@/components/AnimatedGradient';

interface Session {
  id: number;
  device_type: string;
  session_ip: string;
  created_at: string;
  last_active: string | null;
  is_current: boolean;
}

export default function SessionsScreen() {
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await authApi.getSessions();
      console.log('📊 [SessionsScreen] Response:', response);
      if (response.success) {
        console.log('📊 [SessionsScreen] Sessions:', response.sessions);
        response.sessions.forEach((s: Session, i: number) => {
          console.log(`📊 Session ${i}:`, {
            id: s.id,
            device: s.device_type,
            created: s.created_at,
            last_active: s.last_active,
            is_current: s.is_current,
          });
        });
        setSessions(response.sessions);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить список сессий');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSessions();
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
                router.replace('/login' as any);
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
                const response = await authApi.deleteSession(sessionId);
                if (response.success) {
                  await loadSessions();
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Неизвестно';
    
    // Парсим UTC время и конвертируем в локальное
    const date = new Date(dateString + (dateString.includes('Z') ? '' : 'Z'));
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    console.log(`⏰ Time ago calculation:`, {
      dateString,
      parsedDate: date.toISOString(),
      now: now.toISOString(),
      diffMs,
      diffMins,
      diffHours,
      diffDays,
    });

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
      <View style={styles.container}>
        <AnimatedGradient
          lightColors={['#e0e7ff', '#ddd6fe', '#e9d5ff']}
          darkColors={['#1a1a2e', '#16213e', '#0f3460', '#1a1a2e']}
          isDark={isDark}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#818cf8" />
          <Text style={[styles.loadingText, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
            Загрузка сессий...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AnimatedGradient
        lightColors={['#e0e7ff', '#ddd6fe', '#e9d5ff']}
        darkColors={['#1a1a2e', '#16213e', '#0f3460', '#1a1a2e']}
        isDark={isDark}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color={isDark ? '#f1f5f9' : '#0f172a'} 
            />
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
            Активные устройства
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={[styles.subtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
          Управление вашими активными сессиями
        </Text>

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="phone-portrait-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyStateText}>Нет активных сессий</Text>
          </View>
        ) : (
          <View style={styles.sessionsList}>
            {sessions.map((session) => (
              <View
                key={session.id}
                style={[
                  styles.sessionCard,
                  {
                    backgroundColor: session.is_current
                      ? (isDark ? 'rgba(99, 102, 241, 0.15)' : '#ede9fe')
                      : (isDark ? 'rgba(30, 41, 59, 0.6)' : '#ffffff'),
                    borderColor: session.is_current ? '#818cf8' : (isDark ? 'rgba(99, 102, 241, 0.3)' : '#e2e8f0'),
                    borderWidth: 1.5,
                  },
                ]}
              >
                <View style={styles.sessionHeader}>
                  <Ionicons
                    name={getDeviceIcon(session.device_type)}
                    size={36}
                    color={session.is_current ? '#818cf8' : (isDark ? '#94a3b8' : '#64748b')}
                  />
                  <View style={styles.sessionInfo}>
                    <Text
                      style={[
                        styles.sessionDevice,
                        { color: isDark ? '#f1f5f9' : '#0f172a' }
                      ]}
                    >
                      {session.device_type}
                      {session.is_current && (
                        <Text style={styles.currentBadge}> (Текущее)</Text>
                      )}
                    </Text>
                    <View style={styles.sessionDetails}>
                      <View style={styles.detailRow}>
                        <Ionicons name="globe-outline" size={14} color={isDark ? '#94a3b8' : '#64748b'} />
                        <Text style={[styles.detailText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                          {session.session_ip}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={14} color={isDark ? '#94a3b8' : '#64748b'} />
                        <Text style={[styles.detailText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                          {formatDate(session.created_at)}
                        </Text>
                      </View>
                      {session.last_active && (
                        <View style={styles.detailRow}>
                          <Ionicons name="time-outline" size={14} color={isDark ? '#94a3b8' : '#64748b'} />
                          <Text style={[styles.detailText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                            {getTimeAgo(session.last_active)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.deleteButton,
                    {
                      backgroundColor: session.is_current
                        ? (isDark ? '#7c2d12' : '#fee2e2')
                        : (isDark ? '#0f172a' : '#f1f5f9'),
                    },
                  ]}
                  onPress={() => handleDeleteSession(session.id, session.is_current)}
                >
                  <Ionicons
                    name={session.is_current ? 'log-out-outline' : 'trash-outline'}
                    size={20}
                    color={session.is_current ? '#ef4444' : (isDark ? '#94a3b8' : '#64748b')}
                  />
                  <Text
                    style={[
                      styles.deleteButtonText,
                      {
                        color: session.is_current ? '#ef4444' : (isDark ? '#94a3b8' : '#64748b'),
                      },
                    ]}
                  >
                    {session.is_current ? 'Выйти' : 'Удалить'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9CA3AF',
  },
  sessionsList: {
    gap: 16,
  },
  sessionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sessionInfo: {
    flex: 1,
    marginLeft: 16,
  },
  sessionDevice: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  currentBadge: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '500',
  },
  sessionDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
