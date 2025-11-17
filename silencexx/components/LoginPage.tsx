import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/utils/ThemeContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Separator } from './ui/Separator';
import { FloatingClouds } from './FloatingClouds';
import { AnimatedGradient } from './AnimatedGradient';

interface LoginPageProps {
  onLogin: () => void;
  onNavigateToRegister: () => void;
  onNavigateToOTP: (phone: string) => void;
}

type LoginMethod = 'email' | 'phone';

export function LoginPage({ onLogin, onNavigateToRegister, onNavigateToOTP }: LoginPageProps) {
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 1) return cleaned;
    if (cleaned.length <= 4) return `+7 (${cleaned.slice(1)}`;
    if (cleaned.length <= 7) return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4)}`;
    if (cleaned.length <= 9) return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`;
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    if (formatted.length <= 18) {
      setPhone(formatted);
    }
  };

  const handleEmailLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 1000);
  };

  const handlePhoneLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onNavigateToOTP(phone);
    }, 800);
  };

  const handleSocialLogin = (provider: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 1200);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.gradient}>
        <AnimatedGradient
          lightColors={['rgba(239, 246, 255, 0.9)', 'rgba(250, 245, 255, 0.9)', 'rgba(252, 231, 243, 0.9)']}
          darkColors={['#0f172a', '#581c87', '#0f172a']}
          isDark={isDark}
        />
        <FloatingClouds />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo and Title */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
            <LinearGradient colors={['#60a5fa', '#a78bfa']} style={styles.logo}>
              <Ionicons name="cloud" size={40} color="#ffffff" />
            </LinearGradient>
            <Text style={[styles.title, isDark && styles.titleDark]}>CloudMind</Text>
            <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>Ваш путь к покою</Text>
          </Animated.View>

          {/* Main Card */}
          <Animated.View entering={FadeInUp.delay(200)} style={[styles.card, isDark && styles.cardDark]}>
            {/* Social Login Buttons */}
            <View style={styles.socialButtons}>
              <Button
                onPress={() => handleSocialLogin('google')}
                disabled={isLoading}
                variant="outline"
                icon={<Ionicons name="logo-google" size={20} color="#3b82f6" />}
              >
                <Text style={styles.socialButtonText}>Продолжить с Google</Text>
              </Button>

              <Button
                onPress={() => handleSocialLogin('apple')}
                disabled={isLoading}
                style={styles.appleButton}
                icon={<Ionicons name="logo-apple" size={20} color="#ffffff" />}
              >
                <Text style={styles.appleButtonText}>Продолжить с Apple</Text>
              </Button>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <Separator style={styles.dividerLine} />
              <Text style={[styles.dividerText, isDark && styles.dividerTextDark]}>или</Text>
              <Separator style={styles.dividerLine} />
            </View>

            {/* Login Method Tabs */}
            <View style={[styles.tabs, isDark && styles.tabsDark]}>
              <TouchableOpacity
                onPress={() => setLoginMethod('email')}
                style={[styles.tab, loginMethod === 'email' && styles.tabActive]}
              >
                {loginMethod === 'email' ? (
                  <LinearGradient colors={['#3b82f6', '#8b5cf6']} style={styles.tabGradient}>
                    <Ionicons name="mail" size={16} color="#ffffff" />
                    <Text style={styles.tabTextActive}>Email</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.tabContent}>
                    <Ionicons name="mail" size={16} color={isDark ? '#94a3af' : '#64748b'} />
                    <Text style={[styles.tabText, isDark && styles.tabTextDark]}>Email</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setLoginMethod('phone')}
                style={[styles.tab, loginMethod === 'phone' && styles.tabActive]}
              >
                {loginMethod === 'phone' ? (
                  <LinearGradient colors={['#3b82f6', '#8b5cf6']} style={styles.tabGradient}>
                    <Ionicons name="call" size={16} color="#ffffff" />
                    <Text style={styles.tabTextActive}>Телефон</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.tabContent}>
                    <Ionicons name="call" size={16} color={isDark ? '#94a3af' : '#64748b'} />
                    <Text style={[styles.tabText, isDark && styles.tabTextDark]}>Телефон</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Login Forms */}
            {loginMethod === 'email' ? (
              <Animated.View entering={FadeIn.duration(300)} style={styles.form}>
                <Input
                  label="Email"
                  placeholder="your@email.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon={<Ionicons name="mail-outline" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />}
                />

                <View>
                  <Input
                    label="Пароль"
                    placeholder="••••••••"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    leftIcon={<Ionicons name="lock-closed-outline" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />}
                    rightIcon={
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color={isDark ? '#9ca3af' : '#6b7280'}
                        />
                      </TouchableOpacity>
                    }
                  />
                  <TouchableOpacity style={styles.forgotPassword}>
                    <Text style={styles.forgotPasswordText}>Забыли?</Text>
                  </TouchableOpacity>
                </View>

                <Button onPress={handleEmailLogin} loading={isLoading} style={styles.submitButton}>
                  {!isLoading && <Ionicons name="lock-closed" size={20} color="#ffffff" />}
                  <Text style={styles.submitButtonText}>{isLoading ? 'Вход...' : 'Войти'}</Text>
                </Button>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeIn.duration(300)} style={styles.form}>
                <Input
                  label="Номер телефона"
                  placeholder="+7 (___) ___-__-__"
                  value={phone}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  leftIcon={<Ionicons name="call-outline" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />}
                />
                <Text style={[styles.helperText, isDark && styles.helperTextDark]}>
                  Мы отправим код подтверждения на этот номер
                </Text>

                <Button onPress={handlePhoneLogin} loading={isLoading} style={styles.submitButton}>
                  {!isLoading && <Ionicons name="call" size={20} color="#ffffff" />}
                  <Text style={styles.submitButtonText}>{isLoading ? 'Отправка...' : 'Получить код'}</Text>
                </Button>
              </Animated.View>
            )}
          </Animated.View>

          {/* Register Link */}
          <Animated.View entering={FadeInUp.delay(400)} style={styles.footer}>
            <Text style={[styles.footerText, isDark && styles.footerTextDark]}>
              Нет аккаунта?{' '}
              <Text onPress={onNavigateToRegister} style={styles.footerLink}>
                Зарегистрироваться
              </Text>
            </Text>
          </Animated.View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 16, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  titleDark: { color: '#f9fafb' },
  subtitle: { fontSize: 16, color: '#64748b' },
  subtitleDark: { color: '#9ca3af' },
  card: { backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 5 },
  cardDark: { backgroundColor: 'rgba(30, 41, 59, 0.8)' },
  socialButtons: { gap: 12, marginBottom: 24 },
  socialButtonText: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  appleButton: { backgroundColor: '#000000' },
  appleButtonText: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  dividerLine: { flex: 1 },
  dividerText: { marginHorizontal: 16, fontSize: 14, color: '#64748b' },
  dividerTextDark: { color: '#9ca3af' },
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(241, 245, 249, 0.5)', borderRadius: 16, padding: 4, marginBottom: 24 },
  tabsDark: { backgroundColor: 'rgba(55, 65, 81, 0.5)' },
  tab: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  tabActive: {},
  tabGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  tabContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  tabText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  tabTextActive: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  tabTextDark: { color: '#94a3af' },
  form: { gap: 16 },
  forgotPassword: { alignSelf: 'flex-end', marginTop: 4 },
  forgotPasswordText: { fontSize: 12, color: '#8b5cf6', fontWeight: '500' },
  helperText: { fontSize: 12, color: '#64748b', marginTop: -8 },
  helperTextDark: { color: '#9ca3af' },
  submitButton: { marginTop: 8 },
  submitButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  footer: { alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: 15, color: '#64748b' },
  footerTextDark: { color: '#9ca3af' },
  footerLink: { color: '#8b5cf6', fontWeight: '600' },
});
