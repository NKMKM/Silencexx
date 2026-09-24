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
import { authApi } from '@/services/api';
import { Theme } from '@/constants/theme';

interface RegisterPageProps {
  onRegister: () => void;
  onNavigateToLogin: () => void;
}

type Step = 'email' | 'name' | 'password' | 'confirm';

export function RegisterPage({ onRegister, onNavigateToLogin }: RegisterPageProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', name: '', password: '', confirmPassword: '' });

  const insets = useSafeAreaInsets();
  const isDark = true; // Force dark theme
  
  const contentTranslateY = useSharedValue(0);

  const handleInputFocus = (offset: number) => {
    // Поднимаем форму при фокусе
    contentTranslateY.value = withTiming(-100, { duration: 300 });
  };

  const handleInputBlur = () => {
    // Опускаем форму при потере фокуса
    contentTranslateY.value = withTiming(0, { duration: 300 });
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailNext = () => {
    if (!email) {
      setErrors({ ...errors, email: 'Enter your email' });
      return;
    }
    if (!isValidEmail(email)) {
      setErrors({ ...errors, email: 'Invalid email format' });
      return;
    }
    setErrors({ ...errors, email: '' });
    setStep('name');
  };

  const handleNameNext = () => {
    if (!name || name.trim().length < 2) {
      setErrors({ ...errors, name: 'Name must be at least 2 characters' });
      return;
    }
    setErrors({ ...errors, name: '' });
    setStep('password');
  };

  const handlePasswordNext = () => {
    if (!password) {
      setErrors({ ...errors, password: 'Enter password' });
      return;
    }
    if (password.length < 6) {
      setErrors({ ...errors, password: 'Minimum 6 characters' });
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setErrors({ ...errors, password: 'Must contain letters and numbers' });
      return;
    }
    if (/[а-яА-ЯёЁ]/.test(password)) {
      setErrors({ ...errors, password: 'Only Latin characters' });
      return;
    }
    setErrors({ ...errors, password: '' });
    setStep('confirm');
  };

  const handleConfirmPassword = () => {
    if (!confirmPassword) {
      setErrors({ ...errors, confirmPassword: 'Confirm your password' });
      return;
    }
    if (password !== confirmPassword) {
      setErrors({ ...errors, confirmPassword: 'Passwords do not match' });
      return;
    }
    setErrors({ ...errors, confirmPassword: '' });
    handleFinalRegister();
  };

  const handleFinalRegister = async () => {
    setIsLoading(true);

    try {
      console.log('📝 Starting registration:', {
        email,
        name,
        passwordLength: password.length
      });

      const response = await authApi.register('email', email, name, password);
      
      console.log('📡 Server response:', response);
      
      if (response.success) {
        console.log('✅ Registration successful');
        onRegister();
      } else {
        console.error('❌ Registration failed:', response.error);
        if (response.error?.includes('email') || response.error?.includes('exists')) {
          setErrors({ ...errors, email: response.error });
        } else {
          setErrors({ ...errors, email: response.error || 'Registration error' });
        }
      }
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      setErrors({ ...errors, email: error.response?.data?.error || 'Connection error' });
    } finally {
      setIsLoading(false);
    }
  };

  const getProgress = () => {
    const steps = ['email', 'name', 'password', 'confirm'];
    const currentIndex = steps.indexOf(step);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  const goBack = () => {
    if (step === 'email') return;
    if (step === 'name') setStep('email');
    else if (step === 'password') setStep('name');
    else if (step === 'confirm') setStep('password');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#0A0A0A', '#080808', '#000000']}
        style={StyleSheet.absoluteFillObject}
      />

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
          {/* Back Button */}
          {step !== 'email' && (
            <TouchableOpacity 
              onPress={goBack}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={Theme.text.primary} />
            </TouchableOpacity>
          )}

          {/* Header */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
            <LinearGradient colors={[Theme.accent.primary, Theme.accent.primaryLight]} style={styles.logo}>
              <Ionicons name="sparkles" size={48} color="#ffffff" />
              </LinearGradient>
              <Text style={styles.title}>CloudMind</Text>
              <Text style={styles.subtitle}>Создание аккаунта</Text>
            </Animated.View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={[Theme.accent.primary, Theme.accent.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${getProgress()}%` }]}
                />
              </View>
            </View>

            {/* Card */}
            <View style={styles.card}>
              {/* Email Step */}
              {step === 'email' && (
                <Animated.View entering={FadeInDown.delay(50).springify()}>
                  <Text style={styles.stepTitle}>Ваш Email</Text>
                  <Text style={styles.stepSubtitle}>
                    Мы используем его для создания аккаунта
                  </Text>
                  <Input
                    placeholder="example@mail.com"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errors.email) setErrors({ ...errors, email: '' });
                    }}
                    onInputFocus={() => handleInputFocus(100)}
                    onInputBlur={handleInputBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoFocus
                    leftIcon={<Ionicons name="mail-outline" size={20} color={Theme.text.secondary} />}
                    error={errors.email}
                  />
                  <TouchableOpacity
                    onPress={handleEmailNext}
                    activeOpacity={0.8}
                    style={{ marginTop: 24 }}
                  >
                    <LinearGradient
                      colors={[Theme.accent.primary, Theme.accent.primaryLight]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.nextButton}
                    >
                      <Text style={styles.nextButtonText}>Далее</Text>
                      <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              )}

              {/* Name Step */}
              {step === 'name' && (
                <Animated.View entering={FadeInDown.delay(50).springify()}>
                  <Text style={styles.stepTitle}>Как вас зовут?</Text>
                  <Text style={styles.stepSubtitle}>
                    Это имя будет показано в профиле
                  </Text>
                  <Input
                    placeholder="Введите имя"
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      if (errors.name) setErrors({ ...errors, name: '' });
                    }}
                    onInputFocus={() => handleInputFocus(100)}
                    onInputBlur={handleInputBlur}
                    autoCapitalize="words"
                    autoFocus
                    leftIcon={<Ionicons name="person-outline" size={20} color={Theme.text.secondary} />}
                    error={errors.name}
                  />
                  <TouchableOpacity
                    onPress={handleNameNext}
                    activeOpacity={0.8}
                    style={{ marginTop: 24 }}
                  >
                    <LinearGradient
                      colors={[Theme.accent.primary, Theme.accent.primaryLight]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.nextButton}
                    >
                      <Text style={styles.nextButtonText}>Далее</Text>
                      <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              )}

              {/* Password Step */}
              {step === 'password' && (
                <Animated.View entering={FadeInDown.delay(50).springify()}>
                  <Text style={styles.stepTitle}>Создайте пароль</Text>
                  <Text style={styles.stepSubtitle}>
                    Минимум 6 символов с буквами и цифрами
                  </Text>
                  <Input
                    placeholder="••••••••"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password) setErrors({ ...errors, password: '' });
                    }}
                    onInputFocus={() => handleInputFocus(150)}
                    onInputBlur={handleInputBlur}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoFocus
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
                  <TouchableOpacity
                    onPress={handlePasswordNext}
                    activeOpacity={0.8}
                    style={{ marginTop: 24 }}
                  >
                    <LinearGradient
                      colors={[Theme.accent.primary, Theme.accent.primaryLight]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.nextButton}
                    >
                      <Text style={styles.nextButtonText}>Далее</Text>
                      <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              )}

              {/* Confirm Password Step */}
              {step === 'confirm' && (
                <Animated.View entering={FadeInDown.delay(50).springify()}>
                  <Text style={styles.stepTitle}>Подтвердите пароль</Text>
                  <Text style={styles.stepSubtitle}>
                    Введите пароль ещё раз
                  </Text>
                  <Input
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                    }}
                    onInputFocus={() => handleInputFocus(120)}
                    onInputBlur={handleInputBlur}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoFocus
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
                    error={errors.confirmPassword}
                  />
                  <TouchableOpacity
                    onPress={handleConfirmPassword}
                    disabled={isLoading}
                    activeOpacity={0.8}
                    style={{ marginTop: 24 }}
                  >
                    <LinearGradient
                      colors={isLoading ? ['#4b5563', '#374151'] : [Theme.accent.primary, Theme.accent.primaryLight]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.nextButton}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <>
                          <Text style={styles.nextButtonText}>Создать аккаунт</Text>
                          <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              )}

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>или</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Sign In Link */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Уже есть аккаунт? </Text>
                <TouchableOpacity onPress={onNavigateToLogin} disabled={isLoading}>
                  <Text style={styles.loginLink}>Войти</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background.primary },
  scrollContent: { flexGrow: 1, paddingHorizontal: 26 },
  backButton: { 
    marginBottom: 18, 
    width: 48, 
    height: 48, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: Theme.background.elevated,
    borderRadius: Theme.radius.lg,
  },
  header: { alignItems: 'center', marginBottom: Theme.spacing.xxl },
  logo: { 
    width: 104, 
    height: 104, 
    borderRadius: Theme.radius.xl, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 28, 
    shadowColor: Theme.accent.primary, 
    shadowOffset: { width: 0, height: 14 }, 
    shadowOpacity: 0.5, 
    shadowRadius: 28, 
    elevation: 18,
    backgroundColor: Theme.background.elevated,
  },
  title: { 
    fontSize: 38, 
    fontWeight: '800', 
    color: Theme.text.primary, 
    marginBottom: 10, 
    letterSpacing: -0.5 
  },
  subtitle: { 
    fontSize: 17, 
    color: Theme.text.secondary, 
    fontWeight: '500', 
    letterSpacing: 0.3 
  },
  progressContainer: { marginBottom: 28 },
  progressBar: { 
    height: 5, 
    backgroundColor: Theme.background.tertiary, 
    borderRadius: 3, 
    overflow: 'hidden' 
  },
  progressFill: { height: '100%', borderRadius: 3 },
  card: { 
    backgroundColor: Theme.background.card,
    borderRadius: Theme.radius.xl, 
    padding: 30, 
    borderWidth: 1,
    borderColor: Theme.border.primary,
    shadowColor: Theme.accent.primary, 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 28, 
    elevation: 12 
  },
  stepTitle: { 
    fontSize: 26, 
    fontWeight: '800', 
    color: Theme.text.primary, 
    marginBottom: 12, 
    textAlign: 'center', 
    letterSpacing: -0.3 
  },
  stepSubtitle: { 
    fontSize: 15, 
    color: Theme.text.secondary, 
    marginBottom: 28, 
    textAlign: 'center', 
    lineHeight: 22 
  },
  nextButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 12, 
    paddingVertical: 18, 
    borderRadius: Theme.radius.lg, 
    shadowColor: Theme.accent.primary, 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.45, 
    shadowRadius: 18, 
    elevation: 10 
  },
  nextButtonText: { 
    fontSize: 17, 
    fontWeight: '800', 
    color: '#ffffff', 
    letterSpacing: 0.5 
  },
  divider: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginVertical: 28 
  },
  dividerLine: { 
    flex: 1, 
    height: 1, 
    backgroundColor: Theme.border.primary 
  },
  dividerText: { 
    paddingHorizontal: 18, 
    fontSize: 13, 
    color: Theme.text.tertiary, 
    fontWeight: '600', 
    letterSpacing: 0.3 
  },
  footer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    flexWrap: 'wrap' 
  },
  footerText: { 
    fontSize: 14, 
    color: Theme.text.secondary, 
    fontWeight: '500' 
  },
  loginLink: { 
    fontSize: 14, 
    fontWeight: '800', 
    color: Theme.accent.primary, 
    letterSpacing: 0.3 
  },
});
