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
  Dimensions,
  Modal,
  TextInput,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { authApi, dailyTasksApi } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, FadeIn, ZoomIn } from 'react-native-reanimated';
import { Theme } from '@/constants/theme';
import * as ImagePicker from 'expo-image-picker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface UserProfile {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  avatar?: string;
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

interface Stats {
  streak: number;
  totalMessages: number;
  totalTasks: number;
  memberSince: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<Stats>({ streak: 0, totalMessages: 0, totalTasks: 0, memberSince: '' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit States
  const [showEditName, setShowEditName] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editName, setEditName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const dynamicStyles = useMemo(() => ({
    containerBg: Theme.background.primary,
    cardBg: Theme.background.card,
    cardBorder: Theme.border.primary,
    primaryText: Theme.text.primary,
    secondaryText: Theme.text.secondary,
    tertiaryText: Theme.text.tertiary,
    lightBg: 'rgba(255, 107, 0, 0.1)',
    lightRedBg: 'rgba(239, 68, 68, 0.15)',
  }), []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [profileData, sessionsData, streakData] = await Promise.all([
        authApi.getProfile(),
        authApi.getSessions(),
        dailyTasksApi.getStreak().catch(() => ({ streak: 0 })),
      ]);

      if (profileData.success) {
        setProfile(profileData.user);
        setAvatarUri(profileData.user.avatar || null);
        setStats(prev => ({
          ...prev,
          memberSince: profileData.user.createdAt,
        }));
      }

      if (sessionsData.success) {
        setSessions(sessionsData.sessions);
      }

      if (streakData) {
        setStats(prev => ({
          ...prev,
          streak: streakData.streak || 0,
        }));
      }
    } catch (error) {
      console.error('Error loading settings data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleUpdateName = async () => {
    if (!editName.trim()) {
      Alert.alert('Ошибка', 'Введите имя');
      return;
    }
    
    try {
      setSaving(true);
      const result = await authApi.updateProfile({ name: editName.trim() });
      if (result.success) {
        setProfile(prev => prev ? { ...prev, name: editName.trim() } : null);
        setShowEditName(false);
        setEditName('');
        Alert.alert('Успешно', 'Имя обновлено');
      } else {
        Alert.alert('Ошибка', result.error || 'Не удалось обновить имя');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось обновить имя');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Ошибка', 'Пароль должен быть минимум 8 символов');
      return;
    }
    
    try {
      setSaving(true);
      const result = await authApi.changePassword(currentPassword, newPassword);
      if (result.success) {
        setShowEditPassword(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        Alert.alert('Успешно', 'Пароль изменен');
      } else {
        Alert.alert('Ошибка', result.error || 'Не удалось изменить пароль');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось изменить пароль');
    } finally {
      setSaving(false);
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Ошибка', 'Нужен доступ к галерее');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      
      try {
        setSaving(true);
        const uploadResult = await authApi.uploadAvatar(uri);
        if (uploadResult.success) {
          Alert.alert('Успешно', 'Аватар обновлен');
        } else {
          Alert.alert('Ошибка', uploadResult.error || 'Не удалось загрузить аватар');
        }
      } catch (error) {
        Alert.alert('Ошибка', 'Не удалось загрузить аватар');
      } finally {
        setSaving(false);
      }
    }
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
                }
              } catch (error) {
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
      'Вы уверены, что хотите выйти?',
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
              router.replace('/login');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Неизвестно';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Сейчас';
    if (diffMins < 60) return `${diffMins} мин`;
    if (diffHours < 24) return `${diffHours} ч`;
    if (diffDays < 7) return `${diffDays} дн`;
    return formatDate(dateString);
  };

  const getDaysAsMember = () => {
    if (!profile?.createdAt) return 0;
    const date = new Date(profile.createdAt);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / 86400000);
  };

  const getDeviceIcon = (deviceType: string) => {
    const type = deviceType.toLowerCase();
    if (type.includes('ios') || type.includes('iphone')) return 'phone-portrait-outline';
    if (type.includes('android')) return 'phone-portrait-outline';
    return 'hardware-chip-outline';
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: dynamicStyles.containerBg }]}>
        <ActivityIndicator size="large" color={Theme.accent.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: dynamicStyles.containerBg }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.accent.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.profileHeader}>
          <LinearGradient
            colors={['rgba(255, 107, 0, 0.15)', 'rgba(255, 107, 0, 0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileHeaderGradient}
          >
            {/* Avatar with edit */}
            <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarContainer}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <LinearGradient colors={Theme.accent.gradient as any} style={styles.avatarGradient}>
                  <Text style={styles.avatarText}>
                    {profile?.name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </LinearGradient>
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={14} color="#FFF" />
              </View>
            </TouchableOpacity>
            
            {/* Name with edit */}
            <TouchableOpacity 
              onPress={() => { setEditName(profile?.name || ''); setShowEditName(true); }}
              style={styles.nameContainer}
            >
              <Text style={[styles.userName, { color: dynamicStyles.primaryText }]}>
                {profile?.name || 'Пользователь'}
              </Text>
              <Ionicons name="pencil" size={16} color={Theme.accent.primary} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
            
            {profile?.email && (
              <Text style={[styles.userEmail, { color: dynamicStyles.secondaryText }]}>
                {profile.email}
              </Text>
            )}
            
            <View style={styles.memberBadge}>
              <Ionicons name="shield-checkmark" size={14} color={Theme.accent.primary} />
              <Text style={styles.memberText}>{getDaysAsMember()} дней с нами</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeIn.delay(200)} style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: dynamicStyles.primaryText }]}>Статистика</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: dynamicStyles.cardBg, borderColor: dynamicStyles.cardBorder }]}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Ionicons name="flame" size={24} color="#EF4444" />
              </View>
              <Text style={[styles.statValue, { color: dynamicStyles.primaryText }]}>{stats.streak}</Text>
              <Text style={[styles.statLabel, { color: dynamicStyles.tertiaryText }]}>Стрик</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: dynamicStyles.cardBg, borderColor: dynamicStyles.cardBorder }]}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Ionicons name="calendar" size={24} color="#3B82F6" />
              </View>
              <Text style={[styles.statValue, { color: dynamicStyles.primaryText }]}>{getDaysAsMember()}</Text>
              <Text style={[styles.statLabel, { color: dynamicStyles.tertiaryText }]}>Дней</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: dynamicStyles.cardBg, borderColor: dynamicStyles.cardBorder }]}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              </View>
              <Text style={[styles.statValue, { color: dynamicStyles.primaryText }]}>{sessions.length}</Text>
              <Text style={[styles.statLabel, { color: dynamicStyles.tertiaryText }]}>Устройств</Text>
            </View>
          </View>
        </Animated.View>

        {/* Account Settings */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: dynamicStyles.primaryText }]}>Настройки аккаунта</Text>
          <View style={[styles.actionsCard, { backgroundColor: dynamicStyles.cardBg, borderColor: dynamicStyles.cardBorder }]}>
            {/* Edit Name */}
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => { setEditName(profile?.name || ''); setShowEditName(true); }}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Ionicons name="person" size={22} color="#3B82F6" />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: dynamicStyles.primaryText }]}>Изменить имя</Text>
                <Text style={[styles.actionSubtitle, { color: dynamicStyles.tertiaryText }]}>{profile?.name || 'Не указано'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={dynamicStyles.tertiaryText} />
            </TouchableOpacity>
            
            <View style={styles.actionDivider} />
            
            {/* Change Password */}
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => setShowEditPassword(true)}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                <Ionicons name="lock-closed" size={22} color="#8B5CF6" />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: dynamicStyles.primaryText }]}>Изменить пароль</Text>
                <Text style={[styles.actionSubtitle, { color: dynamicStyles.tertiaryText }]}>Безопасность аккаунта</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={dynamicStyles.tertiaryText} />
            </TouchableOpacity>
            
            <View style={styles.actionDivider} />
            
            {/* Change Avatar */}
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={handlePickAvatar}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(255, 107, 0, 0.1)' }]}>
                <Ionicons name="image" size={22} color={Theme.accent.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: dynamicStyles.primaryText }]}>Изменить аватар</Text>
                <Text style={[styles.actionSubtitle, { color: dynamicStyles.tertiaryText }]}>Выбрать из галереи</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={dynamicStyles.tertiaryText} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInUp.delay(400)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: dynamicStyles.primaryText }]}>Быстрые действия</Text>
          <View style={[styles.actionsCard, { backgroundColor: dynamicStyles.cardBg, borderColor: dynamicStyles.cardBorder }]}>
            <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/panic')}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Ionicons name="warning" size={22} color="#EF4444" />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: dynamicStyles.primaryText }]}>Экстренная помощь</Text>
                <Text style={[styles.actionSubtitle, { color: dynamicStyles.tertiaryText }]}>Режим поддержки</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={dynamicStyles.tertiaryText} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Sessions */}
        <Animated.View entering={FadeInUp.delay(500)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: dynamicStyles.primaryText }]}>Активные устройства</Text>
          {sessions.map((session, index) => (
            <Animated.View
              key={session.id}
              entering={FadeInUp.delay(550 + index * 50)}
              style={[
                styles.sessionCard,
                { backgroundColor: dynamicStyles.cardBg, borderColor: dynamicStyles.cardBorder },
                session.is_current && styles.currentSessionCard,
              ]}
            >
              <View style={styles.sessionHeader}>
                <View style={[styles.sessionIcon, { backgroundColor: session.is_current ? 'rgba(255, 107, 0, 0.15)' : dynamicStyles.lightBg }]}>
                  <Ionicons name={getDeviceIcon(session.device_type)} size={24} color={session.is_current ? Theme.accent.primary : dynamicStyles.secondaryText} />
                </View>
                <View style={styles.sessionInfo}>
                  <View style={styles.sessionDeviceRow}>
                    <Text style={[styles.sessionDevice, { color: dynamicStyles.primaryText }]}>{session.device_type}</Text>
                    {session.is_current && (
                      <View style={styles.currentBadgeContainer}>
                        <Text style={styles.currentBadge}>Текущее</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.sessionMeta, { color: dynamicStyles.secondaryText }]}>
                    {session.last_active ? getTimeAgo(session.last_active) : 'Активно сейчас'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.deleteButton, session.is_current && styles.logoutButton]}
                onPress={() => handleDeleteSession(session.id, session.is_current)}
              >
                <Ionicons name={session.is_current ? 'log-out-outline' : 'close-outline'} size={20} color={session.is_current ? '#EF4444' : dynamicStyles.tertiaryText} />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Account Info */}
        <Animated.View entering={FadeInUp.delay(600)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: dynamicStyles.primaryText }]}>Аккаунт</Text>
          <View style={[styles.infoCard, { backgroundColor: dynamicStyles.cardBg, borderColor: dynamicStyles.cardBorder }]}>
            {profile?.email && (
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={20} color={dynamicStyles.secondaryText} />
                <Text style={[styles.infoLabel, { color: dynamicStyles.secondaryText }]}>Email</Text>
                <Text style={[styles.infoValue, { color: dynamicStyles.primaryText }]}>{profile.email}</Text>
              </View>
            )}
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color={dynamicStyles.secondaryText} />
              <Text style={[styles.infoLabel, { color: dynamicStyles.secondaryText }]}>С нами с</Text>
              <Text style={[styles.infoValue, { color: dynamicStyles.primaryText }]}>
                {profile?.createdAt ? formatDate(profile.createdAt) : 'Не указано'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Logout */}
        <Animated.View entering={FadeInUp.delay(700)} style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutMainButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#FFF" />
            <Text style={styles.logoutMainButtonText}>Выйти из системы</Text>
          </TouchableOpacity>
          <Text style={[styles.versionText, { color: dynamicStyles.tertiaryText }]}>SilenceXX v1.0.0</Text>
        </Animated.View>
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal visible={showEditName} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.modalBackdropTouch} activeOpacity={1} onPress={() => setShowEditName(false)} />
          <View style={[styles.modalContent, { backgroundColor: Theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: Theme.text.primary }]}>Изменить имя</Text>
              <TouchableOpacity onPress={() => setShowEditName(false)}>
                <Ionicons name="close" size={24} color={Theme.text.secondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.modalInput, { color: Theme.text.primary, backgroundColor: Theme.background.secondary, borderColor: Theme.border.primary }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Введите имя"
              placeholderTextColor={Theme.text.tertiary}
              autoFocus
            />
            <TouchableOpacity style={styles.modalButton} onPress={handleUpdateName} disabled={saving}>
              <LinearGradient colors={Theme.accent.gradient as any} style={styles.modalButtonGradient}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalButtonText}>Сохранить</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showEditPassword} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.modalBackdropTouch} activeOpacity={1} onPress={() => setShowEditPassword(false)} />
          <View style={[styles.modalContent, { backgroundColor: Theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: Theme.text.primary }]}>Сменить пароль</Text>
              <TouchableOpacity onPress={() => setShowEditPassword(false)}>
                <Ionicons name="close" size={24} color={Theme.text.secondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.modalInput, { color: Theme.text.primary, backgroundColor: Theme.background.secondary, borderColor: Theme.border.primary }]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Текущий пароль"
              placeholderTextColor={Theme.text.tertiary}
              secureTextEntry
            />
            <TextInput
              style={[styles.modalInput, { color: Theme.text.primary, backgroundColor: Theme.background.secondary, borderColor: Theme.border.primary }]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Новый пароль (мин. 8 символов)"
              placeholderTextColor={Theme.text.tertiary}
              secureTextEntry
            />
            <TextInput
              style={[styles.modalInput, { color: Theme.text.primary, backgroundColor: Theme.background.secondary, borderColor: Theme.border.primary }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Подтвердите пароль"
              placeholderTextColor={Theme.text.tertiary}
              secureTextEntry
            />
            <TouchableOpacity style={styles.modalButton} onPress={handleChangePassword} disabled={saving}>
              <LinearGradient colors={Theme.accent.gradient as any} style={styles.modalButtonGradient}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalButtonText}>Изменить пароль</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 120 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  profileHeader: { marginBottom: 24 },
  profileHeaderGradient: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20, alignItems: 'center' },
  avatarContainer: { marginBottom: 16, position: 'relative' },
  avatarGradient: {
    width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: Theme.accent.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarText: { fontSize: 40, fontWeight: '700', color: '#FFF' },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16,
    backgroundColor: Theme.accent.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Theme.background.primary,
  },
  nameContainer: { flexDirection: 'row', alignItems: 'center' },
  userName: { fontSize: 24, fontWeight: '700' },
  userEmail: { fontSize: 14, marginTop: 4, marginBottom: 12 },
  memberBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255, 107, 0, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  memberText: { fontSize: 13, fontWeight: '600', color: Theme.accent.primary },
  
  statsSection: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1 },
  statIconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  
  section: { paddingHorizontal: 20, marginBottom: 24 },
  actionsCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  actionItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  actionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  actionSubtitle: { fontSize: 13 },
  actionDivider: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.06)', marginLeft: 72 },
  
  sessionCard: { borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1 },
  currentSessionCard: { borderWidth: 2, borderColor: Theme.accent.primary },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  sessionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  sessionInfo: { flex: 1 },
  sessionDeviceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sessionDevice: { fontSize: 15, fontWeight: '600' },
  currentBadgeContainer: { backgroundColor: 'rgba(255, 107, 0, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  currentBadge: { fontSize: 11, fontWeight: '700', color: Theme.accent.primary },
  sessionMeta: { fontSize: 13, marginTop: 2 },
  deleteButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.05)', alignItems: 'center', justifyContent: 'center' },
  logoutButton: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  
  infoCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  infoLabel: { fontSize: 14, width: 70 },
  infoValue: { flex: 1, fontSize: 14, textAlign: 'right' },
  infoDivider: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.06)', marginLeft: 48 },
  
  logoutSection: { paddingHorizontal: 20, marginTop: 8, marginBottom: 40 },
  logoutMainButton: { backgroundColor: '#EF4444', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutMainButtonText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  versionText: { textAlign: 'center', marginTop: 16, fontSize: 13 },
  
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  modalBackdropTouch: { flex: 1 },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalInput: { borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 12, borderWidth: 1 },
  modalButton: { borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  modalButtonGradient: { padding: 16, alignItems: 'center', justifyContent: 'center' },
  modalButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
