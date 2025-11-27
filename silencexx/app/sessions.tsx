import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { AnimatedGradient } from '../components/AnimatedGradient';
import { authApi } from '@/services/api';

interface Session {
  id: number;
  device_type: string;
  session_ip: string;
  created_at: string;
  last_active: string | null;
  is_current: boolean;
}

export default function SessionsScreen() {
  const router = useRouter();
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  const insets = useSafeAreaInsets();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load sessions
  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await authApi.getSessions();
      if (response.success) setSessions(response.sessions);
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить список сессий');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  // Time formatting
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

    const date = new Date(dateString.includes('Z') ? dateString : dateString + 'Z');
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

  // Device icon
  const getDeviceIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('iphone') || t.includes('ios') || t.includes('android'))
      return 'phone-portrait';
    if (t.includes('ipad') || t.includes('tablet')) return 'tablet-portrait';
    if (t.includes('browser') || t.includes('web')) return 'desktop';
    return 'hardware-chip';
  };

  // Terminate / Logout
  const handleTerminateSession = (sessionId: number, isCurrent: boolean) => {
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
              } catch {}
            },
          },
        ]
      );
      return;
    }

    Alert.alert(
      'Завершить сеанс?',
      'Устройство будет отключено',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              const r = await authApi.deleteSession(sessionId);
              if (r.success) loadSessions();
            } catch {
              Alert.alert('Ошибка', 'Не удалось удалить сессию');
            }
          },
        },
      ]
    );
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
          <Text
            style={[styles.loadingText, { color: isDark ? '#f1f5f9' : '#0f172a' }]}
          >
            Загрузка сессий...
          </Text>
        </View>
      </View>
    );
  }

  const current = sessions.filter((s) => s.is_current);
  const others = sessions.filter((s) => !s.is_current);

  return (
    <View style={styles.container}>
      <AnimatedGradient
        lightColors={['#e0e7ff', '#ddd6fe', '#e9d5ff']}
        darkColors={['#1a1a2e', '#16213e', '#0f3460', '#1a1a2e']}
        isDark={isDark}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={isDark ? '#818cf8' : '#6366f1'} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <View
            style={[
              styles.headerIconContainer,
              {
                backgroundColor: isDark
                  ? 'rgba(99, 102, 241, 0.2)'
                  : 'rgba(99, 102, 241, 0.15)',
              },
            ]}
          >
            <Ionicons name="hardware-chip" size={24} color={isDark ? '#818cf8' : '#6366f1'} />
          </View>

          <View>
            <Text
              style={[styles.headerTitle, { color: isDark ? '#f1f5f9' : '#0f172a' }]}
            >
              Активные устройства
            </Text>

            <Text
              style={[styles.headerSubtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}
            >
              {sessions.length} {sessions.length === 1 ? 'устройство' : 'устройства'}
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >

        {/* CURRENT SESSION */}
        {current.map((session) => (
          <Animated.View key={session.id} entering={FadeInDown.duration(300)}>
            <View
              style={[
                styles.currentSessionCard,
                {
                  backgroundColor: isDark
                    ? 'rgba(99, 102, 241, 0.15)'
                    : 'rgba(99, 102, 241, 0.1)',
                  borderColor: isDark
                    ? 'rgba(99, 102, 241, 0.4)'
                    : 'rgba(99, 102, 241, 0.3)',
                },
              ]}
            >
              <View style={styles.sessionHeader}>
                <View
                  style={[
                    styles.deviceIconContainer,
                    {
                      backgroundColor: isDark
                        ? 'rgba(99, 102, 241, 0.25)'
                        : 'rgba(99, 102, 241, 0.15)',
                    },
                  ]}
                >
                  <Ionicons
                    name={getDeviceIcon(session.device_type)}
                    size={28}
                    color={isDark ? '#818cf8' : '#6366f1'}
                  />
                </View>

                <View style={styles.sessionInfo}>

                  {/* NAME + CURRENT BELOW */}
                  <View style={{ gap: 6 }}>
                    <Text
                      style={[
                        styles.deviceName,
                        { color: isDark ? '#f1f5f9' : '#0f172a' },
                      ]}
                    >
                      {session.device_type}
                    </Text>

                    <View
                      style={[
                        styles.currentBadge,
                        {
                          alignSelf: 'flex-start',
                          backgroundColor: isDark
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(16, 185, 129, 0.1)',
                        },
                      ]}
                    >
                      <View style={styles.currentDot} />
                      <Text style={[styles.currentText, { color: '#10b981' }]}>
                        Текущая
                      </Text>
                    </View>
                  </View>

                  <View style={styles.sessionDetails}>
                    <Ionicons
                      name="globe-outline"
                      size={14}
                      color={isDark ? '#94a3b8' : '#64748b'}
                    />
                    <Text
                      style={[styles.location, { color: isDark ? '#94a3b8' : '#64748b' }]}
                    >
                      {session.session_ip}
                    </Text>
                  </View>

                  <View style={styles.sessionDetails}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={isDark ? '#94a3b8' : '#64748b'}
                    />
                    <Text
                      style={[styles.lastActive, { color: isDark ? '#94a3b8' : '#64748b' }]}
                    >
                      {session.last_active ? getTimeAgo(session.last_active) : '—'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* exit current */}
              <TouchableOpacity
                style={[
                  styles.terminateAllButton,
                  {
                    backgroundColor: isDark
                      ? 'rgba(239, 68, 68, 0.1)'
                      : 'rgba(239, 68, 68, 0.08)',
                    borderColor: isDark
                      ? 'rgba(239, 68, 68, 0.3)'
                      : 'rgba(239, 68, 68, 0.2)',
                  },
                ]}
                onPress={() => handleTerminateSession(session.id, true)}
              >
                <Ionicons name="power" size={20} color="#ef4444" />
                <Text style={[styles.terminateAllText, { color: '#ef4444' }]}>
                  Выйти из этого устройства
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ))}

        {/* OTHER SESSIONS */}
        {others.length > 0 && (
          <>
            <Animated.View entering={FadeInDown.duration(300).delay(60)}>
              <Text
                style={[styles.sectionTitle, { color: isDark ? '#cbd5e1' : '#475569' }]}
              >
                Другие устройства
              </Text>
            </Animated.View>

            {others.map((session, index) => (
              <Animated.View
                key={session.id}
                entering={FadeInDown.duration(300).delay(120 + index * 60)}
              >
                <View
                  style={[
                    styles.sessionCard,
                    {
                      backgroundColor: isDark
                        ? 'rgba(30, 41, 59, 0.6)'
                        : 'rgba(255, 255, 255, 0.9)',
                      borderColor: isDark
                        ? 'rgba(99, 102, 241, 0.2)'
                        : 'rgba(226, 232, 240, 0.5)',
                    },
                  ]}
                >
                  <View style={styles.sessionHeader}>
                    <View
                      style={[
                        styles.deviceIconContainer,
                        {
                          backgroundColor: isDark
                            ? 'rgba(99, 102, 241, 0.1)'
                            : 'rgba(99, 102, 241, 0.08)',
                        },
                      ]}
                    >
                      <Ionicons
                        name={getDeviceIcon(session.device_type)}
                        size={24}
                        color={isDark ? '#818cf8' : '#6366f1'}
                      />
                    </View>

                    <View style={styles.sessionInfo}>
                      <Text
                        style={[
                          styles.deviceName,
                          { color: isDark ? '#f1f5f9' : '#0f172a' },
                        ]}
                      >
                        {session.device_type}
                      </Text>

                      <View style={styles.sessionDetails}>
                        <Ionicons
                          name="globe-outline"
                          size={14}
                          color={isDark ? '#94a3b8' : '#64748b'}
                        />
                        <Text
                          style={[
                            styles.location,
                            { color: isDark ? '#94a3b8' : '#64748b' },
                          ]}
                        >
                          {session.session_ip}
                        </Text>
                      </View>

                      <View style={styles.sessionDetails}>
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color={isDark ? '#94a3b8' : '#64748b'}
                        />
                        <Text
                          style={[
                            styles.lastActive,
                            { color: isDark ? '#94a3b8' : '#64748b' },
                          ]}
                        >
                          {session.last_active ? getTimeAgo(session.last_active) : '—'}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.terminateButton,
                        {
                          backgroundColor: isDark
                            ? 'rgba(239, 68, 68, 0.1)'
                            : 'rgba(239, 68, 68, 0.08)',
                        },
                      ]}
                      onPress={() => handleTerminateSession(session.id, false)}
                    >
                      <Ionicons name="close-circle" size={22} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            ))}
          </>
        )}

        {/* EMPTY */}
        {others.length === 0 && (
          <Animated.View entering={FadeInDown.duration(350)} style={styles.emptyState}>
            <View
              style={[
                styles.emptyIconContainer,
                {
                  backgroundColor: isDark
                    ? 'rgba(99, 102, 241, 0.1)'
                    : 'rgba(99, 102, 241, 0.08)',
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark"
                size={48}
                color={isDark ? '#818cf8' : '#6366f1'}
              />
            </View>

            <Text
              style={[styles.emptyTitle, { color: isDark ? '#f1f5f9' : '#0f172a' }]}
            >
              Нет других сеансов
            </Text>

            <Text
              style={[
                styles.emptySubtitle,
                { color: isDark ? '#94a3b8' : '#64748b' },
              ]}
            >
              Вы вошли только на этом устройстве
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16 },

  header: { paddingHorizontal: 20, paddingBottom: 20 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: { fontSize: 14, fontWeight: '500' },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, gap: 16 },

  currentSessionCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 2,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },

  sessionCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },

  sessionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },

  deviceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sessionInfo: { flex: 1, gap: 10 },

  deviceName: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },

  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  currentText: { fontSize: 12, fontWeight: '700' },

  sessionDetails: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  location: { fontSize: 14, fontWeight: '600' },
  lastActive: { fontSize: 13, fontWeight: '500' },

  terminateButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
  },

  terminateAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    marginTop: 12,
  },
  terminateAllText: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },

  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },

  emptySubtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
});
