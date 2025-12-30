import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
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
  onNavigateToOTP?: (contact: string) => void;
  onNavigateToForgotPassword?: () => void;
}

export function LoginPage({ 
  onLogin, 
  onNavigateToRegister, 
  onNavigateToOTP,
  onNavigateToForgotPassword 
}: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });
  
  const insets = useSafeAreaInsets();
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  
  const contentTranslateY = useSharedValue(0);

  const handleInputFocus = (offset: number) => {
    // Поднимаем форму при фокусе
    contentTranslateY.value = withTiming(-120, { duration: 300 });
  };

  const handleInputBlur = () => {
    // Опускаем форму при потере фокуса
    contentTranslateY.value = withTiming(0, { duration: 300 });
  };

  const handleLogin = async () => {
    let emailError = '';
    let passwordError = '';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
      emailError = 'Введите email';
    } else if (!emailRegex.test(email)) {
      emailError = 'Неверный формат email';
    }

    if (!password) {
      passwordError = 'Введите пароль';
    } else if (password.length < 6) {
      passwordError = 'Минимум 6 символов';
    }

    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError });
      return;
    }

    setIsLoading(true);
    setErrors({ email: '', password: '' });

    try {
      const response = await authApi.login('email', email, password);
      
      if (response.success) {
        console.log('✅ Login successful');
        onLogin();
      } else {
        setErrors({ email: response.error || 'Ошибка входа', password: '' });
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      setErrors({ email: 'Ошибка подключения', password: '' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setErrors({ email: '', password: '' });
    setIsLoading(true);
    
    try {
      if (provider === 'google') {
        console.log('🔵 Начинаю Google вход...');
        await signInWithGoogle();
        console.log('✅ Вход успешен!');
        onLogin();
      } else {
        console.log('🍎 Начинаю Apple вход...');
        const result = await signInWithApple();
        if (result.success) {
          onLogin();
        } else {
          setErrors({ email: result.error || 'Ошибка Apple', password: '' });
        }
      }
    } catch (error: any) {
      console.error('❌ Ошибка социального входа:', error);
      setErrors({ email: error.message || 'Ошибка аутентификации', password: '' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.gradient}>
        <AnimatedGradient
          lightColors={['#fafbfc', '#f8fafc', '#f5f7fa']}
          darkColors={['#124edbff', '#ffffffff', '#124edbff']}
          isDark={isDark}
        />
        <FloatingClouds />

        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <Animated.View
            style={[
              styles.scrollContent,
              { 
                flex: 1,
                justifyContent: 'center',
                paddingHorizontal: 24,
              },
              useAnimatedStyle(() => ({
                transform: [{ translateY: contentTranslateY.value }],
              })),
            ]}
          >
            {/* Header */}
            <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
              <LinearGradient colors={['#60a5fa', '#a78bfa']} style={styles.logo}>
                <Ionicons name="cloud" size={48} color="#ffffff" />
              </LinearGradient>
              <Text style={[styles.title, isDark && styles.titleDark]}>CloudMind</Text>
              <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>Welcome back</Text>
            </Animated.View>

            {/* Card */}
            <View style={[styles.card, isDark && styles.cardDark]}>
              {/* Email Input */}
              <Text style={[styles.label, isDark && styles.labelDark]}>Your Email</Text>
              <Input
                placeholder="example@mail.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                onInputFocus={() => handleInputFocus(120)}
                onInputBlur={handleInputBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
                leftIcon={<Ionicons name="mail-outline" size={20} color={isDark ? '#94a3b8' : '#64748b'} />}
                error={errors.email}
              />

              {/* Password Input */}
              <View style={{ marginTop: 18 }}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, isDark && styles.labelDark]}>Password</Text>
                  <TouchableOpacity onPress={onNavigateToForgotPassword} disabled={isLoading}>
                    <Text style={styles.forgotPassword}>Forgot?</Text>
                  </TouchableOpacity>
                </View>
                <Input
                  placeholder="••••••••"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors({ ...errors, password: '' });
                  }}
                  onInputFocus={() => handleInputFocus(160)}
                  onInputBlur={handleInputBlur}
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

              {/* Sign In Button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.8}
                style={{ marginTop: 28 }}
              >
                <LinearGradient
                  colors={isLoading ? ['#94a3b8', '#64748b'] : ['#3b82f6', '#8b5cf6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.signInButton}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.signInButtonText}>Sign in</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={[styles.dividerLine, isDark && styles.dividerLineDark]} />
                <Text style={[styles.dividerText, isDark && styles.dividerTextDark]}>or</Text>
                <View style={[styles.dividerLine, isDark && styles.dividerLineDark]} />
              </View>

              {/* Social Login Buttons */}
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

              {/* Sign Up Link */}
              <View style={styles.footer}>
                <Text style={[styles.footerText, isDark && styles.footerTextDark]}>Don't have an account? </Text>
                <TouchableOpacity onPress={onNavigateToRegister} disabled={isLoading}>
                  <Text style={styles.registerLink}>Sign up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </TouchableWithoutFeedback>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 48 },
  logo: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 20, shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10 },
  title: { fontSize: 32, fontWeight: '800', color: '#1e293b', marginBottom: 6, letterSpacing: 0.5 },
  titleDark: { color: '#f1f5f9' },
  subtitle: { fontSize: 16, color: '#64748b', fontWeight: '500', letterSpacing: 0.3 },
  subtitleDark: { color: '#94a3b8' },
  card: { 
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.9)' : '#ffffff',
    borderRadius: 24, 
    padding: 28, 
    shadowColor: '#ffffffff', 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 16, 
    elevation: 4 
    
  },
  cardDark: { 
    backgroundColor: Platform.OS === 'ios' ? 'rgba(46, 63, 102, 0.5)' : '#42537aff',
    borderWidth: Platform.OS === 'ios' ? 1 : 0,
    borderColor: Platform.OS === 'ios' ? 'rgba(148, 163, 184, 0.1)' : 'transparent'
  },
  label: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 10, letterSpacing: 0.3, textTransform: 'uppercase' },
  labelDark: { color: '#e2e8f0' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  forgotPassword: { fontSize: 13, fontWeight: '700', color: '#8b5cf6', letterSpacing: 0.2 },
  signInButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  signInButtonText: { fontSize: 16, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1.5, backgroundColor: '#e2e8f0' },
  dividerLineDark: { backgroundColor: 'rgba(148, 163, 184, 0.15)' },
  dividerText: { paddingHorizontal: 16, fontSize: 13, color: '#94a3b8', fontWeight: '600', letterSpacing: 0.3 },
  dividerTextDark: { color: '#64748b' },
  socialButtons: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  socialButton: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 10, 
    backgroundColor: Platform.OS === 'ios' ? '#ffffff' : '#f8f9fa',
    borderWidth: 2, 
    borderColor: '#e2e8f0', 
    borderRadius: 14, 
    paddingVertical: 14,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: Platform.OS === 'ios' ? 0.05 : 0, 
    shadowRadius: 4, 
    elevation: Platform.OS === 'ios' ? 2 : 0
  },
  socialButtonDark: { 
    backgroundColor: Platform.OS === 'ios' ? 'rgba(51, 65, 85, 0.6)' : '#1e293b',
    borderColor: Platform.OS === 'ios' ? 'rgba(148, 163, 184, 0.15)' : '#334155'
  },
  socialButtonText: { fontSize: 15, fontWeight: '700', color: '#3b82f6', letterSpacing: 0.2 },
  socialButtonTextDark: { color: '#60a5fa' },
  appleButton: { backgroundColor: Platform.OS === 'ios' ? '#000000' : '#1a1a1a', borderColor: '#000000' },
  appleButtonText: { fontSize: 15, fontWeight: '700', color: '#ffffff', letterSpacing: 0.2 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' },
  footerText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  footerTextDark: { color: '#94a3b8' },
  registerLink: { fontSize: 14, fontWeight: '800', color: '#8b5cf6', letterSpacing: 0.3 },
});
