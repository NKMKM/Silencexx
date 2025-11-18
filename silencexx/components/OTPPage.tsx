import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  useAnimatedStyle, 
  withSpring,
  withSequence,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/utils/ThemeContext';
import { FloatingClouds } from './FloatingClouds';
import { AnimatedGradient } from './AnimatedGradient';

interface OTPPageProps {
  contact: string;
  onVerify: (code: string) => void;
  onResend?: () => void;
  onBack: () => void;
}

const OTP_LENGTH = 6;

export function OTPPage({ contact, onVerify, onResend, onBack }: OTPPageProps) {
  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const insets = useSafeAreaInsets();
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';

  const shakeAnimation = useSharedValue(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChangeText = (text: string, index: number) => {
    if (text.length > 1) {
      const digits = text.split('').filter(char => /\d/.test(char)).slice(0, OTP_LENGTH);
      const newCode = [...code];
      digits.forEach((digit, i) => {
        if (index + i < OTP_LENGTH) {
          newCode[index + i] = digit;
        }
      });
      setCode(newCode);
      const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      setFocusedIndex(nextIndex);
      return;
    }

    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    setError('');

    if (text && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }

    if (text && index === OTP_LENGTH - 1) {
      Keyboard.dismiss();
      const fullCode = newCode.join('');
      if (fullCode.length === OTP_LENGTH) {
        handleVerify(fullCode);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      const newCode = [...code];
      if (code[index]) {
        newCode[index] = '';
        setCode(newCode);
      } else if (index > 0) {
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
        setFocusedIndex(index - 1);
      }
    }
  };

  const handleVerify = (fullCode: string) => {
    if (fullCode.length !== OTP_LENGTH) {
      setError('Введите полный код');
      triggerShake();
      return;
    }

    setIsLoading(true);
    
    setTimeout(() => {
      const isValid = fullCode === '123456';
      
      if (isValid) {
        onVerify(fullCode);
      } else {
        setError('Неверный код. Попробуйте еще раз');
        setCode(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
        setFocusedIndex(0);
        triggerShake();
      }
      setIsLoading(false);
    }, 1000);
  };

  const triggerShake = () => {
    shakeAnimation.value = withSequence(
      withSpring(10, { damping: 10, stiffness: 500 }),
      withSpring(-10, { damping: 10, stiffness: 500 }),
      withSpring(10, { damping: 10, stiffness: 500 }),
      withSpring(0, { damping: 10, stiffness: 500 })
    );
  };

  const handleResend = () => {
    if (resendTimer > 0) return;
    
    setResendTimer(60);
    setCode(Array(OTP_LENGTH).fill(''));
    setError('');
    inputRefs.current[0]?.focus();
    setFocusedIndex(0);
    
    if (onResend) {
      onResend();
    }
  };

  const animatedCodeContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shakeAnimation.value }],
    };
  });

  const maskedContact = contact.includes('@')
    ? contact.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    : contact.replace(/(\+\d{1,3})(\d{3})(\d{3})(.*)/, '$1 $2 *** $4');

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
            <View style={[styles.iconContainer, isDark && styles.iconContainerDark]}>
              <Ionicons name="lock-closed" size={40} color="#8b5cf6" />
            </View>
            <Text style={[styles.title, isDark && styles.titleDark]}>Введите код</Text>
            <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
              Мы отправили 6-значный код на{'\n'}
              <Text style={styles.contact}>{maskedContact}</Text>
            </Text>
          </Animated.View>

          <Animated.View 
            entering={FadeInUp.delay(200).springify()} 
            style={[styles.card, isDark && styles.cardDark]}
          >
            <Animated.View style={[styles.codeContainer, animatedCodeContainerStyle]}>
              {code.map((digit, index) => (
                <View
                  key={index}
                  style={[
                    styles.digitBox,
                    isDark && styles.digitBoxDark,
                    focusedIndex === index && styles.digitBoxFocused,
                    focusedIndex === index && isDark && styles.digitBoxFocusedDark,
                    digit !== '' && styles.digitBoxFilled,
                    error && styles.digitBoxError,
                  ]}
                >
                  <TextInput
                    ref={(ref) => { inputRefs.current[index] = ref; }}
                    style={[styles.digitInput, isDark && styles.digitInputDark]}
                    value={digit}
                    onChangeText={(text) => handleChangeText(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    onFocus={() => setFocusedIndex(index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    editable={!isLoading}
                  />
                </View>
              ))}
            </Animated.View>

            {error ? (
              <Animated.View entering={FadeInDown.duration(200)} style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            ) : null}

            <View style={styles.resendContainer}>
              <Text style={[styles.resendText, isDark && styles.resendTextDark]}>
                Не получили код?{' '}
              </Text>
              {resendTimer > 0 ? (
                <Text style={[styles.resendTimer, isDark && styles.resendTimerDark]}>
                  Повторить через {resendTimer}с
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend}>
                  <Text style={styles.resendLink}>Отправить заново</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={() => handleVerify(code.join(''))}
              disabled={isLoading || code.join('').length !== OTP_LENGTH}
              activeOpacity={0.8}
              style={{ marginTop: 24 }}
            >
              <LinearGradient
                colors={
                  isLoading || code.join('').length !== OTP_LENGTH
                    ? ['#94a3b8', '#64748b']
                    : ['#3b82f6', '#8b5cf6']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.verifyButton}
              >
                <Text style={styles.verifyButtonText}>
                  {isLoading ? 'Проверка...' : 'Подтвердить'}
                </Text>
                {!isLoading && <Ionicons name="checkmark-circle" size={20} color="#ffffff" />}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
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
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(139, 92, 246, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  iconContainerDark: { backgroundColor: 'rgba(139, 92, 246, 0.2)' },
  title: { fontSize: 28, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  titleDark: { color: '#f1f5f9' },
  subtitle: { fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  subtitleDark: { color: '#94a3b8' },
  contact: { fontWeight: '600', color: '#8b5cf6' },
  card: { borderRadius: 24, padding: 24, backgroundColor: 'rgba(255, 255, 255, 0.5)' },
  cardDark: { backgroundColor: 'rgba(30, 41, 59, 0.5)', borderWidth: 0 },
  codeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  digitBox: { width: 48, height: 56, borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  digitBoxDark: { borderColor: 'rgba(148, 163, 184, 0.3)', backgroundColor: 'rgba(51, 65, 85, 0.5)' },
  digitBoxFocused: { borderColor: '#8b5cf6', borderWidth: 2 },
  digitBoxFocusedDark: { borderColor: '#a78bfa' },
  digitBoxFilled: { borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.05)' },
  digitBoxError: { borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.05)' },
  digitInput: { fontSize: 24, fontWeight: '700', color: '#1e293b', textAlign: 'center', width: '100%' },
  digitInputDark: { color: '#f1f5f9' },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 12 },
  errorText: { fontSize: 13, color: '#ef4444', fontWeight: '500' },
  resendContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  resendText: { fontSize: 14, color: '#64748b' },
  resendTextDark: { color: '#94a3b8' },
  resendTimer: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
  resendTimerDark: { color: '#64748b' },
  resendLink: { fontSize: 14, fontWeight: '700', color: '#8b5cf6' },
  verifyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 12 },
  verifyButtonText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
});
