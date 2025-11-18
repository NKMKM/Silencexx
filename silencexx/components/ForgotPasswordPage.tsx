import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight, FadeOutLeft, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/utils/ThemeContext';
import { Input } from './ui/Input';
import { FloatingClouds } from './FloatingClouds';
import { AnimatedGradient } from './AnimatedGradient';

interface ForgotPasswordPageProps {
  onBack: () => void;
  onPasswordReset: () => void;
  onNavigateToOTP?: (contact: string) => void;
}

type Step = 'contact' | 'otp' | 'newPassword';

export function ForgotPasswordPage({ onBack, onPasswordReset, onNavigateToOTP }: ForgotPasswordPageProps) {
  const [step, setStep] = useState<Step>('contact');
  const [contact, setContact] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [contactError, setContactError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  const insets = useSafeAreaInsets();
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  };

  const getContactType = (value: string): 'email' | 'phone' | 'unknown' => {
    if (value.includes('@')) return 'email';
    if (/^\+?[\d\s()-]+$/.test(value)) return 'phone';
    return 'unknown';
  };

  const handleSendCode = () => {
    let error = '';
    if (!contact) {
      error = 'Введите email или номер телефона';
    } else {
      const type = getContactType(contact);
      if (type === 'email' && !isValidEmail(contact)) {
        error = 'Неверный формат email';
      } else if (type === 'phone' && !isValidPhone(contact)) {
        error = 'Неверный формат номера телефона';
      } else if (type === 'unknown') {
        error = 'Введите корректный email или номер';
      }
    }

    if (error) {
      setContactError(error);
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setContactError('');
      if (onNavigateToOTP) {
        onNavigateToOTP(contact);
      } else {
        setStep('otp');
      }
    }, 1000);
  };

  const handleResetPassword = () => {
    let hasError = false;

    if (!newPassword) {
      setPasswordError('Введите новый пароль');
      hasError = true;
    } else if (newPassword.length < 6) {
      setPasswordError('Минимум 6 символов');
      hasError = true;
    } else {
      setPasswordError('');
    }

    if (!confirmPassword) {
      setConfirmError('Подтвердите пароль');
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      setConfirmError('Пароли не совпадают');
      hasError = true;
    } else {
      setConfirmError('');
    }

    if (hasError) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onPasswordReset();
    }, 1000);
  };

  const renderContactStep = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
      <View style={[styles.iconContainer, isDark && styles.iconContainerDark]}>
        <Ionicons name="key" size={40} color="#8b5cf6" />
      </View>
      <Text style={[styles.stepTitle, isDark && styles.stepTitleDark]}>Восстановление пароля</Text>
      <Text style={[styles.stepSubtitle, isDark && styles.stepSubtitleDark]}>
        Введите email или номер телефона для получения кода восстановления
      </Text>

      <View style={styles.inputContainer}>
        <Input
          placeholder="example@mail.com или +7 900 123-45-67"
          value={contact}
          onChangeText={(text) => {
            setContact(text);
            if (contactError) setContactError('');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          leftIcon={
            <Ionicons 
              name={getContactType(contact) === 'email' ? 'mail-outline' : 'call-outline'} 
              size={20} 
              color={isDark ? '#94a3b8' : '#64748b'} 
            />
          }
          error={contactError}
          editable={!isLoading}
        />
      </View>

      <TouchableOpacity
        onPress={handleSendCode}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isLoading ? ['#94a3b8', '#64748b'] : ['#3b82f6', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.button}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.buttonText}>Отправить код</Text>
              <Ionicons name="paper-plane" size={20} color="#ffffff" />
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <Text style={[styles.hint, isDark && styles.hintDark]}>
        <Ionicons name="information-circle-outline" size={16} color={isDark ? '#94a3b8' : '#64748b'} />
        {' '}Код придет в течение нескольких минут
      </Text>
    </Animated.View>
  );

  const renderNewPasswordStep = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
      <View style={[styles.iconContainer, isDark && styles.iconContainerDark]}>
        <Ionicons name="checkmark-circle" size={40} color="#10b981" />
      </View>
      <Text style={[styles.stepTitle, isDark && styles.stepTitleDark]}>Создайте новый пароль</Text>
      <Text style={[styles.stepSubtitle, isDark && styles.stepSubtitleDark]}>
        Придумайте надежный пароль для защиты аккаунта
      </Text>

      <View style={styles.inputContainer}>
        <Input
          placeholder="Новый пароль"
          value={newPassword}
          onChangeText={(text) => {
            setNewPassword(text);
            if (passwordError) setPasswordError('');
          }}
          secureTextEntry={!showNewPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          leftIcon={<Ionicons name="lock-closed-outline" size={20} color={isDark ? '#94a3b8' : '#64748b'} />}
          rightIcon={
            <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
              <Ionicons 
                name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} 
                size={20} 
                color={isDark ? '#94a3b8' : '#64748b'} 
              />
            </TouchableOpacity>
          }
          error={passwordError}
          editable={!isLoading}
        />

        <View style={{ marginTop: 16 }}>
          <Input
            placeholder="Подтвердите пароль"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (confirmError) setConfirmError('');
            }}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={<Ionicons name="lock-closed-outline" size={20} color={isDark ? '#94a3b8' : '#64748b'} />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons 
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={20} 
                  color={isDark ? '#94a3b8' : '#64748b'} 
                />
              </TouchableOpacity>
            }
            error={confirmError}
            editable={!isLoading}
          />
        </View>
      </View>

      <TouchableOpacity
        onPress={handleResetPassword}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isLoading ? ['#94a3b8', '#64748b'] : ['#10b981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.button}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.buttonText}>Сохранить пароль</Text>
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.gradient}>
        <AnimatedGradient
          lightColors={['rgba(239, 246, 255, 0.95)', 'rgba(250, 245, 255, 0.95)', 'rgba(252, 231, 243, 0.95)']}
          darkColors={['#0f172a', '#581c87', '#0f172a']}
          isDark={isDark}
        />
        <FloatingClouds />

        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={[styles.content, { paddingTop: Math.max(insets.top + 20, 40), paddingBottom: Math.max(insets.bottom + 120, 120) }]}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={isDark ? '#f1f5f9' : '#1e293b'} />
          </TouchableOpacity>

          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
            <LinearGradient colors={['#60a5fa', '#a78bfa']} style={styles.logo}>
              <Ionicons name="cloud" size={48} color="#ffffff" />
            </LinearGradient>
          </Animated.View>

          <View style={[styles.card, isDark && styles.cardDark]}>
            {step === 'contact' && renderContactStep()}
            {step === 'newPassword' && renderNewPasswordStep()}
          </View>
        </View>
        </TouchableWithoutFeedback>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24 },
  backButton: { marginBottom: 20, width: 40, height: 40, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  card: { borderRadius: 24, padding: 24, backgroundColor: 'rgba(255, 255, 255, 0.5)' },
  cardDark: { backgroundColor: 'rgba(30, 41, 59, 0.5)', borderWidth: 0 },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(139, 92, 246, 0.1)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  iconContainerDark: { backgroundColor: 'rgba(139, 92, 246, 0.2)' },
  stepTitle: { fontSize: 24, fontWeight: '700', color: '#1e293b', marginBottom: 8, textAlign: 'center' },
  stepTitleDark: { color: '#f1f5f9' },
  stepSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 24, textAlign: 'center', lineHeight: 20 },
  stepSubtitleDark: { color: '#94a3b8' },
  inputContainer: { marginBottom: 24 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 12 },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  hint: { marginTop: 16, fontSize: 13, color: '#64748b', textAlign: 'center', flexDirection: 'row', alignItems: 'center' },
  hintDark: { color: '#94a3b8' },
});
