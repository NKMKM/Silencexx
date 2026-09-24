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
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight, FadeOutLeft, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/theme';
import { Input } from './ui/Input';
import { api } from '@/services/api';

interface ForgotPasswordPageProps {
  onBack: () => void;
  onPasswordReset: () => void;
  onNavigateToOTP?: (contact: string) => void;
}

type Step = 'contact' | 'emailSent' | 'otp' | 'newPassword';

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
  const isDark = true;

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
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

  const handleSendCode = async () => {
    let error = '';
    if (!contact) {
      error = 'Введите email или номер телефона';
    } else {
      const type = getContactType(contact);
      if (type === 'email' && !isValidEmail(contact)) {
        error = 'Неверный формат email. Используйте только латинские буквы';
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
    const contactType = getContactType(contact);
    
    try {
      if (contactType === 'email') {
        // Отправляем запрос на сброс пароля через email
        const response = await api.post('/auth/request-password-reset', { email: contact });
        
        if (response.data?.success) {
          setStep('emailSent');
        } else {
          setContactError(response.data?.error || 'Ошибка при отправке');
        }
      } else if (contactType === 'phone' && onNavigateToOTP) {
        // Для телефона используем OTP
        onNavigateToOTP(contact);
      }
    } catch (err: any) {
      setContactError(err.response?.data?.error || 'Ошибка при отправке');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = () => {
    let hasError = false;

    if (!newPassword) {
      setPasswordError('Введите новый пароль');
      hasError = true;
    } else if (newPassword.length < 8) {
      setPasswordError('Минимум 8 символов');
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
      <View style={[styles.iconContainer, styles.iconContainerDark]}>
        <Ionicons name="key" size={40} color={Theme.accent.primary} />
      </View>
      <Text style={[styles.stepTitle, styles.stepTitleDark]}>Восстановление пароля</Text>
      <Text style={[styles.stepSubtitle, styles.stepSubtitleDark]}>
        Введите email для получения ссылки на сброс пароля
      </Text>

      <View style={styles.inputContainer}>
        <Input
          placeholder="example@mail.com"
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
              name="mail-outline" 
              size={20} 
              color={Theme.text.secondary} 
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
          colors={isLoading ? ['#94a3b8', '#64748b'] : Theme.accent.gradient as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.button}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.buttonText}>Отправить ссылку</Text>
              <Ionicons name="paper-plane" size={20} color="#ffffff" />
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <Text style={[styles.hint, styles.hintDark]}>
        <Ionicons name="information-circle-outline" size={16} color={Theme.text.secondary} />
        {' '}Ссылка для сброса пароля будет отправлена на email
      </Text>
    </Animated.View>
  );

  const renderEmailSentStep = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
      <View style={[styles.iconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
        <Ionicons name="mail-open" size={40} color="#10b981" />
      </View>
      <Text style={[styles.stepTitle, styles.stepTitleDark]}>Проверьте почту</Text>
      <Text style={[styles.stepSubtitle, styles.stepSubtitleDark]}>
        Мы отправили ссылку для сброса пароля на{'\n'}
        <Text style={{ fontWeight: '600', color: Theme.accent.primary }}>{contact}</Text>
      </Text>

      <View style={[styles.emailSentCard, styles.emailSentCardDark]}>
        <Ionicons name="shield-checkmark" size={24} color={Theme.accent.primary} />
        <Text style={[styles.emailSentText, styles.emailSentTextDark]}>
          Ссылка действительна 1 час. Перейдите по ней для создания нового пароля.
        </Text>
      </View>

      <TouchableOpacity
        onPress={onBack}
        activeOpacity={0.8}
        style={{ marginTop: 24 }}
      >
        <LinearGradient
          colors={Theme.accent.gradient as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Вернуться к входу</Text>
          <Ionicons name="arrow-forward" size={20} color="#ffffff" />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setStep('contact')}
        style={styles.resendButton}
      >
        <Text style={[styles.resendText, styles.resendTextDark]}>
          Не получили письмо? Отправить снова
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderNewPasswordStep = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
      <View style={[styles.iconContainer, styles.iconContainerDark]}>
        <Ionicons name="checkmark-circle" size={40} color="#10b981" />
      </View>
      <Text style={[styles.stepTitle, styles.stepTitleDark]}>Создайте новый пароль</Text>
      <Text style={[styles.stepSubtitle, styles.stepSubtitleDark]}>
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
          leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Theme.text.secondary} />}
          rightIcon={
            <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
              <Ionicons 
                name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} 
                size={20} 
                color={Theme.text.secondary} 
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
            leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Theme.text.secondary} />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons 
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={20} 
                  color={Theme.text.secondary} 
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
          colors={isLoading ? ['#94a3b8', '#64748b'] : Theme.accent.gradient as unknown as [string, string]}
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
      <LinearGradient
        colors={Theme.gradients.main as unknown as [string, string]}
        style={styles.gradient}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={[styles.content, { paddingTop: Math.max(insets.top + 20, 40), paddingBottom: Math.max(insets.bottom + 120, 120) }]}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Theme.text.primary} />
          </TouchableOpacity>

          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
            <LinearGradient colors={Theme.accent.gradient as unknown as [string, string]} style={styles.logo}>
              <Ionicons name="cloud" size={48} color="#ffffff" />
            </LinearGradient>
          </Animated.View>

          <View style={[styles.card, styles.cardDark]}>
            {step === 'contact' && renderContactStep()}
            {step === 'emailSent' && renderEmailSentStep()}
            {step === 'newPassword' && renderNewPasswordStep()}
          </View>
        </View>
        </TouchableWithoutFeedback>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background.primary },
  gradient: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24 },
  backButton: { marginBottom: 20, width: 40, height: 40, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: Theme.accent.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  card: { borderRadius: 24, padding: 24, backgroundColor: Theme.background.card },
  cardDark: { backgroundColor: Theme.background.card, borderWidth: 1, borderColor: Theme.border.primary },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 107, 0, 0.1)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  iconContainerDark: { backgroundColor: 'rgba(255, 107, 0, 0.2)' },
  stepTitle: { fontSize: 24, fontWeight: '700', color: Theme.text.primary, marginBottom: 8, textAlign: 'center' },
  stepTitleDark: { color: Theme.text.primary },
  stepSubtitle: { fontSize: 14, color: Theme.text.secondary, marginBottom: 24, textAlign: 'center', lineHeight: 20 },
  stepSubtitleDark: { color: Theme.text.secondary },
  inputContainer: { marginBottom: 24 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 12 },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  hint: { marginTop: 16, fontSize: 13, color: Theme.text.secondary, textAlign: 'center', flexDirection: 'row', alignItems: 'center' },
  hintDark: { color: Theme.text.secondary },
  emailSentCard: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    gap: 12, 
    backgroundColor: 'rgba(255, 107, 0, 0.08)', 
    padding: 16, 
    borderRadius: 16,
    marginTop: 8,
  },
  emailSentCardDark: { 
    backgroundColor: 'rgba(255, 107, 0, 0.15)' 
  },
  emailSentText: { 
    flex: 1, 
    fontSize: 14, 
    color: Theme.text.secondary, 
    lineHeight: 20 
  },
  emailSentTextDark: { 
    color: Theme.text.secondary 
  },
  resendButton: { 
    marginTop: 16, 
    alignItems: 'center' 
  },
  resendText: { 
    fontSize: 14, 
    color: Theme.accent.primary, 
    textDecorationLine: 'underline' 
  },
  resendTextDark: { 
    color: Theme.accent.secondary 
  },
});
