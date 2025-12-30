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
import { authApi } from '@/services/api';

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
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  
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
            {/* Back Button */}
            {step !== 'email' && (
              <TouchableOpacity 
                onPress={goBack}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color={isDark ? '#f1f5f9' : '#1e293b'} />
              </TouchableOpacity>
            )}

            {/* Header */}
            <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
              <LinearGradient colors={['#60a5fa', '#a78bfa']} style={styles.logo}>
                <Ionicons name="cloud" size={48} color="#ffffff" />
              </LinearGradient>
              <Text style={[styles.title, isDark && styles.titleDark]}>CloudMind</Text>
              <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>Create your account</Text>
            </Animated.View>

            {/* Progress Bar */}
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

            {/* Card */}
            <View style={[styles.card, isDark && styles.cardDark]}>
              {/* Email Step */}
              {step === 'email' && (
                <Animated.View entering={FadeInDown.delay(50).springify()}>
                  <Text style={[styles.stepTitle, isDark && styles.stepTitleDark]}>Your Email</Text>
                  <Text style={[styles.stepSubtitle, isDark && styles.stepSubtitleDark]}>
                    We'll use this to create your account
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
                    leftIcon={<Ionicons name="mail-outline" size={20} color={isDark ? '#94a3b8' : '#64748b'} />}
                    error={errors.email}
                  />
                  <TouchableOpacity
                    onPress={handleEmailNext}
                    activeOpacity={0.8}
                    style={{ marginTop: 24 }}
                  >
                    <LinearGradient
                      colors={['#3b82f6', '#8b5cf6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.nextButton}
                    >
                      <Text style={styles.nextButtonText}>Next</Text>
                      <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              )}

              {/* Name Step */}
              {step === 'name' && (
                <Animated.View entering={FadeInDown.delay(50).springify()}>
                  <Text style={[styles.stepTitle, isDark && styles.stepTitleDark]}>What's your name?</Text>
                  <Text style={[styles.stepSubtitle, isDark && styles.stepSubtitleDark]}>
                    This will show on your profile
                  </Text>
                  <Input
                    placeholder="Enter your name"
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      if (errors.name) setErrors({ ...errors, name: '' });
                    }}
                    onInputFocus={() => handleInputFocus(100)}
                    onInputBlur={handleInputBlur}
                    autoCapitalize="words"
                    autoFocus
                    leftIcon={<Ionicons name="person-outline" size={20} color={isDark ? '#94a3b8' : '#64748b'} />}
                    error={errors.name}
                  />
                  <TouchableOpacity
                    onPress={handleNameNext}
                    activeOpacity={0.8}
                    style={{ marginTop: 24 }}
                  >
                    <LinearGradient
                      colors={['#3b82f6', '#8b5cf6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.nextButton}
                    >
                      <Text style={styles.nextButtonText}>Next</Text>
                      <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              )}

              {/* Password Step */}
              {step === 'password' && (
                <Animated.View entering={FadeInDown.delay(50).springify()}>
                  <Text style={[styles.stepTitle, isDark && styles.stepTitleDark]}>Create Password</Text>
                  <Text style={[styles.stepSubtitle, isDark && styles.stepSubtitleDark]}>
                    At least 6 characters with letters and numbers
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
                  <TouchableOpacity
                    onPress={handlePasswordNext}
                    activeOpacity={0.8}
                    style={{ marginTop: 24 }}
                  >
                    <LinearGradient
                      colors={['#3b82f6', '#8b5cf6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.nextButton}
                    >
                      <Text style={styles.nextButtonText}>Next</Text>
                      <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              )}

              {/* Confirm Password Step */}
              {step === 'confirm' && (
                <Animated.View entering={FadeInDown.delay(50).springify()}>
                  <Text style={[styles.stepTitle, isDark && styles.stepTitleDark]}>Confirm Password</Text>
                  <Text style={[styles.stepSubtitle, isDark && styles.stepSubtitleDark]}>
                    Re-enter your password to confirm
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
                  <TouchableOpacity
                    onPress={handleConfirmPassword}
                    disabled={isLoading}
                    activeOpacity={0.8}
                    style={{ marginTop: 24 }}
                  >
                    <LinearGradient
                      colors={isLoading ? ['#94a3b8', '#64748b'] : ['#3b82f6', '#8b5cf6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.nextButton}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <>
                          <Text style={styles.nextButtonText}>Sign up</Text>
                          <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              )}

              {/* Divider */}
              <View style={styles.divider}>
                <View style={[styles.dividerLine, isDark && styles.dividerLineDark]} />
                <Text style={[styles.dividerText, isDark && styles.dividerTextDark]}>or</Text>
                <View style={[styles.dividerLine, isDark && styles.dividerLineDark]} />
              </View>

              {/* Sign In Link */}
              <View style={styles.footer}>
                <Text style={[styles.footerText, isDark && styles.footerTextDark]}>Already have an account? </Text>
                <TouchableOpacity onPress={onNavigateToLogin} disabled={isLoading}>
                  <Text style={styles.loginLink}>Sign in</Text>
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
  backButton: { marginBottom: 16, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 48 },
  logo: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 20, shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10 },
  title: { fontSize: 32, fontWeight: '800', color: '#1e293b', marginBottom: 6, letterSpacing: 0.5 },
  titleDark: { color: '#f1f5f9' },
  subtitle: { fontSize: 16, color: '#64748b', fontWeight: '500', letterSpacing: 0.3 },
  subtitleDark: { color: '#94a3b8' },
  progressContainer: { marginBottom: 24 },
  progressBar: { height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, overflow: 'hidden' },
  progressBarDark: { backgroundColor: 'rgba(148, 163, 184, 0.2)' },
  progressFill: { height: '100%', borderRadius: 2 },
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
  stepTitle: { fontSize: 24, fontWeight: '800', color: '#1e293b', marginBottom: 10, textAlign: 'center', letterSpacing: 0.3 },
  stepTitleDark: { color: '#f1f5f9' },
  stepSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 24, textAlign: 'center', lineHeight: 20 },
  stepSubtitleDark: { color: '#94a3b8' },
  nextButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 12, shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  nextButtonText: { fontSize: 16, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1.5, backgroundColor: '#e2e8f0' },
  dividerLineDark: { backgroundColor: 'rgba(148, 163, 184, 0.15)' },
  dividerText: { paddingHorizontal: 16, fontSize: 13, color: '#94a3b8', fontWeight: '600', letterSpacing: 0.3 },
  dividerTextDark: { color: '#64748b' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' },
  footerText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  footerTextDark: { color: '#94a3b8' },
  loginLink: { fontSize: 14, fontWeight: '800', color: '#8b5cf6', letterSpacing: 0.3 },
});
