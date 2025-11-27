import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/utils/ThemeContext';
import { AnimatedGradient } from './AnimatedGradient';

interface AccountSettingsProps {
  onNavigateBack?: () => void;
}

export function AccountSettings({ onNavigateBack }: AccountSettingsProps) {
  const router = useRouter();
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  const insets = useSafeAreaInsets();
  
  const [name, setName] = useState('Иван Иванов');
  const [email, setEmail] = useState('ivan@example.com');
  const [phone, setPhone] = useState('+7 (999) 123-45-67');

  const handleNavigateBack = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      router.back();
    }
  };

  const handleSave = () => {
    Alert.alert('Успех', 'Профиль обновлен!');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Удалить аккаунт?',
      'Все ваши данные будут удалены навсегда.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Удалить', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  const getInitials = () => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <View style={styles.container}>
      <AnimatedGradient
        lightColors={['#e0e7ff', '#ddd6fe', '#e9d5ff']}
        darkColors={['#1a1a2e', '#16213e', '#0f3460', '#1a1a2e']}
        isDark={isDark}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleNavigateBack}>
          <Ionicons name="chevron-back" size={28} color={isDark ? '#818cf8' : '#6366f1'} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={[styles.headerIconContainer, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.15)' }]}>
            <Ionicons name="person-circle" size={24} color={isDark ? '#818cf8' : '#6366f1'} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
              Мой профиль
            </Text>
            <Text style={[styles.headerSubtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              Управление аккаунтом
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}>

        {/* Avatar Card */}
        <Animated.View entering={FadeInDown.duration(400).delay(50)}>
          <View style={[styles.avatarCard, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.9)', borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(226, 232, 240, 0.5)' }]}>
            <View style={styles.avatarSection}>
              <LinearGradient
                colors={['#6366f1', '#a855f7']}
                style={styles.avatar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}>
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </LinearGradient>
              <TouchableOpacity style={[styles.editAvatarButton, { backgroundColor: isDark ? '#6366f1' : '#818cf8' }]}>
                <Ionicons name="camera" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.avatarInfo}>
              <Text style={[styles.userName, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
                {name}
              </Text>
              <View style={[styles.planBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="diamond" size={14} color="#10b981" />
                <Text style={[styles.planText, { color: '#10b981' }]}>Бесплатный план</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Personal Info */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#cbd5e1' : '#475569' }]}>
            Личная информация
          </Text>
          <View style={[styles.card, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.9)', borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(226, 232, 240, 0.5)' }]}>
            <View style={styles.inputGroup}>
              <View style={[styles.inputIconContainer, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.08)' }]}>
                <Ionicons name="person-outline" size={20} color={isDark ? '#818cf8' : '#6366f1'} />
              </View>
              <View style={styles.inputContent}>
                <Text style={[styles.inputLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>Имя</Text>
                <TextInput
                  style={[styles.input, { color: isDark ? '#f1f5f9' : '#0f172a' }]}
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                />
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(226, 232, 240, 0.5)' }]} />

            <View style={styles.inputGroup}>
              <View style={[styles.inputIconContainer, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.08)' }]}>
                <Ionicons name="mail-outline" size={20} color={isDark ? '#818cf8' : '#6366f1'} />
              </View>
              <View style={styles.inputContent}>
                <Text style={[styles.inputLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>Email</Text>
                <TextInput
                  style={[styles.input, { color: isDark ? '#f1f5f9' : '#0f172a' }]}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                />
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(226, 232, 240, 0.5)' }]} />

            <View style={styles.inputGroup}>
              <View style={[styles.inputIconContainer, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.08)' }]}>
                <Ionicons name="call-outline" size={20} color={isDark ? '#818cf8' : '#6366f1'} />
              </View>
              <View style={styles.inputContent}>
                <Text style={[styles.inputLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>Телефон</Text>
                <TextInput
                  style={[styles.input, { color: isDark ? '#f1f5f9' : '#0f172a' }]}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Save Button */}
        <Animated.View entering={FadeInDown.duration(400).delay(150)}>
          <TouchableOpacity onPress={handleSave} activeOpacity={0.8}>
            <LinearGradient
              colors={['#6366f1', '#a855f7']}
              style={styles.saveButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.saveButtonText}>Сохранить изменения</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Danger Zone */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#cbd5e1' : '#475569' }]}>
            Опасная зона
          </Text>
          <TouchableOpacity
            style={[styles.dangerButton, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.08)', borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)' }]}
            onPress={handleDeleteAccount}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
            <Text style={[styles.dangerButtonText, { color: '#ef4444' }]}>
              Удалить аккаунт
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
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
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 24,
  },
  avatarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1.5,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarSection: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1a1a2e',
  },
  avatarInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  planText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  inputIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContent: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
    padding: 0,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 24,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
