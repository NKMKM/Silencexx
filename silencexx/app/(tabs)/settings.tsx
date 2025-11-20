import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ChatBackground } from '@/utils/ThemeContext';
import { useRouter } from 'expo-router';
import { ReminderModal } from '@/components/ReminderModal';
import { useLanguage } from '@/utils/i18n';
import { AnimatedGradient } from '@/components/AnimatedGradient';
import { authApi } from '@/services/api';

interface Session {
  id: number;
  device_type: string;
  session_ip: string;
  created_at: string;
  last_active: string | null;
  is_current: boolean;
}

// Вынесем константы за пределы компонента
const BACKGROUND_OPTIONS: { id: ChatBackground; name: string; icon: any }[] = [
  { id: 'gradient', name: 'Градиент', icon: 'color-palette' },
  { id: 'clouds', name: 'Облака', icon: 'cloud' },
  { id: 'aurora', name: 'Аврора', icon: 'sparkles' },
  { id: 'minimal', name: 'Минимал', icon: 'remove-outline' },
  { id: 'stars', name: 'Звёзды', icon: 'star' },
];

export default function SettingsScreen() {
  const { activeTheme, setTheme, chatBackground, setChatBackground } = useTheme();
  const { language, setLanguage } = useLanguage();
  const isDark = activeTheme === 'dark';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await authApi.getSessions();
      if (response.success) {
        setSessions(response.sessions);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const getBackgroundName = useCallback(() => {
    return BACKGROUND_OPTIONS.find(b => b.id === chatBackground)?.name || 'Градиент';
  }, [chatBackground]);

  // Мемоизируем секции настроек для производительности
  const settingsSections = useMemo(() => [
    {
      title: 'Аккаунт',
      items: [
        {
          icon: 'person-outline',
          label: 'Профиль',
          value: '',
          onPress: () => router.push('/profile' as any),
        },
        {
          icon: 'card-outline',
          label: 'Подписка',
          value: 'Бесплатная',
          onPress: () => router.push('/billing' as any),
        },
      ],
    },
    {
      title: 'Внешний вид',
      items: [
        {
          icon: isDark ? 'moon-outline' : 'sunny-outline',
          label: 'Тёмная тема',
          isToggle: true,
          value: isDark,
          onPress: () => setTheme(isDark ? 'light' : 'dark'),
        },
        {
          icon: 'color-palette-outline',
          label: 'Фон чата',
          value: getBackgroundName(),
          onPress: () => setShowBackgroundModal(true),
        },
      ],
    },
    {
      title: 'Уведомления',
      items: [
        {
          icon: 'notifications-outline',
          label: 'Push-уведомления',
          isToggle: true,
          value: notificationsEnabled,
          onPress: () => setNotificationsEnabled(!notificationsEnabled),
        },
        {
          icon: 'time-outline',
          label: 'Напоминания',
          value: 'Настроить',
          onPress: () => setShowReminderModal(true),
        },
      ],
    },
    {
      title: 'Безопасность',
      items: [
        {
          icon: 'phone-portrait-outline',
          label: 'Активные устройства',
          value: sessions.length > 0 ? `${sessions.length}` : '',
          onPress: () => router.push('/sessions' as any),
        },
      ],
    },
    {
      title: 'Поддержка',
      items: [
        {
          icon: 'language-outline',
          label: 'Язык',
          value: language === 'ru' ? 'Русский' : 'English',
          onPress: () => setShowLanguageModal(true),
        },
        {
          icon: 'help-circle-outline',
          label: 'Помощь',
          value: '',
          onPress: () => alert('Раздел помощи будет доступен в следующей версии'),
        },
        {
          icon: 'information-circle-outline',
          label: 'О приложении',
          value: 'v1.0.0',
          onPress: () => alert('CloudMind v1.0.0\n\nВаш персональный ментальный помощник'),
        },
        {
          icon: 'shield-checkmark-outline',
          label: 'Конфиденциальность',
          value: '',
          onPress: () => alert('Политика конфиденциальности будет доступна в следующей версии'),
        },
      ],
    },
  ], [isDark, notificationsEnabled, language, router, setTheme, getBackgroundName]);

  return (
    <View style={styles.container}>
      <AnimatedGradient
        lightColors={['#e0e7ff', '#ddd6fe', '#e9d5ff']}
        darkColors={['#0f172a', '#1e1b4b', '#312e81', '#1e293b']}
        isDark={isDark}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text
            style={[
              styles.headerTitle,
              { color: isDark ? '#e2e8f0' : '#1e293b' },
            ]}
          >
            Настройки
          </Text>
        </View>

        {/* User Card */}
        <View style={{ marginBottom: 16 }}>
          <View
            style={[
              styles.userCard,
              {
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.5)',
                borderColor: isDark ? 'rgba(71, 85, 105, 0)' : 'rgba(226, 232, 240, 0)',
              },
            ]}
          >
          <LinearGradient
            colors={['#3b82f6', '#8b5cf6']}
            style={styles.avatar}
          >
            <Ionicons name="person" size={32} color="#fff" />
          </LinearGradient>
          <View style={styles.userInfo}>
            <Text
              style={[
                styles.userName,
                { color: isDark ? '#e2e8f0' : '#1e293b' },
              ]}
            >
              Пользователь
            </Text>
            <View style={styles.subscriptionBadge}>
              <LinearGradient
                colors={['#10b981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.subscriptionGradient}
              >
                <Ionicons name="diamond" size={12} color="#fff" />
                <Text style={styles.subscriptionText}>Бесплатная</Text>
              </LinearGradient>
            </View>
          </View>
          <TouchableOpacity>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={isDark ? '#64748b' : '#94a3b8'}
            />
          </TouchableOpacity>
        </View>
        </View>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={{ marginBottom: 16 }}>
            <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                { color: isDark ? '#cbd5e1' : '#334155' },
              ]}
            >
              {section.title}
            </Text>
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.5)',
                  borderColor: isDark ? 'rgba(71, 85, 105, 0)' : 'rgba(226, 232, 240, 0)',
                },
              ]}
            >
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  onPress={item.onPress}
                  style={[
                    styles.settingItem,
                    itemIndex !== section.items.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: isDark
                        ? 'rgba(71, 85, 105, 0.2)'
                        : 'rgba(226, 232, 240, 0.4)',
                    },
                  ]}
                >
                  <View style={styles.settingItemLeft}>
                    <Ionicons
                      name={item.icon as any}
                      size={22}
                      color={isDark ? '#a78bfa' : '#8b5cf6'}
                    />
                    <Text
                      style={[
                        styles.settingLabel,
                        { color: isDark ? '#e2e8f0' : '#1e293b' },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                  <View style={styles.settingItemRight}>
                    {item.isToggle ? (
                      <Switch
                        value={item.value as boolean}
                        onValueChange={item.onPress}
                        trackColor={{
                          false: isDark ? '#475569' : '#cbd5e1',
                          true: '#8b5cf6',
                        }}
                        thumbColor="#fff"
                      />
                    ) : (
                      <>
                        {item.value ? (
                          <Text
                            style={[
                              styles.settingValue,
                              { color: isDark ? '#94a3b8' : '#64748b' },
                            ]}
                          >
                            {item.value}
                          </Text>
                        ) : null}
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={isDark ? '#64748b' : '#94a3b8'}
                        />
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => router.replace('/login')}
        >
          <LinearGradient
            colors={['#ef4444', '#dc2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.logoutGradient}
          >
            <Ionicons name="log-out-outline" size={24} color="#fff" />
            <Text style={styles.logoutText}>Выйти</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Background Selection Modal */}
      <Modal
        visible={showBackgroundModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBackgroundModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: isDark
                  ? 'rgba(15, 23, 42, 0.98)'
                  : 'rgba(255, 255, 255, 0.98)',
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: isDark ? '#e2e8f0' : '#1e293b' },
                ]}
              >
                Выберите фон чата
              </Text>
              <TouchableOpacity onPress={() => setShowBackgroundModal(false)}>
                <Ionicons
                  name="close"
                  size={28}
                  color={isDark ? '#94a3b8' : '#64748b'}
                />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {BACKGROUND_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.backgroundOption,
                    {
                      backgroundColor: isDark
                        ? 'rgba(30, 41, 59, 0.6)'
                        : 'rgba(255, 255, 255, 0.8)',
                      borderColor:
                        chatBackground === option.id
                          ? isDark
                            ? '#a78bfa'
                            : '#8b5cf6'
                          : isDark
                          ? 'rgba(71, 85, 105, 0.3)'
                          : 'rgba(226, 232, 240, 0.5)',
                      borderWidth: chatBackground === option.id ? 2 : 1,
                    },
                  ]}
                  onPress={() => {
                    setChatBackground(option.id);
                    setShowBackgroundModal(false);
                  }}
                >
                  <View
                    style={[
                      styles.backgroundIcon,
                      {
                        backgroundColor:
                          chatBackground === option.id
                            ? isDark
                              ? '#8b5cf6'
                              : '#a78bfa'
                            : isDark
                            ? 'rgba(71, 85, 105, 0.5)'
                            : 'rgba(226, 232, 240, 0.8)',
                      },
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={24}
                      color={
                        chatBackground === option.id
                          ? '#fff'
                          : isDark
                          ? '#94a3b8'
                          : '#64748b'
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.backgroundName,
                      {
                        color:
                          chatBackground === option.id
                            ? isDark
                              ? '#a78bfa'
                              : '#8b5cf6'
                            : isDark
                            ? '#cbd5e1'
                            : '#475569',
                        fontWeight: chatBackground === option.id ? '700' : '500',
                      },
                    ]}
                  >
                    {option.name}
                  </Text>
                  {chatBackground === option.id && (
                    <Ionicons name="checkmark-circle" size={24} color={isDark ? '#a78bfa' : '#8b5cf6'} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Reminder Modal */}
      <ReminderModal
        visible={showReminderModal}
        onClose={() => setShowReminderModal(false)}
      />

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.languageModalContent,
              {
                backgroundColor: isDark
                  ? 'rgba(15, 23, 42, 0.98)'
                  : 'rgba(255, 255, 255, 0.98)',
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Ionicons
                name="language"
                size={32}
                color="#8b5cf6"
                style={{ marginBottom: 12 }}
              />
              <Text
                style={[
                  styles.languageModalTitle,
                  { color: isDark ? '#e2e8f0' : '#1e293b' },
                ]}
              >
                Выберите язык
              </Text>

            </View>

            <View style={styles.languageOptions}>
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  {
                    backgroundColor: language === 'ru'
                      ? 'rgba(139, 92, 246, 0.15)'
                      : isDark
                      ? 'rgba(30, 41, 59, 0.6)'
                      : 'rgba(241, 245, 249, 0.8)',
                    borderColor: language === 'ru'
                      ? '#8b5cf6'
                      : isDark
                      ? 'rgba(51, 65, 85, 0.6)'
                      : 'rgba(203, 213, 225, 0.6)',
                  },
                ]}
                onPress={() => {
                  setLanguage('ru');
                  setShowLanguageModal(false);
                }}
              >
                <View style={styles.languageInfo}>
                  <Text style={styles.languageFlag}>🇷🇺</Text>
                  <View>
                    <Text
                      style={[
                        styles.languageName,
                        { color: isDark ? '#e2e8f0' : '#1e293b' },
                      ]}
                    >
                      Русский
                    </Text>
                    <Text
                      style={[
                        styles.languageNative,
                        { color: isDark ? '#94a3b8' : '#64748b' },
                      ]}
                    >
                      Russian
                    </Text>
                  </View>
                </View>
                {language === 'ru' && (
                  <Ionicons name="checkmark-circle" size={24} color="#8b5cf6" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.languageOption,
                  {
                    backgroundColor: language === 'en'
                      ? 'rgba(139, 92, 246, 0.15)'
                      : isDark
                      ? 'rgba(30, 41, 59, 0.6)'
                      : 'rgba(241, 245, 249, 0.8)',
                    borderColor: language === 'en'
                      ? '#8b5cf6'
                      : isDark
                      ? 'rgba(51, 65, 85, 0.6)'
                      : 'rgba(203, 213, 225, 0.6)',
                  },
                ]}
                onPress={() => {
                  setLanguage('en');
                  setShowLanguageModal(false);
                }}
              >
                <View style={styles.languageInfo}>
                  <Text style={styles.languageFlag}>🇬🇧</Text>
                  <View>
                    <Text
                      style={[
                        styles.languageName,
                        { color: isDark ? '#e2e8f0' : '#1e293b' },
                      ]}
                    >
                      English
                    </Text>
                    <Text
                      style={[
                        styles.languageNative,
                        { color: isDark ? '#94a3b8' : '#64748b' },
                      ]}
                    >
                      Английский
                    </Text>
                  </View>
                </View>
                {language === 'en' && (
                  <Ionicons name="checkmark-circle" size={24} color="#8b5cf6" />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.languageCloseButton}
              onPress={() => setShowLanguageModal(false)}
            >
              <Text
                style={[
                  styles.languageCloseText,
                  { color: isDark ? '#94a3b8' : '#64748b' },
                ]}
              >
                Отмена / Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    bottom: 42,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  subscriptionBadge: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    overflow: 'hidden',
  },
  subscriptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  subscriptionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 14,
  },
  logoutButton: {
    marginTop: 8,
    marginBottom: 20,
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  modalScroll: {
    maxHeight: 400,
  },
  backgroundOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 12,
  },
  backgroundIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundName: {
    flex: 1,
    fontSize: 16,
  },
  languageModalContent: {
    borderRadius: 24,
    padding: 32,
    marginHorizontal: 20,
    marginVertical: 'auto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  languageModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  languageModalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  languageOptions: {
    gap: 12,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  languageFlag: {
    fontSize: 32,
  },
  languageName: {
    fontSize: 18,
    fontWeight: '600',
  },
  languageNative: {
    fontSize: 14,
    marginTop: 2,
  },
  languageCloseButton: {
    marginTop: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  languageCloseText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
