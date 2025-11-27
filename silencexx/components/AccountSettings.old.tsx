import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/utils/ThemeContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Separator } from './ui/Separator';
import { FloatingClouds } from './FloatingClouds';

interface AccountSettingsProps {
  onNavigateBack?: () => void;
}

export function AccountSettings({ onNavigateBack }: AccountSettingsProps) {
  const router = useRouter();
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  const insets = useSafeAreaInsets();
  
  const [name, setName] = useState('Иван Иванов');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [passwordAttempts, setPasswordAttempts] = useState(0);
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [showPhoneConfirm, setShowPhoneConfirm] = useState(false);
  const [tempEmail, setTempEmail] = useState('');
  const [tempPhone, setTempPhone] = useState('');

  const handleNavigateBack = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      router.back();
    }
  };

  const handleSaveProfile = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      Alert.alert('Успех', 'Профиль обновлен!');
    }, 1000);
  };

  const handleChangePassword = () => {
    // Проверка текущего пароля (в реальном приложении - запрос к API)
    const correctPassword = 'password123'; // Для демо
    
    if (currentPassword !== correctPassword) {
      const newAttempts = passwordAttempts + 1;
      setPasswordAttempts(newAttempts);
      
      if (newAttempts >= 3) {
        Alert.alert(
          'Забыли пароль?',
          'Вы ввели неверный пароль 3 раза. Хотите восстановить пароль?',
          [
            { text: 'Отмена', style: 'cancel', onPress: () => setPasswordAttempts(0) },
            {
              text: 'Восстановить',
              onPress: () => {
                setPasswordAttempts(0);
                Alert.alert('Восстановление пароля', 'Ссылка для восстановления отправлена на ваш email');
              },
            },
          ]
        );
        return;
      }
      
      Alert.alert('Ошибка', `Неверный текущий пароль. Попыток осталось: ${3 - newAttempts}`);
      return;
    }
    
    setPasswordAttempts(0);
    
    if (newPassword !== confirmPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Ошибка', 'Пароль должен содержать минимум 8 символов');
      return;
    }
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Успех', 'Пароль изменен!');
    }, 1000);
  };

  const handleEmailChange = (newEmail: string) => {
    setTempEmail(newEmail);
    setShowEmailConfirm(true);
  };

  const confirmEmailChange = () => {
    setEmail(tempEmail);
    setShowEmailConfirm(false);
    Alert.alert('Успех', 'Email изменён. Подтверждение отправлено на новый адрес.');
  };

  const handlePhoneChange = (newPhone: string) => {
    setTempPhone(newPhone);
    setShowPhoneConfirm(true);
  };

  const confirmPhoneChange = () => {
    setPhone(tempPhone);
    setShowPhoneConfirm(false);
    Alert.alert('Успех', 'Телефон изменён. SMS-код отправлен на новый номер.');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Вы уверены?',
      'Это действие нельзя отменить. Все ваши данные, включая дневники, настроения и настройки будут удалены навсегда.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить аккаунт',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Аккаунт удален', 'Ваш аккаунт был удален');
          },
        },
      ]
    );
  };

  const getInitials = () => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <FloatingClouds />

      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={handleNavigateBack}
          style={[styles.backButton, isDark && styles.backButtonDark]}
        >
          <Ionicons name="arrow-back" size={20} color={isDark ? '#a78bfa' : '#8b5cf6'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
          Настройки аккаунта
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <LinearGradient
            colors={isDark ? ['rgba(55, 65, 81, 0.5)', 'rgba(31, 41, 55, 0.5)'] : ['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.5)']}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <Ionicons name="person" size={20} color={isDark ? '#818cf8' : '#6366f1'} />
              <Text style={[styles.cardTitle, isDark && styles.cardTitleDark, { fontWeight: '700' }]}>Профиль</Text>
            </View>

            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarWrapper}>
                <LinearGradient
                  colors={['#6366f1', '#a855f7']}
                  style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials()}</Text>
                </LinearGradient>
                <TouchableOpacity style={styles.cameraButton}>
                  <LinearGradient
                    colors={['#6366f1', '#a855f7']}
                    style={styles.cameraGradient}>
                    <Ionicons name="camera" size={16} color="#ffffff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              <View>
                <Text style={[styles.avatarName, isDark && styles.avatarNameDark]}>{name}</Text>
                <Text style={[styles.avatarPlan, isDark && styles.avatarPlanDark]}>
                  Бесплатный план
                </Text>
              </View>
            </View>

            <View style={styles.formContainer}>
              <Input
                label="Имя"
                value={name}
                onChangeText={setName}
                containerStyle={styles.input}
              />
              <Input
                label="Email"
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="mail-outline"
                containerStyle={styles.input}
              />
              <Input
                label="Телефон"
                value={phone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                leftIcon="call-outline"
                containerStyle={styles.input}
              />
            </View>

            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={isSaving}
              style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#8b5cf6', '#ec4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {isSaving ? (
                  <>
                    <ActivityIndicator color="#ffffff" size="small" />
                    <Text style={styles.submitText}>Сохранение...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color="#ffffff" />
                    <Text style={styles.submitText}>Сохранить изменения</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* Security Section */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <LinearGradient
            colors={isDark ? ['rgba(55, 65, 81, 0.5)', 'rgba(31, 41, 55, 0.5)'] : ['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.5)']}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <Ionicons name="shield-checkmark" size={20} color={isDark ? '#60a5fa' : '#3b82f6'} />
              <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]}>Безопасность</Text>
            </View>

            <View style={styles.formContainer}>
              <Input
                label="Текущий пароль"
                placeholder="••••••••"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
                rightIcon={
                  <Ionicons
                    name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={isDark ? '#9ca3af' : '#64748b'}
                  />
                }
                onRightIconPress={() => setShowCurrentPassword(!showCurrentPassword)}
                containerStyle={styles.input}
              />

              <View style={styles.separator} />

              <Input
                label="Новый пароль"
                placeholder="••••••••"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                rightIcon={
                  <Ionicons
                    name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={isDark ? '#9ca3af' : '#64748b'}
                  />
                }
                onRightIconPress={() => setShowNewPassword(!showNewPassword)}
                containerStyle={styles.input}
              />
              <Text style={[styles.hint, isDark && styles.hintDark]}>
                Минимум 8 символов
              </Text>

              <Input
                label="Подтвердите новый пароль"
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                rightIcon={
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={isDark ? '#9ca3af' : '#64748b'}
                  />
                }
                onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
                containerStyle={styles.input}
              />
            </View>

            <TouchableOpacity
              onPress={handleChangePassword}
              disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
              style={[styles.submitButton, (isSaving || !currentPassword || !newPassword || !confirmPassword) && styles.submitButtonDisabled]}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#3b82f6', '#06b6d4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                <Ionicons name="lock-closed" size={20} color="#ffffff" />
                <Text style={styles.submitText}>Изменить пароль</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* Connected Accounts */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <LinearGradient
            colors={isDark ? ['rgba(55, 65, 81, 0.5)', 'rgba(31, 41, 55, 0.5)'] : ['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.5)']}
            style={styles.card}
          >
            <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]}>
              Подключенные аккаунты
            </Text>

            <View style={styles.connectedAccounts}>
              {/* Google Account */}
              <View style={[styles.connectedAccount, isDark && styles.connectedAccountDark]}>
                <View style={styles.accountInfo}>
                  <View style={styles.accountIcon}>
                    <Ionicons name="mail" size={20} color="#3b82f6" />
                  </View>
                  <View>
                    <Text style={[styles.accountName, isDark && styles.accountNameDark]}>
                      Google
                    </Text>
                    <Text style={[styles.accountEmail, isDark && styles.accountEmailDark]}>
                      {email}
                    </Text>
                  </View>
                </View>
                <View style={styles.connectedBadge}>
                  <Text style={styles.connectedBadgeText}>Подключено</Text>
                </View>
              </View>

              {/* Apple Account */}
              <View style={[styles.connectedAccount, styles.disconnectedAccount, isDark && styles.disconnectedAccountDark]}>
                <View style={styles.accountInfo}>
                  <View style={[styles.accountIcon, styles.appleIcon]}>
                    <Ionicons name="logo-apple" size={24} color="#ffffff" />
                  </View>
                  <View>
                    <Text style={[styles.accountName, isDark && styles.accountNameDark]}>
                      Apple ID
                    </Text>
                    <Text style={[styles.accountDisconnected, isDark && styles.accountDisconnectedDark]}>
                      Не подключено
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={[styles.connectButton, isDark && styles.connectButtonDark]}>
                  <Text style={[styles.connectButtonText, isDark && styles.connectButtonTextDark]}>
                    Подключить
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Danger Zone */}
        <Animated.View entering={FadeInDown.duration(400).delay(400)}>
          <LinearGradient
            colors={['rgba(254, 226, 226, 0.7)', 'rgba(254, 226, 226, 0.5)']}
            style={[styles.card, styles.dangerCard]}
          >
            <Text style={styles.dangerTitle}>Опасная зона</Text>
            
            <TouchableOpacity
              onPress={handleDeleteAccount}
              style={styles.deleteButton}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#dc2626', '#b91c1c']}
                style={styles.deleteGradient}
              >
                <Ionicons name="trash-outline" size={20} color="#ffffff" />
                <Text style={styles.deleteText}>Удалить аккаунт</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </ScrollView>

      {/* Email Confirmation Modal */}
      <Modal
        visible={showEmailConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEmailConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <Ionicons name="mail" size={48} color={isDark ? '#818cf8' : '#6366f1'} />
            <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
              Подтвердите изменение email
            </Text>
            <Text style={[styles.modalText, isDark && styles.modalTextDark]}>
              Новый email: {tempEmail}
            </Text>
            <Text style={[styles.modalSubtext, isDark && styles.modalSubtextDark]}>
              На новый адрес будет отправлено письмо с подтверждением
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowEmailConfirm(false)}
                style={[styles.modalButton, styles.modalButtonCancel]}
              >
                <Text style={styles.modalButtonCancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmEmailChange}
                style={styles.modalButton}
              >
                <LinearGradient
                  colors={['#3b82f6', '#8b5cf6']}
                  style={styles.modalButtonGradient}
                >
                  <Text style={styles.modalButtonText}>Подтвердить</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Phone Confirmation Modal */}
      <Modal
        visible={showPhoneConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhoneConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <Ionicons name="call" size={48} color={isDark ? '#818cf8' : '#6366f1'} />
            <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
              Подтвердите изменение телефона
            </Text>
            <Text style={[styles.modalText, isDark && styles.modalTextDark]}>
              Новый номер: {tempPhone}
            </Text>
            <Text style={[styles.modalSubtext, isDark && styles.modalSubtextDark]}>
              На новый номер будет отправлен SMS-код подтверждения
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowPhoneConfirm(false)}
                style={[styles.modalButton, styles.modalButtonCancel]}
              >
                <Text style={styles.modalButtonCancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmPhoneChange}
                style={styles.modalButton}
              >
                <LinearGradient
                  colors={['#3b82f6', '#8b5cf6']}
                  style={styles.modalButtonGradient}
                >
                  <Text style={styles.modalButtonText}>Подтвердить</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    gap: 12,
  },
  headerDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  backButtonDark: {
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  headerTitleDark: {
    color: '#f1f5f9',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  cardTitleDark: {
    color: '#f1f5f9',
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cameraGradient: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  avatarNameDark: {
    color: '#f1f5f9',
  },
  avatarPlan: {
    fontSize: 12,
    color: '#64748b',
  },
  avatarPlanDark: {
    color: '#94a3b8',
  },
  formContainer: {
    gap: 16,
  },
  input: {
    marginBottom: 0,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  hint: {
    fontSize: 11,
    color: '#64748b',
    marginTop: -8,
  },
  hintDark: {
    color: '#94a3b8',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  connectedAccounts: {
    gap: 12,
  },
  connectedAccount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  connectedAccountDark: {
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderColor: 'rgba(55, 65, 81, 0.5)',
  },
  disconnectedAccount: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  disconnectedAccountDark: {
    backgroundColor: 'rgba(31, 41, 55, 0.3)',
    borderColor: 'rgba(55, 65, 81, 0.3)',
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleIcon: {
    backgroundColor: '#000000',
  },
  accountName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  accountNameDark: {
    color: '#f1f5f9',
  },
  accountEmail: {
    fontSize: 11,
    color: '#64748b',
  },
  accountEmailDark: {
    color: '#94a3b8',
  },
  accountDisconnected: {
    fontSize: 11,
    color: '#64748b',
  },
  accountDisconnectedDark: {
    color: '#64748b',
  },
  connectedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  connectedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16a34a',
  },
  connectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  connectButtonDark: {
    borderColor: '#374151',
    backgroundColor: '#1f2937',
  },
  connectButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  connectButtonTextDark: {
    color: '#9ca3af',
  },
  dangerCard: {
    borderColor: 'rgba(220, 38, 38, 0.2)',
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#991b1b',
  },
  deleteButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  deleteGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  deleteText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalContentDark: {
    backgroundColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  modalTitleDark: {
    color: '#e2e8f0',
  },
  modalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
    textAlign: 'center',
  },
  modalTextDark: {
    color: '#818cf8',
  },
  modalSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  modalSubtextDark: {
    color: '#94a3b8',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalButtonCancel: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  modalButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
