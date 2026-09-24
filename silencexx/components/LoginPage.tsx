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
import { Input } from './ui/Input';
import { signInWithGoogle, signInWithApple } from '@/services/oauth';
import { authApi } from '@/services/api';
import { Theme } from '@/constants/theme';

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
  const isDark = true; // Force dark theme
  
  const contentTranslateY = useSharedValue(0);

  const handleInputFocus = (offset: number) => {
    contentTranslateY.value = withTiming(-120, { duration: 300 });
  };

  const handleInputBlur = () => {
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <Animated.View
          style={[
            styles.scrollContent,
            { 
              flex: 1,
              justifyContent: 'center',
              paddingHorizontal: Theme.spacing.xl,
            },
            useAnimatedStyle(() => ({
              transform: [{ translateY: contentTranslateY.value }],
            })),
          ]}
          >
            {/* AURORA Header */}
            <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
              <View style={styles.logoContainer}>
                <View style={styles.logoGlow}>
                  <LinearGradient
                    colors={[Theme.accent.primaryLight, Theme.accent.primary, Theme.accent.secondary]}
                    style={styles.logo}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                </View>
              </View>
              <Text style={styles.title}>Aurora</Text>
              <Text style={styles.subtitle}>Войдите в свой аккаунт</Text>
            </Animated.View>

            {/* Card */}
            <View style={styles.card}>
              {/* Email Input */}
              <Text style={styles.label}>Email</Text>
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
                leftIcon={<Ionicons name="mail-outline" size={20} color={Theme.text.secondary} />}
                error={errors.email}
              />

              {/* Password Input */}
              <View style={{ marginTop: 18 }}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Пароль</Text>
                  <TouchableOpacity onPress={onNavigateToForgotPassword} disabled={isLoading}>
                    <Text style={styles.forgotPassword}>Забыли?</Text>
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
                  leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Theme.text.secondary} />}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons 
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                        size={20} 
                        color={Theme.text.secondary} 
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
                style={{ marginTop: Theme.spacing.xl }}
              >
                <View style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}>
                  {isLoading ? (
                    <ActivityIndicator color={Theme.text.inverse} size="small" />
                  ) : (
                    <Text style={styles.signInButtonText}>Войти</Text>
                  )}
                </View>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>или</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Login Buttons */}
              <View style={styles.socialButtons}>
                <TouchableOpacity
                  onPress={() => handleSocialLogin('google')}
                  disabled={isLoading}
                  style={styles.socialButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-google" size={24} color={Theme.accent.primary} />
                  <Text style={styles.socialButtonText}>Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSocialLogin('apple')}
                  disabled={isLoading}
                  style={[styles.socialButton, styles.appleButton]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-apple" size={24} color={Theme.text.inverse} />
                  <Text style={styles.appleButtonText}>Apple</Text>
                </TouchableOpacity>
              </View>

              {/* Sign Up Link */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Нет аккаунта? </Text>
                <TouchableOpacity onPress={onNavigateToRegister} disabled={isLoading}>
                  <Text style={styles.registerLink}>Регистрация</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  // ═══════════════════════════════════════════════════════════════════════
  // AURORA Login Design — Immersive, cosmic entry
  // ═══════════════════════════════════════════════════════════════════════
  
  container: { 
    flex: 1, 
    backgroundColor: Theme.background.pure,
  },
  scrollContent: { 
    flexGrow: 1, 
    paddingHorizontal: Theme.spacing.xl,
  },
  
  // ─────────────────────────────────────────────────────────────────────
  // HEADER — Orb logo
  // ─────────────────────────────────────────────────────────────────────
  header: { 
    alignItems: 'center', 
    marginBottom: Theme.spacing.xxl,
  },
  logoContainer: {
    marginBottom: Theme.spacing.xl,
  },
  logoGlow: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: Theme.accent.primaryGlow,
    ...Theme.shadow.glowStrong,
  },
  logo: { 
    width: 72, 
    height: 72, 
    borderRadius: 36, 
  },
  title: { 
    fontSize: Theme.typography.size.display, 
    fontWeight: Theme.typography.weight.bold, 
    color: Theme.text.primary, 
    marginBottom: Theme.spacing.xs, 
    letterSpacing: Theme.typography.tracking.wide,
  },
  subtitle: { 
    fontSize: Theme.typography.size.md, 
    color: Theme.text.tertiary, 
    fontWeight: Theme.typography.weight.regular, 
    letterSpacing: 0.3,
  },
  
  // ─────────────────────────────────────────────────────────────────────
  // AUTH CARD — Glass morphism
  // ─────────────────────────────────────────────────────────────────────
  card: { 
    backgroundColor: Theme.glass.background,
    borderRadius: Theme.radius.xxl, 
    padding: Theme.spacing.xl, 
    borderWidth: 1,
    borderColor: Theme.glass.border,
    ...Theme.shadow.lg,
  },
  label: { 
    fontSize: Theme.typography.size.xs, 
    fontWeight: Theme.typography.weight.semibold, 
    color: Theme.text.accent, 
    marginBottom: Theme.spacing.sm, 
    letterSpacing: 1, 
    textTransform: 'uppercase',
  },
  labelRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: Theme.spacing.sm,
  },
  forgotPassword: { 
    fontSize: Theme.typography.size.xs, 
    fontWeight: Theme.typography.weight.semibold, 
    color: Theme.accent.secondary, 
    letterSpacing: 0.2,
  },
  
  // ─────────────────────────────────────────────────────────────────────
  // SIGN IN BUTTON — Glowing accent
  // ─────────────────────────────────────────────────────────────────────
  signInButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: Theme.spacing.lg, 
    borderRadius: Theme.radius.lg, 
    backgroundColor: Theme.accent.primary,
    ...Theme.shadow.glow,
  },
  signInButtonDisabled: {
    backgroundColor: Theme.text.muted,
    shadowOpacity: 0,
  },
  signInButtonText: { 
    fontSize: Theme.typography.size.md, 
    fontWeight: Theme.typography.weight.semibold, 
    color: '#FFFFFF', 
    letterSpacing: 0.3,
  },
  
  // ─────────────────────────────────────────────────────────────────────
  // DIVIDER
  // ─────────────────────────────────────────────────────────────────────
  divider: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginVertical: Theme.spacing.xl,
  },
  dividerLine: { 
    flex: 1, 
    height: 1, 
    backgroundColor: Theme.border.subtle,
  },
  dividerText: { 
    paddingHorizontal: Theme.spacing.lg, 
    fontSize: Theme.typography.size.xs, 
    color: Theme.text.muted, 
    fontWeight: Theme.typography.weight.medium, 
    letterSpacing: 0.5,
  },
  
  // ─────────────────────────────────────────────────────────────────────
  // SOCIAL BUTTONS — Soft glass
  // ─────────────────────────────────────────────────────────────────────
  socialButtons: { 
    flexDirection: 'row', 
    gap: Theme.spacing.md, 
    marginBottom: Theme.spacing.xl,
  },
  socialButton: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: Theme.spacing.sm, 
    backgroundColor: Theme.background.tertiary,
    borderWidth: 1, 
    borderColor: Theme.border.medium, 
    borderRadius: Theme.radius.lg, 
    paddingVertical: Theme.spacing.md,
  },
  socialButtonText: { 
    fontSize: Theme.typography.size.sm, 
    fontWeight: Theme.typography.weight.semibold, 
    color: Theme.text.primary, 
    letterSpacing: 0.2,
  },
  appleButton: { 
    backgroundColor: '#FFFFFF', 
    borderColor: '#FFFFFF',
  },
  appleButtonText: { 
    fontSize: Theme.typography.size.sm, 
    fontWeight: Theme.typography.weight.semibold, 
    color: '#000000', 
    letterSpacing: 0.2,
  },
  
  // ─────────────────────────────────────────────────────────────────────
  // FOOTER
  // ─────────────────────────────────────────────────────────────────────
  footer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    flexWrap: 'wrap',
  },
  footerText: { 
    fontSize: Theme.typography.size.sm, 
    color: Theme.text.secondary, 
    fontWeight: Theme.typography.weight.medium,
  },
  registerLink: { 
    fontSize: Theme.typography.size.sm, 
    fontWeight: Theme.typography.weight.bold, 
    color: Theme.accent.primary, 
    letterSpacing: 0.2,
  },
});
