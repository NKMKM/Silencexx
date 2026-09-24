import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  FadeInDown, 
  FadeInUp,
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/theme';
import { api, getBaseURL } from '@/services/api';
import * as ImagePicker from 'expo-image-picker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AccountSettingsProps {
  onNavigateBack?: () => void;
}

interface Subscription {
  id: number;
  slug: string;
  name: string;
  price_monthly: number;
  daily_chat_limit: number;
  daily_voice_limit: number;
  daily_mood_analysis_limit: number;
  daily_journal_limit: number;
  chat_history_days: number;
  has_tts: boolean;
  has_export: boolean;
  subscription_expires_at: string | null;
  isExpired: boolean;
  daysUntilExpiry: number | null;
}

interface UserProfile {
  id: number;
  email: string;
  name?: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
}

interface EmailChangeStatus {
  canChange: boolean;
  daysLeft: number;
  nextChangeDate: string | null;
}

export function AccountSettings({ onNavigateBack }: AccountSettingsProps) {
  const router = useRouter();
  const isDark = true;
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailChangeModal, setShowEmailChangeModal] = useState(false);
  const [emailChangeStatus, setEmailChangeStatus] = useState<EmailChangeStatus | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Email change state
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      
      // Load profile
      try {
        const profileResponse = await api.get('/auth/profile');
        if (profileResponse.data?.success && profileResponse.data?.user) {
          const user = profileResponse.data.user;
          setProfile(user);
          setName(user.name || '');
          setEmail(user.email || '');
          setPhone(user.phone || '');
          if (user.avatar) {
            setAvatarUri(`${getBaseURL()}/uploads/${user.avatar}`);
          }
        }
      } catch (err) {
        console.log('Profile not loaded:', err);
      }

      // Load subscription
      try {
        const subResponse = await api.get('/subscriptions/current');
        if (subResponse.data?.success && subResponse.data?.subscription) {
          setSubscription(subResponse.data.subscription);
        }
      } catch (err) {
        console.log('Subscription not loaded:', err);
      }

      // Load email change status
      try {
        const statusResponse = await api.get('/auth/email-change-status');
        if (statusResponse.data?.success) {
          setEmailChangeStatus({
            canChange: statusResponse.data.canChange,
            daysLeft: statusResponse.data.daysLeft,
            nextChangeDate: statusResponse.data.nextChangeDate,
          });
        }
      } catch (err) {
        console.log('Email change status not loaded:', err);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateBack = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      router.back();
    }
  };

  const handleSave = async () => {
    if (!name) {
      Alert.alert('Ошибка', 'Имя обязательно');
      return;
    }

    setSaving(true);
    try {
      const response = await api.put('/auth/profile', { name, phone });
      if (response.data?.success) {
        Alert.alert('Успешно', 'Профиль обновлен');
        loadProfileData();
      } else {
        Alert.alert('Ошибка', response.data?.error || 'Не удалось обновить профиль');
      }
    } catch (error: any) {
      Alert.alert('Ошибка', error.response?.data?.error || 'Не удалось обновить профиль');
    } finally {
      setSaving(false);
    }
  };

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
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
      uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('avatar', {
        uri,
        name: filename,
        type,
      } as any);

      const response = await api.post('/auth/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data?.success) {
        setAvatarUri(`${getBaseURL()}${response.data.avatarUrl}`);
        Alert.alert('Успешно', 'Аватар обновлен');
      } else {
        Alert.alert('Ошибка', response.data?.error || 'Не удалось загрузить аватар');
      }
    } catch (error: any) {
      Alert.alert('Ошибка', error.response?.data?.error || 'Не удалось загрузить аватар');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Ошибка', 'Пароль должен быть не менее 8 символов');
      return;
    }

    setChangingPassword(true);
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (response.data?.success) {
        Alert.alert('Успешно', 'Пароль изменен');
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Ошибка', response.data?.error || 'Не удалось изменить пароль');
      }
    } catch (error: any) {
      Alert.alert('Ошибка', error.response?.data?.error || 'Не удалось изменить пароль');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRequestEmailChange = async () => {
    if (!newEmail) {
      Alert.alert('Ошибка', 'Введите новый email');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(newEmail)) {
      Alert.alert('Ошибка', 'Неверный формат email');
      return;
    }

    if (newEmail.toLowerCase() === email.toLowerCase()) {
      Alert.alert('Ошибка', 'Новый email совпадает с текущим');
      return;
    }

    setChangingEmail(true);
    try {
      const response = await api.post('/auth/request-email-change', { newEmail });

      if (response.data?.success) {
        Alert.alert(
          'Проверьте почту',
          `Письмо с подтверждением отправлено на ${newEmail}. Перейдите по ссылке для подтверждения смены email.`
        );
        setShowEmailChangeModal(false);
        setNewEmail('');
      } else {
        Alert.alert('Ошибка', response.data?.error || 'Не удалось отправить запрос');
      }
    } catch (error: any) {
      const errorData = error.response?.data;
      if (errorData?.daysLeft) {
        Alert.alert(
          'Ограничение',
          `Email можно менять раз в 14 дней. Осталось ждать: ${errorData.daysLeft} дней`
        );
      } else {
        Alert.alert('Ошибка', errorData?.error || 'Не удалось отправить запрос');
      }
    } finally {
      setChangingEmail(false);
    }
  };

  const handleCancelSubscription = () => {
    if (!subscription || subscription.slug === 'free') {
      Alert.alert('Инфо', 'У вас уже бесплатный план');
      return;
    }

    Alert.alert(
      'Отменить подписку?',
      'Вы потеряете доступ к премиум функциям и вернетесь на бесплатный план.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Отменить подписку',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.post('/subscriptions/cancel', {});
              if (response.data?.success) {
                Alert.alert('Успешно', 'Подписка отменена');
                loadProfileData();
              } else {
                Alert.alert('Ошибка', response.data?.error || 'Не удалось отменить подписку');
              }
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось отменить подписку');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Удалить аккаунт?',
      'Все ваши данные будут безвозвратно удалены. Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            Alert.alert('Инфо', 'Удаление аккаунта пока не реализовано');
          },
        },
      ]
    );
  };

  const getInitials = () => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getTierColor = (slug?: string) => {
    switch (slug) {
      case 'free':
        return { bg: 'rgba(107, 114, 128, 0.15)', text: '#6b7280', gradient: ['#6b7280', '#9ca3af'] as [string, string] };
      case 'plus':
        return { bg: 'rgba(255, 107, 0, 0.15)', text: Theme.accent.primary, gradient: Theme.accent.gradient as [string, string] };
      case 'pro':
        return { bg: 'rgba(255, 140, 51, 0.15)', text: Theme.accent.secondary, gradient: Theme.accent.gradient as [string, string] };
      default:
        return { bg: 'rgba(255, 107, 0, 0.15)', text: Theme.accent.primary, gradient: Theme.accent.gradient as [string, string] };
    }
  };

  // Animation values
  const avatarScale = useSharedValue(1);
  const cardGlow = useSharedValue(0);
  
  useEffect(() => {
    cardGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const avatarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardGlow.value, [0, 1], [0.3, 0.6]),
  }));

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: Theme.background.primary }]}>
        <LinearGradient
          colors={Theme.accent.gradient as unknown as [string, string]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          <Animated.View entering={FadeInUp.duration(600)}>
            <LinearGradient
              colors={Theme.accent.gradient as unknown as [string, string]}
              style={styles.loadingIcon}
            >
              <ActivityIndicator size="large" color="#fff" />
            </LinearGradient>
            <Text style={[styles.loadingText, { color: Theme.text.secondary }]}>
              Загрузка профиля...
            </Text>
          </Animated.View>
        </View>
      </View>
    );
  }

  const tierColor = getTierColor(subscription?.slug);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Theme.accent.gradient as unknown as [string, string]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <Animated.View 
        entering={FadeInDown.duration(400)}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: 'rgba(255, 107, 0, 0.15)' }]} 
          onPress={handleNavigateBack}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={Theme.accent.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: Theme.text.primary }]}>
            Мой профиль
          </Text>
          <Text style={[styles.headerSubtitle, { color: Theme.text.secondary }]}>
            Управление настройками аккаунта
          </Text>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Avatar Card */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <View
            style={[
              styles.avatarCard,
              {
                backgroundColor: Theme.background.card,
                borderColor: 'rgba(255, 107, 0, 0.3)',
              },
            ]}
          >
            <Animated.View style={[styles.cardGlow, glowAnimatedStyle]}>
              <LinearGradient
                colors={[Theme.accent.primary, Theme.accent.secondary, Theme.accent.primary]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            </Animated.View>

            <View style={styles.avatarSection}>
              <Animated.View style={avatarAnimatedStyle}>
                <TouchableOpacity
                  onPressIn={() => { avatarScale.value = withSpring(0.95); }}
                  onPressOut={() => { avatarScale.value = withSpring(1); }}
                  onPress={handlePickAvatar}
                  activeOpacity={0.9}
                >
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                  ) : (
                    <LinearGradient
                      colors={tierColor.gradient}
                      style={styles.avatar}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.avatarText}>{getInitials()}</Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              </Animated.View>
              <TouchableOpacity 
                style={[styles.editAvatarButton, { backgroundColor: Theme.accent.primary }]}
                activeOpacity={0.8}
                onPress={handlePickAvatar}
              >
                <Ionicons name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.avatarInfo}>
              <Text style={[styles.userName, { color: Theme.text.primary }]}>
                {name || 'Пользователь'}
              </Text>
              <Text style={[styles.userEmail, { color: Theme.text.secondary }]}>
                {email || 'email@example.com'}
              </Text>
              {subscription && (
                <View style={[styles.planBadge, { backgroundColor: tierColor.bg }]}>
                  <Ionicons
                    name={subscription.slug === 'free' ? 'sparkles' : 'diamond'}
                    size={14}
                    color={tierColor.text}
                  />
                  <Text style={[styles.planText, { color: tierColor.text }]}>
                    {subscription.name || 'Free Plan'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Subscription Card */}
        {subscription && (
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: Theme.background.card,
                  borderColor: 'rgba(255, 107, 0, 0.2)',
                },
              ]}
            >
              <View style={styles.subscriptionHeader}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="card-outline" size={22} color={Theme.accent.primary} />
                  <Text style={[styles.sectionTitle, { color: Theme.text.primary, marginBottom: 0 }]}>
                    Подписка
                  </Text>
                </View>
                {subscription.price_monthly > 0 && (
                  <Text style={[styles.priceText, { color: Theme.accent.primary }]}>
                    ₽{subscription.price_monthly}/мес
                  </Text>
                )}
              </View>

              <View style={styles.limitsContainer}>
                <View style={[styles.limitCard, { backgroundColor: 'rgba(255, 107, 0, 0.1)' }]}>
                  <Ionicons name="chatbubbles" size={24} color={Theme.accent.primary} />
                  <Text style={[styles.limitValue, { color: Theme.text.primary }]}>
                    {subscription.daily_chat_limit === 999999 ? '∞' : subscription.daily_chat_limit}
                  </Text>
                  <Text style={[styles.limitLabel, { color: Theme.text.secondary }]}>
                    Сообщений/день
                  </Text>
                </View>

                <View style={[styles.limitCard, { backgroundColor: 'rgba(255, 140, 51, 0.1)' }]}>
                  <Ionicons name="mic" size={24} color={Theme.accent.secondary} />
                  <Text style={[styles.limitValue, { color: Theme.text.primary }]}>
                    {subscription.daily_voice_limit === 999999 ? '∞' : subscription.daily_voice_limit}
                  </Text>
                  <Text style={[styles.limitLabel, { color: Theme.text.secondary }]}>
                    Голосовых/день
                  </Text>
                </View>

                <View style={[styles.limitCard, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Ionicons name="analytics" size={24} color="#10b981" />
                  <Text style={[styles.limitValue, { color: Theme.text.primary }]}>
                    {subscription.daily_mood_analysis_limit === 999999 ? '∞' : subscription.daily_mood_analysis_limit}
                  </Text>
                  <Text style={[styles.limitLabel, { color: Theme.text.secondary }]}>
                    Анализов/день
                  </Text>
                </View>
              </View>

              <View style={styles.featuresRow}>
                <View style={styles.featureChip}>
                  <Ionicons 
                    name={subscription.has_tts ? 'checkmark-circle' : 'close-circle'} 
                    size={16} 
                    color={subscription.has_tts ? '#10b981' : '#6b7280'} 
                  />
                  <Text style={[styles.featureChipText, { color: Theme.text.secondary }]}>
                    TTS
                  </Text>
                </View>
                <View style={styles.featureChip}>
                  <Ionicons 
                    name={subscription.has_export ? 'checkmark-circle' : 'close-circle'} 
                    size={16} 
                    color={subscription.has_export ? '#10b981' : '#6b7280'} 
                  />
                  <Text style={[styles.featureChipText, { color: Theme.text.secondary }]}>
                    Экспорт
                  </Text>
                </View>
                <View style={styles.featureChip}>
                  <Ionicons name="time" size={16} color={Theme.accent.primary} />
                  <Text style={[styles.featureChipText, { color: Theme.text.secondary }]}>
                    {subscription.chat_history_days} дн. истории
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => router.push('/billing')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={Theme.accent.gradient as unknown as [string, string]}
                  style={styles.upgradeButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="rocket" size={20} color="#fff" />
                  <Text style={styles.upgradeButtonText}>
                    {subscription.slug === 'free' ? 'Улучшить план' : 'Управление планом'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Personal Info Section */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: Theme.background.card,
                borderColor: 'rgba(255, 107, 0, 0.2)',
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="person-outline" size={22} color={Theme.accent.primary} />
                <Text style={[styles.sectionTitle, { color: Theme.text.primary, marginBottom: 0 }]}>
                  Личная информация
                </Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: Theme.text.secondary }]}>
                Полное имя
              </Text>
              <View style={[styles.inputContainer, { 
                backgroundColor: Theme.background.secondary,
                borderColor: 'rgba(255, 107, 0, 0.2)',
              }]}>
                <Ionicons name="person" size={20} color={Theme.text.tertiary} />
                <TextInput
                  style={[styles.input, { color: Theme.text.primary }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Введите имя"
                  placeholderTextColor={Theme.text.tertiary}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: Theme.text.secondary }]}>
                  Email
                </Text>
                {emailChangeStatus && !emailChangeStatus.canChange && (
                  <Text style={[styles.cooldownText, { color: '#f59e0b' }]}>
                    Смена через {emailChangeStatus.daysLeft} дн.
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.inputContainer, { 
                  backgroundColor: Theme.background.secondary,
                  borderColor: 'rgba(255, 107, 0, 0.2)',
                }]}
                onPress={() => {
                  if (emailChangeStatus?.canChange) {
                    setShowEmailChangeModal(true);
                  } else {
                    Alert.alert(
                      'Ограничение',
                      `Email можно менять раз в 14 дней. Осталось ждать: ${emailChangeStatus?.daysLeft || 0} дней`
                    );
                  }
                }}
              >
                <Ionicons name="mail" size={20} color={Theme.text.tertiary} />
                <Text style={[styles.inputText, { color: Theme.text.primary }]}>
                  {email || 'email@example.com'}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={Theme.text.tertiary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: Theme.text.secondary }]}>
                Телефон (опционально)
              </Text>
              <View style={[styles.inputContainer, { 
                backgroundColor: Theme.background.secondary,
                borderColor: 'rgba(255, 107, 0, 0.2)',
              }]}>
                <Ionicons name="call" size={20} color={Theme.text.tertiary} />
                <TextInput
                  style={[styles.input, { color: Theme.text.primary }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Введите телефон"
                  placeholderTextColor={Theme.text.tertiary}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { opacity: saving ? 0.7 : 1 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.saveButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Сохранить изменения</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Security Section */}
        <Animated.View entering={FadeInDown.duration(500).delay(350)}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: Theme.background.card,
                borderColor: 'rgba(255, 107, 0, 0.2)',
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="shield-checkmark" size={22} color={Theme.accent.primary} />
                <Text style={[styles.sectionTitle, { color: Theme.text.primary, marginBottom: 0 }]}>
                  Безопасность
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.securityButton, { backgroundColor: 'rgba(255, 107, 0, 0.1)' }]}
              onPress={() => setShowPasswordModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.securityButtonContent}>
                <Ionicons name="key" size={20} color={Theme.accent.primary} />
                <View style={styles.securityButtonText}>
                  <Text style={[styles.securityButtonTitle, { color: Theme.text.primary }]}>
                    Смена пароля
                  </Text>
                  <Text style={[styles.securityButtonDesc, { color: Theme.text.secondary }]}>
                    Обновите пароль для безопасности
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Theme.text.tertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.securityButton, { backgroundColor: 'rgba(255, 107, 0, 0.1)' }]}
              onPress={() => router.push('/sessions')}
              activeOpacity={0.7}
            >
              <View style={styles.securityButtonContent}>
                <Ionicons name="phone-portrait" size={20} color={Theme.accent.primary} />
                <View style={styles.securityButtonText}>
                  <Text style={[styles.securityButtonTitle, { color: Theme.text.primary }]}>
                    Активные сессии
                  </Text>
                  <Text style={[styles.securityButtonDesc, { color: Theme.text.secondary }]}>
                    Управление устройствами
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Theme.text.tertiary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Danger Zone */}
        <Animated.View entering={FadeInDown.duration(500).delay(400)}>
          <View
            style={[
              styles.card,
              styles.dangerCard,
              {
                backgroundColor: Theme.background.card,
                borderColor: 'rgba(239, 68, 68, 0.3)',
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="warning" size={22} color="#ef4444" />
                <Text style={[styles.sectionTitle, { color: '#ef4444', marginBottom: 0 }]}>
                  Опасная зона
                </Text>
              </View>
            </View>

            {subscription && subscription.slug !== 'free' && (
              <TouchableOpacity
                style={[styles.dangerButton, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)' }]}
                onPress={handleCancelSubscription}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={20} color="#f59e0b" />
                <Text style={[styles.dangerButtonText, { color: '#f59e0b' }]}>
                  Отменить подписку
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.dangerButton, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
            >
              <Ionicons name="trash" size={20} color="#ef4444" />
              <Text style={[styles.dangerButtonText, { color: '#ef4444' }]}>
                Удалить аккаунт
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: Theme.text.primary }]}>
                Смена пароля
              </Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={24} color={Theme.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: Theme.text.secondary }]}>
                  Текущий пароль
                </Text>
                <View style={[styles.inputContainer, { 
                  backgroundColor: Theme.background.secondary,
                  borderColor: 'rgba(255, 107, 0, 0.2)',
                }]}>
                  <Ionicons name="lock-closed" size={20} color={Theme.text.tertiary} />
                  <TextInput
                    style={[styles.input, { color: Theme.text.primary }]}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Введите текущий пароль"
                    placeholderTextColor={Theme.text.tertiary}
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: Theme.text.secondary }]}>
                  Новый пароль
                </Text>
                <View style={[styles.inputContainer, { 
                  backgroundColor: Theme.background.secondary,
                  borderColor: 'rgba(255, 107, 0, 0.2)',
                }]}>
                  <Ionicons name="key" size={20} color={Theme.text.tertiary} />
                  <TextInput
                    style={[styles.input, { color: Theme.text.primary }]}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Мин. 8 символов, латиница + цифры"
                    placeholderTextColor={Theme.text.tertiary}
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: Theme.text.secondary }]}>
                  Подтверждение пароля
                </Text>
                <View style={[styles.inputContainer, { 
                  backgroundColor: Theme.background.secondary,
                  borderColor: 'rgba(255, 107, 0, 0.2)',
                }]}>
                  <Ionicons name="key" size={20} color={Theme.text.tertiary} />
                  <TextInput
                    style={[styles.input, { color: Theme.text.primary }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Повторите новый пароль"
                    placeholderTextColor={Theme.text.tertiary}
                    secureTextEntry
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.modalButton, { opacity: changingPassword ? 0.7 : 1 }]}
              onPress={handleChangePassword}
              disabled={changingPassword}
            >
              <LinearGradient
                colors={Theme.accent.gradient as unknown as [string, string]}
                style={styles.modalButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {changingPassword ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalButtonText}>Изменить пароль</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Email Change Modal */}
      <Modal
        visible={showEmailChangeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEmailChangeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: Theme.text.primary }]}>
                Смена Email
              </Text>
              <TouchableOpacity onPress={() => setShowEmailChangeModal(false)}>
                <Ionicons name="close" size={24} color={Theme.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={[styles.warningBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name="information-circle" size={20} color="#f59e0b" />
                <Text style={[styles.warningText, { color: '#f59e0b' }]}>
                  Email можно менять только раз в 14 дней. На новый адрес будет отправлена ссылка для подтверждения.
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: Theme.text.secondary }]}>
                  Текущий email
                </Text>
                <View style={[styles.inputContainer, styles.disabledInput, { 
                  backgroundColor: Theme.background.secondary,
                  borderColor: 'rgba(255, 107, 0, 0.1)',
                }]}>
                  <Ionicons name="mail" size={20} color={Theme.text.tertiary} />
                  <Text style={[styles.inputText, { color: Theme.text.tertiary }]}>
                    {email}
                  </Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: Theme.text.secondary }]}>
                  Новый email
                </Text>
                <View style={[styles.inputContainer, { 
                  backgroundColor: Theme.background.secondary,
                  borderColor: 'rgba(255, 107, 0, 0.2)',
                }]}>
                  <Ionicons name="mail" size={20} color={Theme.text.tertiary} />
                  <TextInput
                    style={[styles.input, { color: Theme.text.primary }]}
                    value={newEmail}
                    onChangeText={setNewEmail}
                    placeholder="Введите новый email"
                    placeholderTextColor={Theme.text.tertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.modalButton, { opacity: changingEmail ? 0.7 : 1 }]}
              onPress={handleRequestEmailChange}
              disabled={changingEmail}
            >
              <LinearGradient
                colors={Theme.accent.gradient as unknown as [string, string]}
                style={styles.modalButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {changingEmail ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalButtonText}>Отправить подтверждение</Text>
                )}
              </LinearGradient>
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
    backgroundColor: Theme.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIcon: {
    width: 88,
    height: 88,
    borderRadius: Theme.radius.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    alignSelf: 'center',
    backgroundColor: Theme.background.elevated,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    color: Theme.text.secondary,
  },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: Theme.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.background.elevated,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: Theme.text.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 3,
    color: Theme.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    gap: 18,
  },
  avatarCard: {
    borderRadius: Theme.radius.xl,
    padding: 26,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    backgroundColor: Theme.background.card,
    borderColor: Theme.border.primary,
  },
  cardGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
    borderRadius: Theme.radius.xl,
    backgroundColor: Theme.accent.primary,
    opacity: 0.05,
  },
  avatarSection: {
    position: 'relative',
    marginBottom: 18,
  },
  avatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Theme.accent.primary,
  },
  avatarImage: {
    width: 108,
    height: 108,
    borderRadius: 54,
  },
  avatarText: {
    fontSize: 38,
    fontWeight: '700',
    color: '#fff',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: -10,
    width: 40,
    height: 40,
    borderRadius: Theme.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Theme.background.card,
    backgroundColor: Theme.accent.primary,
  },
  avatarInfo: {
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: Theme.text.primary,
  },
  userEmail: {
    fontSize: 15,
    marginBottom: 10,
    color: Theme.text.secondary,
  },
  planBadge: {
    borderRadius: Theme.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.status.infoBg,
  },
  planText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.status.info,
  },
  card: {
    borderRadius: Theme.radius.lg,
    padding: 22,
    borderWidth: 1,
    backgroundColor: Theme.background.card,
    borderColor: Theme.border.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '600',
    marginBottom: 14,
    color: Theme.text.primary,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  priceText: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.accent.primary,
  },
  limitsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  limitCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: Theme.radius.md,
    gap: 8,
    backgroundColor: Theme.background.tertiary,
    borderWidth: 1,
    borderColor: Theme.border.primary,
  },
  limitValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Theme.accent.secondary,
  },
  limitLabel: {
    fontSize: 11,
    textAlign: 'center',
    color: Theme.text.secondary,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.status.infoBg,
  },
  featureChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: Theme.status.info,
  },
  upgradeButton: {
    borderRadius: Theme.radius.md,
    overflow: 'hidden',
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 10,
    marginLeft: 5,
    color: Theme.text.secondary,
  },
  cooldownText: {
    fontSize: 12,
    fontWeight: '500',
    color: Theme.status.warning,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
    backgroundColor: Theme.background.tertiary,
    borderColor: Theme.border.primary,
  },
  disabledInput: {
    opacity: 0.6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    color: Theme.text.primary,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: Theme.text.primary,
  },
  saveButton: {
    borderRadius: Theme.radius.md,
    overflow: 'hidden',
    marginTop: 10,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  securityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: Theme.radius.md,
    marginBottom: 12,
    backgroundColor: Theme.background.tertiary,
  },
  securityButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  securityButtonText: {
    flex: 1,
  },
  securityButtonTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
    color: Theme.text.primary,
  },
  securityButtonDesc: {
    fontSize: 13,
    color: Theme.text.secondary,
  },
  dangerCard: {
    marginTop: 10,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: Theme.radius.md,
    marginBottom: 12,
    backgroundColor: Theme.status.errorBg,
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.status.error,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 20, 38, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Theme.radius.xxl,
    borderTopRightRadius: Theme.radius.xxl,
    padding: 26,
    maxHeight: '80%',
    backgroundColor: Theme.background.secondary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Theme.text.primary,
  },
  modalBody: {
    marginBottom: 22,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: Theme.radius.md,
    marginBottom: 18,
    backgroundColor: Theme.status.warningBg,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: Theme.status.warning,
  },
  modalButton: {
    borderRadius: Theme.radius.md,
    overflow: 'hidden',
  },
  modalButtonGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
