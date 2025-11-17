import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '@/utils/ThemeContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Separator } from './ui/Separator';
import { FloatingClouds } from './FloatingClouds';
import { AnimatedGradient } from './AnimatedGradient';

interface RegisterPageProps {
  onRegister?: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToOTP?: (phone: string) => void;
}

type RegisterMethod = 'email' | 'phone';

export function RegisterPage({ onRegister, onNavigateToLogin, onNavigateToOTP }: RegisterPageProps) {
  const router = useRouter();
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  const [registerMethod, setRegisterMethod] = useState<RegisterMethod>('email');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 1) return cleaned;
    if (cleaned.length <= 4) return `+7 (${cleaned.slice(1)}`;
    if (cleaned.length <= 7) return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4)}`;
    if (cleaned.length <= 9) return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`;
  };

  const handleRegister = () => {
    if (!agreeTerms) {
      Alert.alert('Ошибка', 'Пожалуйста, примите условия использования');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }
    if (onRegister) {
      onRegister();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleNavigateToLogin = () => {
    if (onNavigateToLogin) {
      onNavigateToLogin();
    } else {
      router.back();
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    if (formatted.length <= 18) {
      setPhone(formatted);
    }
  };

  const handleEmailRegister = () => {
    if (password !== confirmPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }
    if (!agreeTerms) {
      Alert.alert('Ошибка', 'Пожалуйста, согласитесь с условиями использования');
      return;
    }
    if (onRegister) {
      onRegister();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handlePhoneRegister = () => {
    if (!agreeTerms) {
      Alert.alert('Ошибка', 'Пожалуйста, согласитесь с условиями использования');
      return;
    }
    if (onNavigateToOTP) {
      onNavigateToOTP(phone);
    } else {
      // Default: Navigate to OTP screen or directly to tabs
      router.replace('/(tabs)');
    }
  };

  const handleSocialRegister = (provider: string) => {
    if (onRegister) {
      onRegister();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      <AnimatedGradient
        lightColors={['#eff6ff', '#f3e8ff', '#fce7f3']}
        darkColors={['#0f172a', '#1e293b', '#334155']}
        isDark={isDark}
      />
      <FloatingClouds />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo and Title */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.logoContainer}>
            <LinearGradient
              colors={['#a78bfa', '#ec4899']}
              style={styles.logo}
            >
              <Ionicons name="cloud" size={40} color="#fff" />
            </LinearGradient>
            <Text style={[styles.title, { color: isDark ? '#e2e8f0' : '#1e293b' }]}>
              Создать аккаунт
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              Начните свой путь к покою
            </Text>
          </Animated.View>

          {/* Main Card */}
          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark
                    ? 'rgba(30, 41, 59, 0.7)'
                    : 'rgba(255, 255, 255, 0.8)',
                  borderColor: isDark
                    ? 'rgba(71, 85, 105, 0.4)'
                    : 'rgba(255, 255, 255, 0.4)',
                },
              ]}
            >
              {/* Social Register Buttons */}
              <View style={styles.socialButtons}>
                <TouchableOpacity
                  onPress={() => handleSocialRegister('google')}
                  style={[
                    styles.socialButton,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#fff',
                      borderColor: isDark ? 'rgba(226, 232, 240, 0.2)' : '#e2e8f0',
                    },
                  ]}
                >
                  <Ionicons name="logo-google" size={20} color="#4285F4" />
                  <Text style={[styles.socialButtonText, { color: isDark ? '#e2e8f0' : '#1e293b' }]}>
                    Google
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSocialRegister('apple')}
                  style={[
                    styles.socialButton,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#fff',
                      borderColor: isDark ? 'rgba(226, 232, 240, 0.2)' : '#e2e8f0',
                    },
                  ]}
                >
                  <Ionicons name="logo-apple" size={20} color={isDark ? '#fff' : '#000'} />
                  <Text style={[styles.socialButtonText, { color: isDark ? '#e2e8f0' : '#1e293b' }]}>
                    Apple
                  </Text>
                </TouchableOpacity>
              </View>

              <Separator style={styles.separator} />

              {/* Tab Switcher */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  onPress={() => setRegisterMethod('email')}
                  style={[
                    styles.tab,
                    registerMethod === 'email' && {
                      backgroundColor: isDark
                        ? 'rgba(139, 92, 246, 0.2)'
                        : 'rgba(139, 92, 246, 0.1)',
                    },
                  ]}
                >
                  <Ionicons
                    name="mail"
                    size={18}
                    color={
                      registerMethod === 'email'
                        ? isDark
                          ? '#a78bfa'
                          : '#8b5cf6'
                        : isDark
                        ? '#64748b'
                        : '#94a3b8'
                    }
                  />
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color:
                          registerMethod === 'email'
                            ? isDark
                              ? '#a78bfa'
                              : '#8b5cf6'
                            : isDark
                            ? '#64748b'
                            : '#94a3b8',
                      },
                    ]}
                  >
                    Email
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setRegisterMethod('phone')}
                  style={[
                    styles.tab,
                    registerMethod === 'phone' && {
                      backgroundColor: isDark
                        ? 'rgba(139, 92, 246, 0.2)'
                        : 'rgba(139, 92, 246, 0.1)',
                    },
                  ]}
                >
                  <Ionicons
                    name="call"
                    size={18}
                    color={
                      registerMethod === 'phone'
                        ? isDark
                          ? '#a78bfa'
                          : '#8b5cf6'
                        : isDark
                        ? '#64748b'
                        : '#94a3b8'
                    }
                  />
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color:
                          registerMethod === 'phone'
                            ? isDark
                              ? '#a78bfa'
                              : '#8b5cf6'
                            : isDark
                            ? '#64748b'
                            : '#94a3b8',
                      },
                    ]}
                  >
                    Телефон
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Form */}
              <View style={styles.form}>
                {/* Name */}
                <View style={styles.inputGroup}>
                  <Label style={{ color: isDark ? '#cbd5e1' : '#475569' }}>Имя</Label>
                  <Input
                    value={name}
                    onChangeText={setName}
                    placeholder="Ваше имя"
                    leftIcon="person-outline"
                  />
                </View>

                {/* Email or Phone */}
                {registerMethod === 'email' ? (
                  <View style={styles.inputGroup}>
                    <Label style={{ color: isDark ? '#cbd5e1' : '#475569' }}>Email</Label>
                    <Input
                      value={email}
                      onChangeText={setEmail}
                      placeholder="your@email.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      leftIcon="mail-outline"
                    />
                  </View>
                ) : (
                  <View style={styles.inputGroup}>
                    <Label style={{ color: isDark ? '#cbd5e1' : '#475569' }}>Телефон</Label>
                    <Input
                      value={phone}
                      onChangeText={handlePhoneChange}
                      placeholder="+7 (___) ___-__-__"
                      keyboardType="phone-pad"
                      leftIcon="call-outline"
                    />
                  </View>
                )}

                {/* Password */}
                {registerMethod === 'email' && (
                  <>
                    <View style={styles.inputGroup}>
                      <Label style={{ color: isDark ? '#cbd5e1' : '#475569' }}>Пароль</Label>
                      <Input
                        value={password}
                        onChangeText={setPassword}
                        placeholder="••••••••"
                        secureTextEntry={!showPassword}
                        leftIcon="lock-closed-outline"
                        rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        onRightIconPress={() => setShowPassword(!showPassword)}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Label style={{ color: isDark ? '#cbd5e1' : '#475569' }}>Подтвердите пароль</Label>
                      <Input
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="••••••••"
                        secureTextEntry={!showConfirmPassword}
                        leftIcon="lock-closed-outline"
                        rightIcon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      />
                    </View>
                  </>
                )}

                {/* Terms Checkbox */}
                <TouchableOpacity
                  onPress={() => setAgreeTerms(!agreeTerms)}
                  style={styles.checkboxContainer}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: agreeTerms
                          ? isDark
                            ? '#8b5cf6'
                            : '#a78bfa'
                          : 'transparent',
                        borderColor: isDark ? '#475569' : '#cbd5e1',
                      },
                    ]}
                  >
                    {agreeTerms && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <Text style={[styles.checkboxText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                    Я согласен с{' '}
                    <Text style={{ color: isDark ? '#a78bfa' : '#8b5cf6', fontWeight: '600' }}>
                      условиями использования
                    </Text>
                  </Text>
                </TouchableOpacity>

                {/* Register Button */}
                <Button
                  onPress={registerMethod === 'email' ? handleEmailRegister : handlePhoneRegister}
                  variant="default"
                  style={styles.registerButton}
                >
                  Зарегистрироваться
                </Button>

                {/* Login Link */}
                <View style={styles.loginLink}>
                  <Text style={[styles.loginText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                    Уже есть аккаунт?{' '}
                  </Text>
                  <TouchableOpacity onPress={handleNavigateToLogin}>
                    <Text style={[styles.loginLinkText, { color: isDark ? '#a78bfa' : '#8b5cf6' }]}>
                      Войти
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  separator: {
    marginBottom: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxText: {
    fontSize: 14,
    flex: 1,
  },
  registerButton: {
    marginTop: 8,
  },
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginText: {
    fontSize: 14,
  },
  loginLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
