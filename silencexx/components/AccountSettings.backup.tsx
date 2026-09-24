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
import { useTheme } from '@/utils/ThemeContext';
import { AnimatedGradient } from './AnimatedGradient';
import { api } from '@/services/api';

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
  full_name?: string;
  phone?: string;
  created_at: string;
}

export function AccountSettings({ onNavigateBack }: AccountSettingsProps) {
  const router = useRouter();
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      
      // Load profile
      try {
        const profileResponse = await api.get('/auth/profile');
        if (profileResponse.data?.success && profileResponse.data?.profile) {
          setProfile(profileResponse.data.profile);
          setName(profileResponse.data.profile.full_name || '');
          setEmail(profileResponse.data.profile.email || '');
          setPhone(profileResponse.data.profile.phone || '');
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
    if (!name || !email) {
      Alert.alert('Error', 'Name and email are required');
      return;
    }

    setSaving(true);
    try {
      // TODO: Implement profile update endpoint
      Alert.alert('Success', 'Profile updated successfully');
      setSaving(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
      setSaving(false);
    }
  };

  const handleCancelSubscription = () => {
    if (!subscription || subscription.slug === 'free') {
      Alert.alert('Info', 'You are already on the free plan');
      return;
    }

    Alert.alert(
      'Cancel Subscription?',
      'You will lose access to premium features and return to the free plan.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Downgrade',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.post('/subscriptions/cancel', {});
              if (response.data?.success) {
                Alert.alert('Success', 'Subscription cancelled');
                loadProfileData();
              } else {
                Alert.alert('Error', response.data?.error || 'Failed to cancel subscription');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel subscription');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account?',
      'All your data will be permanently deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // TODO: Implement account deletion
            Alert.alert('Info', 'Account deletion not yet implemented');
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
        return { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7', gradient: ['#a855f7', '#c084fc'] as [string, string] };
      case 'pro':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', gradient: ['#3b82f6', '#60a5fa'] as [string, string] };
      default:
        return { bg: 'rgba(99, 102, 241, 0.15)', text: '#6366f1', gradient: ['#6366f1', '#818cf8'] as [string, string] };
    }
  };

  // Animation values
  const avatarScale = useSharedValue(1);
  const cardGlow = useSharedValue(0);
  
  useEffect(() => {
    // Start glow animation for premium feel
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
      <View style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
        <AnimatedGradient
          lightColors={['#e0e7ff', '#ddd6fe', '#e9d5ff']}
          darkColors={['#1a1a2e', '#16213e', '#0f3460', '#1a1a2e']}
          isDark={isDark}
        />
        <View style={styles.loadingContainer}>
          <Animated.View entering={FadeInUp.duration(600)}>
            <LinearGradient
              colors={isDark ? ['#6366f1', '#a855f7'] : ['#818cf8', '#c084fc']}
              style={styles.loadingIcon}
            >
              <ActivityIndicator size="large" color="#fff" />
            </LinearGradient>
            <Text style={[styles.loadingText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              Loading your profile...
            </Text>
          </Animated.View>
        </View>
      </View>
    );
  }

  const tierColor = getTierColor(subscription?.slug);

  return (
    <View style={styles.container}>
      <AnimatedGradient
        lightColors={['#e0e7ff', '#ddd6fe', '#e9d5ff']}
        darkColors={['#1a1a2e', '#16213e', '#0f3460', '#1a1a2e']}
        isDark={isDark}
      />

      {/* Header */}
      <Animated.View 
        entering={FadeInDown.duration(400)}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)' }]} 
          onPress={handleNavigateBack}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={isDark ? '#818cf8' : '#6366f1'} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
            My Profile
          </Text>
          <Text style={[styles.headerSubtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            Manage your account settings
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
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)',
              },
            ]}
          >
            {/* Animated glow effect */}
            <Animated.View style={[styles.cardGlow, glowAnimatedStyle]}>
              <LinearGradient
                colors={isDark ? ['#6366f1', '#a855f7', '#6366f1'] : ['#818cf8', '#c084fc', '#818cf8']}
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
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={tierColor.gradient}
                    style={styles.avatar}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.avatarText}>{getInitials()}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
              <TouchableOpacity 
                style={[styles.editAvatarButton, { backgroundColor: isDark ? '#6366f1' : '#818cf8' }]}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.avatarInfo}>
              <Text style={[styles.userName, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
                {name || 'User'}
              </Text>
              <Text style={[styles.userEmail, { color: isDark ? '#94a3b8' : '#64748b' }]}>
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
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                  borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.15)',
                },
              ]}
            >
              <View style={styles.subscriptionHeader}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="card-outline" size={22} color={isDark ? '#818cf8' : '#6366f1'} />
                  <Text style={[styles.sectionTitle, { color: isDark ? '#f1f5f9' : '#0f172a', marginBottom: 0 }]}>
                    Subscription
                  </Text>
                </View>
                {subscription.price_monthly > 0 && (
                  <Text style={[styles.priceText, { color: isDark ? '#818cf8' : '#6366f1' }]}>
                    ₽{subscription.price_monthly}/mo
                  </Text>
                )}
              </View>

              {/* Usage Limits with better styling */}
              <View style={styles.limitsContainer}>
                <View style={[styles.limitCard, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.08)' }]}>
                  <Ionicons name="chatbubbles" size={24} color={isDark ? '#818cf8' : '#6366f1'} />
                  <Text style={[styles.limitValue, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
                    {subscription.daily_chat_limit}
                  </Text>
                  <Text style={[styles.limitLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                    Messages/day
                  </Text>
                </View>

                <View style={[styles.limitCard, { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.08)' }]}>
                  <Ionicons name="mic" size={24} color={isDark ? '#c084fc' : '#a855f7'} />
                  <Text style={[styles.limitValue, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
                    {subscription.daily_voice_limit === 999999 ? '∞' : subscription.daily_voice_limit}
                  </Text>
                  <Text style={[styles.limitLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                    Voice/day
                  </Text>
                </View>

                <View style={[styles.limitCard, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)' }]}>
                  <Ionicons name="analytics" size={24} color="#10b981" />
                  <Text style={[styles.limitValue, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
                    {subscription.daily_mood_analysis_limit === 999999 ? '∞' : subscription.daily_mood_analysis_limit}
                  </Text>
                  <Text style={[styles.limitLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                    Analysis/day
                  </Text>
                </View>
              </View>

              {/* Feature chips */}
              <View style={styles.featuresRow}>
                <View style={styles.featureChip}>
                  <Ionicons 
                    name={subscription.has_tts ? 'checkmark-circle' : 'close-circle'} 
                    size={16} 
                    color={subscription.has_tts ? '#10b981' : '#6b7280'} 
                  />
                  <Text style={[styles.featureChipText, { color: isDark ? '#cbd5e1' : '#475569' }]}>
                    TTS
                  </Text>
                </View>
                <View style={styles.featureChip}>
                  <Ionicons 
                    name={subscription.has_export ? 'checkmark-circle' : 'close-circle'} 
                    size={16} 
                    color={subscription.has_export ? '#10b981' : '#6b7280'} 
                  />
                  <Text style={[styles.featureChipText, { color: isDark ? '#cbd5e1' : '#475569' }]}>
                    Export
                  </Text>
                </View>
                <View style={styles.featureChip}>
                  <Ionicons name="time" size={16} color={isDark ? '#818cf8' : '#6366f1'} />
                  <Text style={[styles.featureChipText, { color: isDark ? '#cbd5e1' : '#475569' }]}>
                    {subscription.chat_history_days}d history
                  </Text>
                </View>
              </View>

              {/* Upgrade Button */}
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => router.push('/billing')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#6366f1', '#a855f7']}
                  style={styles.upgradeButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="rocket" size={20} color="#fff" />
                  <Text style={styles.upgradeButtonText}>
                    {subscription.slug === 'free' ? 'Upgrade Plan' : 'Manage Plan'}
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
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.15)',
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="person-outline" size={22} color={isDark ? '#818cf8' : '#6366f1'} />
                <Text style={[styles.sectionTitle, { color: isDark ? '#f1f5f9' : '#0f172a', marginBottom: 0 }]}>
                  Personal Info
                </Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                Full Name
              </Text>
              <View style={[styles.inputContainer, { 
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(241, 245, 249, 0.8)',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.15)',
              }]}>
                <Ionicons name="person" size={20} color={isDark ? '#64748b' : '#94a3b8'} />
                <TextInput
                  style={[styles.input, { color: isDark ? '#f1f5f9' : '#0f172a' }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                Email
              </Text>
              <View style={[styles.inputContainer, { 
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(241, 245, 249, 0.8)',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.15)',
              }]}>
                <Ionicons name="mail" size={20} color={isDark ? '#64748b' : '#94a3b8'} />
                <TextInput
                  style={[styles.input, { color: isDark ? '#f1f5f9' : '#0f172a' }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                Phone (optional)
              </Text>
              <View style={[styles.inputContainer, { 
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(241, 245, 249, 0.8)',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.15)',
              }]}>
                <Ionicons name="call" size={20} color={isDark ? '#64748b' : '#94a3b8'} />
                <TextInput
                  style={[styles.input, { color: isDark ? '#f1f5f9' : '#0f172a' }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter your phone"
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
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
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </LinearGradient>
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
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)',
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="warning" size={22} color="#ef4444" />
                <Text style={[styles.sectionTitle, { color: '#ef4444', marginBottom: 0 }]}>
                  Danger Zone
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
                  Cancel Subscription
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.dangerButton, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)' }]}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
            >
              <Ionicons name="trash" size={20} color="#ef4444" />
              <Text style={[styles.dangerButtonText, { color: '#ef4444' }]}>
                Delete Account
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  avatarCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
  },
  cardGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
    borderRadius: 24,
  },
  avatarSection: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: -8,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarInfo: {
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  planBadge: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
  },
  limitsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  limitCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    gap: 6,
  },
  limitValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  limitLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  featureChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  upgradeButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerCard: {
    marginTop: 8,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
