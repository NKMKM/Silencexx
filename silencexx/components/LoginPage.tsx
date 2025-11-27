import React, { useState, useEffect } from 'react';
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
import Animated, { FadeInDown, FadeInUp, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/utils/ThemeContext';
import { Input } from './ui/Input';
import { FloatingClouds } from './FloatingClouds';
import { AnimatedGradient } from './AnimatedGradient';
import { signInWithGoogle, signInWithApple } from '@/services/oauth';
import { authApi } from '@/services/api';

interface LoginPageProps {
  onLogin: () => void;
  onNavigateToRegister: () => void;
  onNavigateToOTP: (contact: string) => void;
  onNavigateToForgotPassword?: () => void;
}

type LoginMethod = 'social' | 'email' | 'phone';
type Step = 'method' | 'credentials';

export function LoginPage({ 
  onLogin, 
  onNavigateToRegister, 
  onNavigateToOTP,
  onNavigateToForgotPassword 
}: LoginPageProps) {
  const [step, setStep] = useState<Step>('method');
  const [method, setMethod] = useState<LoginMethod>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ contact: '', password: '' });
  
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

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setErrors({ contact: '', password: '' });
    setIsLoading(true);
    
    try {
      if (provider === 'google') {
        console.log('🔵 Starting Google Sign-In...');
        await signInWithGoogle();
        console.log('✅ Login successful!');
        onLogin();
      } else {
        console.log('🍎 Starting Apple Sign-In...');
        const result = await signInWithApple();
        if (result.success) {
          onLogin();
        } else {
          setErrors({ contact: result.error || 'Apple authentication failed', password: '' });
        }
      }
    } catch (error: any) {
      console.error('❌ Social login error:', error);
      setErrors({ contact: error.message || 'Authentication failed', password: '' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMethodSelect = (selectedMethod: LoginMethod) => {
    setMethod(selectedMethod);
    if (selectedMethod === 'social') return;
    setStep('credentials');
  };

  const handleEmailLogin = async () => {
    let emailError = '';
    let passwordError = '';

    if (!email) {
      emailError = 'Введите email';
    } else if (!isValidEmail(email)) {
      emailError = 'Неверный формат email';
    }

    if (!password) {
      passwordError = 'Введите пароль';
    } else if (password.length < 8) {
      passwordError = 'Минимум 8 символов';
    }

    if (emailError || passwordError) {
      setErrors({ contact: emailError, password: passwordError });
      return;
    }

    setIsLoading(true);
    setErrors({ contact: '', password: '' });

    try {
      const response = await authApi.login('email', email, password);
      
      if (response.success) {
        console.log('✅ Login successful');
        onLogin();
      } else {
        setErrors({ contact: response.error || 'Ошибка входа', password: '' });
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      setErrors({ contact: 'Ошибка подключения к серверу', password: '' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneLogin = async () => {
    let phoneError = '';

    if (!phone) {
      phoneError = 'Введите номер телефона';
    } else if (!isValidPhone(phone)) {
      phoneError = 'Неверный формат номера';
    }

    if (phoneError) {
      setErrors({ ...errors, contact: phoneError });
      return;
    }

    setIsLoading(true);
    setErrors({ contact: '', password: '' });

    try {
      const response = await authApi.login('phone', phone);
      
      if (response.requiresOTP) {
        console.log('📱 OTP sent to phone');
        onNavigateToOTP(phone);
      } else {
        setErrors({ contact: response.error || 'Ошибка отправки OTP', password: '' });
      }
    } catch (error: any) {
      console.error('❌ Phone login error:', error);
      setErrors({ contact: 'Ошибка подключения к серверу', password: '' });
    } finally {
      setIsLoading(false);
    }
  };

  const renderMethodStep = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
      <Text style={[styles.stepTitle, isDark && styles.stepTitleDark]}>Выберите способ входа</Text>

      <View style={styles.socialButtons}>
        <TouchableOpacity
          onPress={() => handleSocialLogin('google')}
          disabled={isLoading}
          style={[styles.socialButton, isDark && styles.socialButtonDark]}
          activeOpacity={0.7}
        >
          <Ionicons name="logo-google" size={24} color="#3b82f6" />
          <Text style={[styles.socialButtonText, isDark && styles.socialButtonTextDark]}>Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleSocialLogin('apple')}
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
          <Text style={[styles.methodSubtitle, isDark && styles.methodSubtitleDark]}>Вход через email и пароль</Text>
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
          <Text style={[styles.methodSubtitle, isDark && styles.methodSubtitleDark]}>Вход через номер телефона и OTP</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={isDark ? '#64748b' : '#94a3b8'} />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderEmailCredentials = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
      <Text style={[styles.stepTitle, isDark && styles.stepTitleDark]}>Вход через Email</Text>
      <Text style={[styles.stepSubtitle, isDark && styles.stepSubtitleDark]}>
        Введите ваш email и пароль
      </Text>

      <View style={styles.inputContainer}>
        <Input
          placeholder="example@mail.com"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (errors.contact) setErrors({ ...errors, contact: '' });
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoFocus
          leftIcon={<Ionicons name="mail-outline" size={20} color={isDark ? '#94a3b8' : '#64748b'} />}
          error={errors.contact}
        />

        <View style={{ marginTop: 16 }}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, isDark && styles.labelDark]}>Пароль</Text>
            <TouchableOpacity onPress={onNavigateToForgotPassword} disabled={isLoading}>
              <Text style={styles.forgotPassword}>Забыли?</Text>
            </TouchableOpacity>
          </View>
          <Input
            placeholder="Введите пароль"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors({ ...errors, password: '' });
            }}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
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
        </View>
      </View>

      <TouchableOpacity
        onPress={handleEmailLogin}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isLoading ? ['#94a3b8', '#64748b'] : ['#3b82f6', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.loginButton}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.loginButtonText}>Войти</Text>
              <Ionicons name="arrow-forward" size={20} color="#ffffff" />
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderPhoneCredentials = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
      <Text style={[styles.stepTitle, isDark && styles.stepTitleDark]}>Вход через телефон</Text>
      <Text style={[styles.stepSubtitle, isDark && styles.stepSubtitleDark]}>
        Введите номер телефона для получения кода
      </Text>

      <View style={styles.inputContainer}>
        <Input
          placeholder="+7 900 123-45-67"
          value={phone}
          onChangeText={(text) => {
            setPhone(text);
            if (errors.contact) setErrors({ ...errors, contact: '' });
          }}
          keyboardType="phone-pad"
          autoFocus
          leftIcon={<Ionicons name="call-outline" size={20} color={isDark ? '#94a3b8' : '#64748b'} />}
          error={errors.contact}
        />
      </View>

      <TouchableOpacity
        onPress={handlePhoneLogin}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isLoading ? ['#94a3b8', '#64748b'] : ['#3b82f6', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.loginButton}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.loginButtonText}>Получить код</Text>
              <Ionicons name="arrow-forward" size={20} color="#ffffff" />
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
          {step === 'credentials' && (
            <TouchableOpacity 
              onPress={() => setStep('method')} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={isDark ? '#f1f5f9' : '#1e293b'} />
            </TouchableOpacity>
          )}

          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
            <LinearGradient colors={['#60a5fa', '#a78bfa']} style={styles.logo}>
              <Ionicons name="cloud" size={48} color="#ffffff" />
            </LinearGradient>
            <Text style={[styles.title, isDark && styles.titleDark]}>CloudMind</Text>
            <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>Ваш путь к внутреннему покою</Text>
          </Animated.View>

          <View style={[styles.card, isDark && styles.cardDark]}>
            {step === 'method' && renderMethodStep()}
            {step === 'credentials' && method === 'email' && renderEmailCredentials()}
            {step === 'credentials' && method === 'phone' && renderPhoneCredentials()}
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, isDark && styles.footerTextDark]}>Нет аккаунта? </Text>
            <TouchableOpacity onPress={onNavigateToRegister} disabled={isLoading}>
              <Text style={styles.registerLink}>Зарегистрироваться</Text>
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
  backButton: { marginBottom: 20, width: 44, height: 44, justifyContent: 'center', borderRadius: 22, backgroundColor: 'rgba(100, 116, 139, 0.1)' },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 20, shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10 },
  title: { fontSize: 36, fontWeight: '800', color: '#1e293b', marginBottom: 6, letterSpacing: 0.5 },
  titleDark: { color: '#f1f5f9' },
  subtitle: { fontSize: 16, color: '#64748b', fontWeight: '500', letterSpacing: 0.2 },
  subtitleDark: { color: '#94a3b8' },
  card: { borderRadius: 28, padding: 28, backgroundColor: 'rgba(255, 255, 255, 0.6)', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4 },
  cardDark: { backgroundColor: 'rgba(30, 41, 59, 0.6)', borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.1)' },
  stepTitle: { fontSize: 24, fontWeight: '800', color: '#1e293b', marginBottom: 10, textAlign: 'center', letterSpacing: 0.3 },
  stepTitleDark: { color: '#f1f5f9' },
  stepSubtitle: { fontSize: 15, color: '#64748b', marginBottom: 28, textAlign: 'center', lineHeight: 22 },
  stepSubtitleDark: { color: '#94a3b8' },
  socialButtons: { flexDirection: 'row', gap: 14, marginBottom: 24 },
  socialButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 16, paddingVertical: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  socialButtonDark: { backgroundColor: 'rgba(51, 65, 85, 0.6)', borderColor: 'rgba(148, 163, 184, 0.15)' },
  socialButtonText: { fontSize: 16, fontWeight: '700', color: '#334155', letterSpacing: 0.2 },
  socialButtonTextDark: { color: '#e2e8f0' },
  appleButton: { backgroundColor: '#000000', borderColor: '#000000' },
  appleButtonText: { fontSize: 16, fontWeight: '700', color: '#ffffff', letterSpacing: 0.2 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1.5, backgroundColor: '#e2e8f0' },
  dividerLineDark: { backgroundColor: 'rgba(148, 163, 184, 0.15)' },
  dividerText: { paddingHorizontal: 16, fontSize: 14, color: '#94a3b8', fontWeight: '600', letterSpacing: 0.3 },
  dividerTextDark: { color: '#64748b' },
  methodButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 20, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  methodButtonDark: { backgroundColor: 'rgba(51, 65, 85, 0.6)', borderColor: 'rgba(148, 163, 184, 0.15)' },
  methodIconContainer: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  methodTextContainer: { flex: 1 },
  methodTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginBottom: 3, letterSpacing: 0.2 },
  methodTitleDark: { color: '#f1f5f9' },
  methodSubtitle: { fontSize: 14, color: '#64748b', lineHeight: 18 },
  methodSubtitleDark: { color: '#94a3b8' },
  inputContainer: { marginBottom: 24 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  label: { fontSize: 15, fontWeight: '700', color: '#334155', letterSpacing: 0.2 },
  labelDark: { color: '#e2e8f0' },
  forgotPassword: { fontSize: 14, fontWeight: '700', color: '#8b5cf6', letterSpacing: 0.2 },
  loginButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 16, shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  loginButtonText: { fontSize: 17, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 28 },
  footerText: { fontSize: 15, color: '#64748b', fontWeight: '500' },
  footerTextDark: { color: '#94a3b8' },
  registerLink: { fontSize: 15, fontWeight: '800', color: '#8b5cf6', letterSpacing: 0.3 },
});
