import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
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
import { signInWithGoogle, signInWithApple } from '@/services/oauth';
import { authApi } from '@/services/api';

interface RegisterPageProps {
  onRegister: () => void;
  onNavigateToLogin: () => void;
  onNavigateToOTP?: (contact: string) => void;
}

type RegisterMethod = 'social' | 'email' | 'phone';
type Step = 'method' | 'contact' | 'name' | 'password' | 'otp';

export function RegisterPage({ onRegister, onNavigateToLogin, onNavigateToOTP }: RegisterPageProps) {
  const [step, setStep] = useState<Step>('method');
  const [method, setMethod] = useState<RegisterMethod>('email');
  const [contact, setContact] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ contact: '', name: '', password: '', confirmPassword: '' });

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

  const handleSocialRegister = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    try {
      if (provider === 'google') {
        const result = await signInWithGoogle();
        if (result.success) {
          onRegister();
        }
      } else {
        const result = await signInWithApple();
        if (result.success) {
          onRegister();
        }
      }
    } catch (error) {
      console.error('Social registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMethodSelect = (selectedMethod: RegisterMethod) => {
    setMethod(selectedMethod);
    if (selectedMethod === 'social') {
      return;
    }
    setStep('contact');
  };

  const handleContactNext = () => {
    let error = '';
    if (!contact) {
      error = method === 'email' ? 'Введите email' : 'Введите номер телефона';
    } else if (method === 'email' && !isValidEmail(contact)) {
      error = 'Неверный формат email';
    } else if (method === 'phone' && !isValidPhone(contact)) {
      error = 'Неверный формат номера телефона';
    }

    if (error) {
      setErrors({ ...errors, contact: error });
      return;
    }

    setErrors({ ...errors, contact: '' });
    setStep('name');
  };

  const handleNameNext = () => {
    if (!name || name.trim().length < 2) {
      setErrors({ ...errors, name: 'Введите имя (минимум 2 символа)' });
      return;
    }
    setErrors({ ...errors, name: '' });
    setStep('password');
  };

  const handlePasswordNext = async () => {
    let passwordError = '';
    let confirmError = '';

    if (!password) {
      passwordError = 'Введите пароль';
    } else if (password.length < 8) {
      passwordError = 'Минимум 8 символов';
    } else if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      passwordError = 'Пароль должен содержать буквы и цифры';
    } else if (/[а-яА-ЯёЁ]/.test(password)) {
      passwordError = 'Только латиница, без кириллицы';
    }

    if (!confirmPassword) {
      confirmError = 'Подтвердите пароль';
    } else if (password !== confirmPassword) {
      confirmError = 'Пароли не совпадают';
    }

    if (passwordError || confirmError) {
      setErrors({ ...errors, password: passwordError, confirmPassword: confirmError });
      return;
    }

    setErrors({ ...errors, password: '', confirmPassword: '' });

    if (method === 'phone') {
      if (onNavigateToOTP) {
        onNavigateToOTP(contact);
      }
    } else {
      await handleFinalRegister();
    }
  };

  const handleFinalRegister = async () => {
    setIsLoading(true);

    try {
      console.log('📝 Starting registration:', {
        method,
        contact,
        name,
        passwordLength: password.length
      });

      const response = await authApi.register(
        method as 'email' | 'phone',
        contact,
        name,
        password
      );
      
      console.log('📡 Server response:', response);
      
      if (response.success) {
        console.log('✅ Registration successful');
        
        if (response.requiresOTP) {
          // Для телефона переходим к OTP
          console.log('📱 OTP required');
          if (onNavigateToOTP) {
            onNavigateToOTP(contact);
          }
        } else {
          // Для email сразу входим
          onRegister();
        }
      } else {
        console.error('❌ Registration failed:', response.error);
        
        // Определяем какое поле показать ошибку
        if (response.error?.includes('email') || response.error?.includes('телефон') || response.error?.includes('существует')) {
          setErrors({ ...errors, contact: response.error });
        } else if (response.error?.includes('password') || response.error?.includes('пароль')) {
          setErrors({ ...errors, password: response.error });
        } else {
          setErrors({ ...errors, contact: response.error || 'Ошибка регистрации' });
        }
      }
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setErrors({ ...errors, contact: error.response?.data?.error || 'Ошибка подключения к серверу' });
    } finally {
      setIsLoading(false);
    }
  };

  const getProgress = () => {
    const steps = method === 'phone' ? ['method', 'contact', 'name', 'password', 'otp'] : ['method', 'contact', 'name', 'password'];
    const currentIndex = steps.indexOf(step);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  const renderProgressBar = () => {
    if (step === 'method') return null;

    return (
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, isDark && styles.progressBarDark]}>
          <LinearGradient
            colors={['#3b82f6', '#8b5cf6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${getProgress()}%` }]}
          />
        </View>
      </View>
    );
  };

  const renderMethodStep = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
      <Text style={[styles.stepTitle, isDark && styles.stepTitleDark]}>Выберите способ регистрации</Text>

      <View style={styles.socialButtons}>
        <TouchableOpacity
          onPress={() => handleSocialRegister('google')}
          disabled={isLoading}
          style={[styles.socialButton, isDark && styles.socialButtonDark]}
          activeOpacity={0.7}
        >
          <Ionicons name="logo-google" size={24} color="#3b82f6" />
          <Text style={[styles.socialButtonText, isDark && styles.socialButtonTextDark]}>Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleSocialRegister('apple')}
          disabled={isLoading}
          style={[styles.socialButton, styles.appleButton]}
          activeOpacity={0.7}
        >
          <Ionicons name="logo-apple" size={24} color="#ffffff" />
          <Text style={styles.appleButtonText}>Apple</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider}>
        <View style={[styles.dividerLine, isDark && styles.dividerLineDark]} />
        <Text style={[styles.dividerText, isDark && styles.dividerTextDark]}>или</Text>
        <View style={[styles.dividerLine, isDark && styles.dividerLineDark]} />
      </View>

      <TouchableOpacity
        onPress={() => handleMethodSelect('email')}
        style={[styles.methodButton, isDark && styles.methodButtonDark]}
        activeOpacity={0.7}
      >
        <View style={[styles.methodIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
          <Ionicons name="mail" size={24} color="#3b82f6" />
        </View>
        <View style={styles.methodTextContainer}>
          <Text style={[styles.methodTitle, isDark && styles.methodTitleDark]}>Email</Text>
          <Text style={[styles.methodSubtitle, isDark && styles.methodSubtitleDark]}>Регистрация через email</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={isDark ? '#64748b' : '#94a3b8'} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handleMethodSelect('phone')}
        style={[styles.methodButton, isDark && styles.methodButtonDark]}
        activeOpacity={0.7}
      >
        <View style={[styles.methodIconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
          <Ionicons name="call" size={24} color="#8b5cf6" />
        </View>
        <View style={styles.methodTextContainer}>
          <Text style={[styles.methodTitle, isDark && styles.methodTitleDark]}>Телефон</Text>
          <Text style={[styles.methodSubtitle, isDark && styles.methodSubtitleDark]}>Регистрация через номер телефона</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={isDark ? '#64748b' : '#94a3b8'} />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderContactStep = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
      <Text style={[styles.stepTitle, isDark && styles.stepTitleDark]}>
        {method === 'email' ? 'Введите ваш email' : 'Введите номер телефона'}
      </Text>
      <Text style={[styles.stepSubtitle, isDark && styles.stepSubtitleDark]}>
        {method === 'email' 
          ? 'Мы отправим подтверждение на этот адрес' 
          : 'Мы отправим код подтверждения на этот номер'}
      </Text>

      <View style={styles.inputContainer}>
        <Input
          placeholder={method === 'email' ? 'example@mail.com' : '+7 900 123-45-67'}
          value={contact}
          onChangeText={(text) => {
            setContact(text);
            if (errors.contact) setErrors({ ...errors, contact: '' });
          }}
          keyboardType={method === 'email' ? 'email-address' : 'phone-pad'}
          autoCapitalize="none"
          autoFocus
          leftIcon={
            <Ionicons 
              name={method === 'email' ? 'mail-outline' : 'call-outline'} 
              size={20} 
              color={isDark ? '#94a3b8' : '#64748b'} 
            />
          }
          error={errors.contact}
        />
      </View>

      <TouchableOpacity
        onPress={handleContactNext}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#3b82f6', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.nextButton}
        >
          <Text style={styles.nextButtonText}>Далее</Text>
          <Ionicons name="arrow-forward" size={20} color="#ffffff" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderNameStep = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
      <Text style={[styles.stepTitle, isDark && styles.stepTitleDark]}>Как вас зовут?</Text>
      <Text style={[styles.stepSubtitle, isDark && styles.stepSubtitleDark]}>
        Это имя будет отображаться в вашем профиле
      </Text>

      <View style={styles.inputContainer}>
        <Input
          placeholder="Введите ваше имя"
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (errors.name) setErrors({ ...errors, name: '' });
          }}
          autoCapitalize="words"
          autoFocus
          leftIcon={<Ionicons name="person-outline" size={20} color={isDark ? '#94a3b8' : '#64748b'} />}
          error={errors.name}
        />
      </View>

      <TouchableOpacity
        onPress={handleNameNext}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#3b82f6', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.nextButton}
        >
          <Text style={styles.nextButtonText}>Далее</Text>
          <Ionicons name="arrow-forward" size={20} color="#ffffff" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderPasswordStep = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
      <Text style={[styles.stepTitle, isDark && styles.stepTitleDark]}>Создайте пароль</Text>
      <Text style={[styles.stepSubtitle, isDark && styles.stepSubtitleDark]}>
        Минимум 6 символов для защиты аккаунта
      </Text>

      <View style={styles.inputContainer}>
        <Input
          placeholder="Введите пароль"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (errors.password) setErrors({ ...errors, password: '' });
          }}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoFocus
          leftIcon={<Ionicons name="lock-closed-outline" size={20} color={isDark ? '#94a3b8' : '#64748b'} />}
          rightIcon={
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons 
                name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                size={20} 
                color={isDark ? '#94a3b8' : '#64748b'} 
              />
            </TouchableOpacity>
          }
          error={errors.password}
        />

        <View style={{ marginTop: 16 }}>
          <Input
            placeholder="Подтвердите пароль"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
            }}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
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
            error={errors.confirmPassword}
          />
        </View>
      </View>

      <TouchableOpacity
        onPress={handlePasswordNext}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isLoading ? ['#94a3b8', '#64748b'] : ['#3b82f6', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.nextButton}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {method === 'phone' ? 'Получить код' : 'Зарегистрироваться'}
              </Text>
              <Ionicons name={method === 'phone' ? 'arrow-forward' : 'checkmark-circle'} size={20} color="#ffffff" />
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
          <ScrollView 
            contentContainerStyle={[
              styles.scrollContent,
              { 
                paddingTop: Math.max(insets.top + 20, 40), 
                paddingBottom: Math.max(insets.bottom + 200, 200) 
              }
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
          {step !== 'method' && (
            <TouchableOpacity 
              onPress={() => {
                if (step === 'contact') setStep('method');
                else if (step === 'name') setStep('contact');
                else if (step === 'password') setStep('name');
              }} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={isDark ? '#f1f5f9' : '#1e293b'} />
            </TouchableOpacity>
          )}

          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
            <LinearGradient colors={['#60a5fa', '#a78bfa']} style={styles.logo}>
              <Ionicons name="cloud" size={48} color="#ffffff" />
            </LinearGradient>
            <Text style={[styles.title, isDark && styles.titleDark]}>Регистрация</Text>
            <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>Создайте аккаунт CloudMind</Text>
          </Animated.View>

          {renderProgressBar()}

          <View style={[styles.card, isDark && styles.cardDark]}>
            {step === 'method' && renderMethodStep()}
            {step === 'contact' && renderContactStep()}
            {step === 'name' && renderNameStep()}
            {step === 'password' && renderPasswordStep()}
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, isDark && styles.footerTextDark]}>Уже есть аккаунт? </Text>
            <TouchableOpacity onPress={onNavigateToLogin}>
              <Text style={styles.loginLink}>Войти</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        </TouchableWithoutFeedback>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  backButton: { marginBottom: 16, width: 40, height: 40, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  titleDark: { color: '#f1f5f9' },
  subtitle: { fontSize: 15, color: '#64748b' },
  subtitleDark: { color: '#94a3b8' },
  progressContainer: { marginBottom: 24 },
  progressBar: { height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, overflow: 'hidden' },
  progressBarDark: { backgroundColor: 'rgba(148, 163, 184, 0.2)' },
  progressFill: { height: '100%', borderRadius: 2 },
  card: { borderRadius: 24, padding: 24, backgroundColor: 'rgba(255, 255, 255, 0.5)' },
  cardDark: { backgroundColor: 'rgba(30, 41, 59, 0.5)', borderWidth: 0 },
  stepTitle: { fontSize: 22, fontWeight: '700', color: '#1e293b', marginBottom: 8, textAlign: 'center' },
  stepTitleDark: { color: '#f1f5f9' },
  stepSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 24, textAlign: 'center' },
  stepSubtitleDark: { color: '#94a3b8' },
  socialButtons: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  socialButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, paddingVertical: 14 },
  socialButtonDark: { backgroundColor: 'rgba(51, 65, 85, 0.5)', borderColor: 'rgba(148, 163, 184, 0.2)' },
  socialButtonText: { fontSize: 15, fontWeight: '600', color: '#334155' },
  socialButtonTextDark: { color: '#e2e8f0' },
  appleButton: { backgroundColor: '#000000', borderColor: '#000000' },
  appleButtonText: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dividerLineDark: { backgroundColor: 'rgba(148, 163, 184, 0.2)' },
  dividerText: { paddingHorizontal: 12, fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  dividerTextDark: { color: '#64748b' },
  methodButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, marginBottom: 12 },
  methodButtonDark: { backgroundColor: 'rgba(51, 65, 85, 0.5)', borderColor: 'rgba(148, 163, 184, 0.2)' },
  methodIconContainer: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  methodTextContainer: { flex: 1 },
  methodTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  methodTitleDark: { color: '#f1f5f9' },
  methodSubtitle: { fontSize: 13, color: '#64748b' },
  methodSubtitleDark: { color: '#94a3b8' },
  inputContainer: { marginBottom: 24 },
  nextButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 12 },
  nextButtonText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: 14, color: '#64748b' },
  footerTextDark: { color: '#94a3b8' },
  loginLink: { fontSize: 14, fontWeight: '700', color: '#8b5cf6' },
});
