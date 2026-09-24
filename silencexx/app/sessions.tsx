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
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '@/constants/theme';
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
  const isDark = true; // Force dark theme
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
        <LinearGradient
          colors={[Theme.background.primary, Theme.background.secondary]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Theme.accent.primary} />
          <Text
            style={[styles.loadingText, { color: Theme.text.primary }]}
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
      <LinearGradient
        colors={[Theme.background.primary, Theme.background.secondary]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={Theme.accent.primary} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <View
            style={[
              styles.headerIconContainer,
              {
                backgroundColor: 'rgba(255, 107, 0, 0.15)',
              },
            ]}
          >
            <Ionicons name="hardware-chip" size={24} color={Theme.accent.primary} />
          </View>

          <View>
            <Text
              style={[styles.headerTitle, { color: Theme.text.primary }]}
            >
              Активные устройства
            </Text>

            <Text
              style={[styles.headerSubtitle, { color: Theme.text.secondary }]}
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
                  backgroundColor: 'rgba(255, 107, 0, 0.1)',
                  borderColor: 'rgba(255, 107, 0, 0.3)',
                },
              ]}
            >
              <View style={styles.sessionHeader}>
                <View
                  style={[
                    styles.deviceIconContainer,
                    {
                      backgroundColor: 'rgba(255, 107, 0, 0.2)',
                    },
                  ]}
                >
                  <Ionicons
                    name={getDeviceIcon(session.device_type)}
                    size={28}
                    color={Theme.accent.primary}
                  />
                </View>

                <View style={styles.sessionInfo}>

                  {/* NAME + CURRENT BELOW */}
                  <View style={{ gap: 6 }}>
                    <Text
                      style={[
                        styles.deviceName,
                        { color: Theme.text.primary },
                      ]}
                    >
                      {session.device_type}
                    </Text>

                    <View
                      style={[
                        styles.currentBadge,
                        {
                          alignSelf: 'flex-start',
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
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
                      color={Theme.text.secondary}
                    />
                    <Text
                      style={[styles.location, { color: Theme.text.secondary }]}
                    >
                      {session.session_ip}
                    </Text>
                  </View>

                  <View style={styles.sessionDetails}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={Theme.text.secondary}
                    />
                    <Text
                      style={[styles.lastActive, { color: Theme.text.secondary }]}
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
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
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
                style={[styles.sectionTitle, { color: Theme.text.secondary }]}
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
                      backgroundColor: Theme.background.card,
                      borderColor: Theme.background.tertiary,
                    },
                  ]}
                >
                  <View style={styles.sessionHeader}>
                    <View
                      style={[
                        styles.deviceIconContainer,
                        {
                          backgroundColor: 'rgba(255, 107, 0, 0.1)',
                        },
                      ]}
                    >
                      <Ionicons
                        name={getDeviceIcon(session.device_type)}
                        size={24}
                        color={Theme.accent.primary}
                      />
                    </View>

                    <View style={styles.sessionInfo}>
                      <Text
                        style={[
                          styles.deviceName,
                          { color: Theme.text.primary },
                        ]}
                      >
                        {session.device_type}
                      </Text>

                      <View style={styles.sessionDetails}>
                        <Ionicons
                          name="globe-outline"
                          size={14}
                          color={Theme.text.secondary}
                        />
                        <Text
                          style={[
                            styles.location,
                            { color: Theme.text.secondary },
                          ]}
                        >
                          {session.session_ip}
                        </Text>
                      </View>

                      <View style={styles.sessionDetails}>
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color={Theme.text.secondary}
                        />
                        <Text
                          style={[
                            styles.lastActive,
                            { color: Theme.text.secondary },
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
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
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
                  backgroundColor: 'rgba(255, 107, 0, 0.1)',
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark"
                size={48}
                color={Theme.accent.primary}
              />
            </View>

            <Text
              style={[styles.emptyTitle, { color: Theme.text.primary }]}
            >
              Нет других сеансов
            </Text>

            <Text
              style={[
                styles.emptySubtitle,
                { color: Theme.text.secondary },
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
  container: { flex: 1, backgroundColor: Theme.background.primary },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 14, fontSize: 16, color: Theme.text.secondary },

  header: { paddingHorizontal: 22, paddingBottom: 24 },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: Theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    backgroundColor: Theme.background.elevated,
  },

  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  headerIconContainer: {
    width: 60,
    height: 60,
    borderRadius: Theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.background.elevated,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 5,
    color: Theme.text.primary,
  },
  headerSubtitle: { fontSize: 14, fontWeight: '500', color: Theme.text.secondary },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 22, gap: 18 },

  currentSessionCard: {
    padding: 22,
    borderRadius: Theme.radius.xl,
    borderWidth: 2,
    borderColor: Theme.accent.primary,
    backgroundColor: Theme.background.card,
    shadowColor: Theme.accent.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },

  sessionCard: {
    padding: 20,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.border.primary,
    backgroundColor: Theme.background.card,
    shadowColor: '#0A0A0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },

  sessionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 18 },

  deviceIconContainer: {
    width: 60,
    height: 60,
    borderRadius: Theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.background.elevated,
  },

  sessionInfo: { flex: 1, gap: 12 },

  deviceName: { fontSize: 19, fontWeight: '800', letterSpacing: -0.4, color: Theme.text.primary },

  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.status.successBg,
  },
  currentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Theme.status.success },
  currentText: { fontSize: 12, fontWeight: '700', color: Theme.status.success },

  sessionDetails: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  location: { fontSize: 14, fontWeight: '600', color: Theme.text.primary },
  lastActive: { fontSize: 13, fontWeight: '500', color: Theme.text.secondary },

  terminateButton: {
    width: 48,
    height: 48,
    borderRadius: Theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.status.errorBg,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 10,
    color: Theme.accent.primary,
  },

  terminateAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: Theme.radius.lg,
    borderWidth: 1.5,
    borderColor: Theme.status.error,
    marginTop: 14,
    backgroundColor: Theme.status.errorBg,
  },
  terminateAllText: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3, color: Theme.status.error },

  emptyState: { alignItems: 'center', paddingVertical: 70 },

  emptyIconContainer: {
    width: 104,
    height: 104,
    borderRadius: Theme.radius.xxl + 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: Theme.background.elevated,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 10,
    color: Theme.text.primary,
  },

  emptySubtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    color: Theme.text.secondary,
  },
});
