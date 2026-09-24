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
import { Theme } from '@/constants/theme';

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
  const isDark = true;

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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 100}
      enabled={true}
    >
      <LinearGradient
        colors={Theme.gradients.main as unknown as [string, string]}
        style={styles.gradient}
      >
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
            scrollEnabled={true}
          >
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Theme.text.primary} />
          </TouchableOpacity>

          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
            <View style={[styles.iconContainer, styles.iconContainerDark]}>
              <Ionicons name="lock-closed" size={40} color={Theme.accent.primary} />
            </View>
            <Text style={[styles.title, styles.titleDark]}>Введите код</Text>
            <Text style={[styles.subtitle, styles.subtitleDark]}>
              Мы отправили 6-значный код на{'\n'}
              <Text style={styles.contact}>{maskedContact}</Text>
            </Text>
          </Animated.View>

          <Animated.View 
            entering={FadeInUp.delay(200).springify()} 
            style={[styles.card, styles.cardDark]}
          >
            <Animated.View style={[styles.codeContainer, animatedCodeContainerStyle]}>
              {code.map((digit, index) => (
                <View
                  key={index}
                  style={[
                    styles.digitBox,
                    styles.digitBoxDark,
                    focusedIndex === index && styles.digitBoxFocused,
                    focusedIndex === index && styles.digitBoxFocusedDark,
                    digit !== '' && styles.digitBoxFilled,
                    error && styles.digitBoxError,
                  ]}
                >
                  <TextInput
                    ref={(ref) => { inputRefs.current[index] = ref; }}
                    style={[styles.digitInput, styles.digitInputDark]}
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
              <Text style={[styles.resendText, styles.resendTextDark]}>
                Не получили код?{' '}
              </Text>
              {resendTimer > 0 ? (
                <Text style={[styles.resendTimer, styles.resendTimerDark]}>
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
                    : Theme.accent.gradient as unknown as [string, string]
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
          </ScrollView>
        </TouchableWithoutFeedback>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background.primary },
  gradient: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  backButton: { marginBottom: 20, width: 40, height: 40, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 107, 0, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  iconContainerDark: { backgroundColor: 'rgba(255, 107, 0, 0.2)' },
  title: { fontSize: 28, fontWeight: '700', color: Theme.text.primary, marginBottom: 8 },
  titleDark: { color: Theme.text.primary },
  subtitle: { fontSize: 15, color: Theme.text.secondary, textAlign: 'center', lineHeight: 22 },
  subtitleDark: { color: Theme.text.secondary },
  contact: { fontWeight: '600', color: Theme.accent.primary },
  card: { borderRadius: 24, padding: 24, backgroundColor: Theme.background.card },
  cardDark: { backgroundColor: Theme.background.card, borderWidth: 1, borderColor: Theme.border.primary },
  codeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  digitBox: { width: 48, height: 56, borderWidth: 2, borderColor: Theme.border.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Theme.background.card },
  digitBoxDark: { borderColor: Theme.border.primary, backgroundColor: Theme.background.card },
  digitBoxFocused: { borderColor: Theme.accent.primary, borderWidth: 2 },
  digitBoxFocusedDark: { borderColor: Theme.accent.secondary },
  digitBoxFilled: { borderColor: Theme.accent.primary, backgroundColor: 'rgba(255, 107, 0, 0.05)' },
  digitBoxError: { borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.05)' },
  digitInput: { fontSize: 24, fontWeight: '700', color: Theme.text.primary, textAlign: 'center', width: '100%' },
  digitInputDark: { color: Theme.text.primary },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 12 },
  errorText: { fontSize: 13, color: '#ef4444', fontWeight: '500' },
  resendContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  resendText: { fontSize: 14, color: Theme.text.secondary },
  resendTextDark: { color: Theme.text.secondary },
  resendTimer: { fontSize: 14, color: Theme.text.tertiary, fontWeight: '500' },
  resendTimerDark: { color: Theme.text.tertiary },
  resendLink: { fontSize: 14, fontWeight: '700', color: Theme.accent.primary },
  verifyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 12 },
  verifyButtonText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
});
