import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/theme';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Separator } from './ui/Separator';
import { api } from '@/services/api';

interface PaymentPageProps {
  planName: string;
  planPrice: string;
  tierSlug?: string;
  onNavigateBack?: () => void;
  onPaymentSuccess?: () => void;
}

type PaymentMethod = 'card' | 'apple' | 'google' | 'sbp';

export function PaymentPage({ 
  planName, 
  planPrice, 
  tierSlug = 'plus',
  onNavigateBack, 
  onPaymentSuccess 
}: PaymentPageProps) {
  const router = useRouter();
  const isDark = true; // Force dark theme
  const insets = useSafeAreaInsets();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [email, setEmail] = useState('');
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const parts = [];
    for (let i = 0; i < v.length && i < 16; i += 4) {
      parts.push(v.substring(i, i + 4));
    }
    return parts.join(' ');
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.slice(0, 2) + '/' + v.slice(2, 4);
    }
    return v;
  };

  const handleCardNumberChange = (value: string) => {
    const formatted = formatCardNumber(value);
    if (formatted.length <= 19) {
      setCardNumber(formatted);
    }
  };

  const handleExpiryChange = (value: string) => {
    const formatted = formatExpiry(value);
    if (formatted.length <= 5) {
      setExpiry(formatted);
    }
  };

  const handleCvvChange = (value: string) => {
    const v = value.replace(/[^0-9]/gi, '');
    if (v.length <= 3) {
      setCvv(v);
    }
  };

  const validateForm = (): boolean => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (paymentMethod === 'card') {
      if (!cardNumber || cardNumber.replace(/\s/g, '').length !== 16) {
        setError('Please enter a valid 16-digit card number');
        return false;
      }
      if (!cardName || cardName.trim().length < 3) {
        setError('Please enter the cardholder name');
        return false;
      }
      if (!expiry || expiry.length !== 5) {
        setError('Please enter expiry date (MM/YY)');
        return false;
      }
      if (!cvv || cvv.length !== 3) {
        setError('Please enter a valid 3-digit CVV');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Create payment
      const paymentResponse = await api.post('/payments/create', {
        tierSlug,
        paymentMethod,
        email,
      });

      if (!paymentResponse.data?.success) {
        setError(paymentResponse.data?.error || 'Failed to create payment');
        setIsProcessing(false);
        return;
      }

      const transId = paymentResponse.data.transactionId;
      setTransactionId(transId);

      // Step 2: Simulate payment processing (in real app, this would use Stripe/YooKassa)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Confirm payment
      const confirmResponse = await api.post('/payments/confirm', {
        transactionId: transId,
      });

      if (!confirmResponse.data?.success) {
        setError(confirmResponse.data?.error || 'Payment failed');
        setIsProcessing(false);
        return;
      }

      setIsProcessing(false);
      setIsSuccess(true);

      // Wait 2 seconds before redirecting
      setTimeout(() => {
        if (onPaymentSuccess) {
          onPaymentSuccess();
        } else {
          router.back();
        }
      }, 2000);
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment processing failed');
      setIsProcessing(false);
    }
  };

  const handleNavigateBack = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      router.back();
    }
  };

  const paymentMethods = [
    { id: 'card' as const, name: 'Банковская карта', icon: 'card-outline' as const },
    { id: 'apple' as const, name: 'Apple Pay', icon: 'logo-apple' as const },
    { id: 'google' as const, name: 'Google Pay', icon: 'logo-google' as const },
    { id: 'sbp' as const, name: 'СБП', icon: 'phone-portrait-outline' as const },
  ];

  if (isSuccess) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <FloatingClouds />
        <Animated.View entering={FadeIn.duration(600)} style={styles.successContainer}>
          <LinearGradient
            colors={isDark ? ['rgba(34, 197, 94, 0.2)', 'rgba(16, 185, 129, 0.2)'] : ['rgba(34, 197, 94, 0.3)', 'rgba(16, 185, 129, 0.3)']}
            style={styles.successGradient}
          >
            <View style={[styles.successIcon, isDark && styles.successIconDark]}>
              <Ionicons name="checkmark" size={48} color="#ffffff" />
            </View>
            <Text style={[styles.successTitle, isDark && styles.successTitleDark]}>
              Оплата прошла успешно!
            </Text>
            <Text style={[styles.successText, isDark && styles.successTextDark]}>
              Подписка "{planName}" активирована. Спасибо за доверие! 💙
            </Text>
            <Text style={[styles.redirectText, isDark && styles.redirectTextDark]}>
              Перенаправление...
            </Text>
          </LinearGradient>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <FloatingClouds />
      
      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={handleNavigateBack}
          style={[styles.backButton, isDark && styles.backButtonDark]}
        >
          <Ionicons name="arrow-back" size={20} color={Theme.accent.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
          Оформление подписки
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Error Alert */}
        {error && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <LinearGradient
              colors={isDark ? ['rgba(220, 38, 38, 0.2)', 'rgba(185, 28, 28, 0.2)'] : ['rgba(220, 38, 38, 0.15)', 'rgba(185, 28, 28, 0.15)']}
              style={styles.errorAlert}
            >
              <View style={styles.errorContent}>
                <Ionicons name="alert-circle" size={20} color={isDark ? '#ef4444' : '#dc2626'} />
                <Text style={[styles.errorText, isDark && styles.errorTextDark]}>
                  {error}
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Order Summary */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <LinearGradient
            colors={isDark ? ['rgba(55, 65, 81, 0.5)', 'rgba(31, 41, 55, 0.5)'] : ['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.5)']}
            style={styles.card}
          >
            <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]}>Детали заказа</Text>
            <View style={styles.orderDetails}>
              <View style={styles.orderRow}>
                <Text style={[styles.orderLabel, isDark && styles.orderLabelDark]}>
                  План подписки
                </Text>
                <Text style={[styles.orderValue, isDark && styles.orderValueDark]}>
                  {planName}
                </Text>
              </View>
              <Separator />
              <View style={styles.orderRow}>
                <Text style={[styles.orderTotal, isDark && styles.orderTotalDark]}>
                  Итого к оплате
                </Text>
                <Text style={[styles.orderPrice, isDark && styles.orderPriceDark]}>
                  {planPrice}/мес
                </Text>
              </View>
              <Text style={[styles.orderNote, isDark && styles.orderNoteDark]}>
                * Следующее списание произойдет автоматически через месяц
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Payment Method Selection */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <LinearGradient
            colors={isDark ? ['rgba(55, 65, 81, 0.5)', 'rgba(31, 41, 55, 0.5)'] : ['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.5)']}
            style={styles.card}
          >
            <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]}>Способ оплаты</Text>
            <View style={styles.paymentMethods}>
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  onPress={() => setPaymentMethod(method.id)}
                  style={[
                    styles.paymentMethod,
                    paymentMethod === method.id && styles.paymentMethodActive,
                    isDark && styles.paymentMethodDark,
                    paymentMethod === method.id && isDark && styles.paymentMethodActiveDark,
                  ]}
                >
                  <Ionicons
                    name={method.icon}
                    size={24}
                    color={paymentMethod === method.id ? Theme.accent.primary : (isDark ? '#9ca3af' : '#64748b')}
                  />
                  <Text
                    style={[
                      styles.paymentMethodText,
                      paymentMethod === method.id && styles.paymentMethodTextActive,
                      isDark && styles.paymentMethodTextDark,
                      paymentMethod === method.id && isDark && styles.paymentMethodTextActiveDark,
                    ]}
                  >
                    {method.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Card Payment Form */}
        {paymentMethod === 'card' && (
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <LinearGradient
              colors={isDark ? ['rgba(55, 65, 81, 0.5)', 'rgba(31, 41, 55, 0.5)'] : ['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.5)']}
              style={styles.card}
            >
              <View style={styles.formContainer}>
                <Input
                  label="Email для чека"
                  placeholder="your@email.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  containerStyle={styles.input}
                />
                <Input
                  label="Номер карты"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChangeText={handleCardNumberChange}
                  keyboardType="number-pad"
                  containerStyle={styles.input}
                />
                <Input
                  label="Имя владельца карты"
                  placeholder="IVAN IVANOV"
                  value={cardName}
                  onChangeText={(text) => setCardName(text.toUpperCase())}
                  autoCapitalize="characters"
                  containerStyle={styles.input}
                />
                <View style={styles.row}>
                  <Input
                    label="Срок действия"
                    placeholder="MM/YY"
                    value={expiry}
                    onChangeText={handleExpiryChange}
                    keyboardType="number-pad"
                    containerStyle={styles.halfInput}
                  />
                  <Input
                    label="CVV"
                    placeholder="123"
                    value={cvv}
                    onChangeText={handleCvvChange}
                    keyboardType="number-pad"
                    secureTextEntry
                    containerStyle={styles.halfInput}
                  />
                </View>

                <View style={[styles.securityNotice, isDark && styles.securityNoticeDark]}>
                  <Ionicons name="lock-closed" size={16} color={isDark ? '#60a5fa' : '#3b82f6'} />
                  <Text style={[styles.securityText, isDark && styles.securityTextDark]}>
                    Ваши данные защищены шифрованием по стандарту PCI DSS
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isProcessing}
                  style={[styles.submitButton, isProcessing && styles.submitButtonDisabled]}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={Theme.accent.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitGradient}
                  >
                    {isProcessing ? (
                      <>
                        <ActivityIndicator color="#ffffff" size="small" />
                        <Text style={styles.submitText}>Обработка платежа...</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="lock-closed" size={20} color="#ffffff" />
                        <Text style={styles.submitText}>Оплатить {planPrice}</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Alternative Payment Methods */}
        {paymentMethod !== 'card' && (
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <LinearGradient
              colors={isDark ? ['rgba(55, 65, 81, 0.5)', 'rgba(31, 41, 55, 0.5)'] : ['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.5)']}
              style={[styles.card, styles.alternativePayment]}
            >
              <View style={[styles.alternativeIcon, isDark && styles.alternativeIconDark]}>
                <Ionicons
                  name={paymentMethods.find(m => m.id === paymentMethod)?.icon || 'card'}
                  size={32}
                  color="#ffffff"
                />
              </View>
              <Text style={[styles.alternativeTitle, isDark && styles.alternativeTitleDark]}>
                {paymentMethod === 'apple' && 'Оплата через Apple Pay'}
                {paymentMethod === 'google' && 'Оплата через Google Pay'}
                {paymentMethod === 'sbp' && 'Оплата через СБП'}
              </Text>
              <Text style={[styles.alternativeText, isDark && styles.alternativeTextDark]}>
                Для завершения оплаты вы будете перенаправлены в приложение
              </Text>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isProcessing}
                style={[styles.submitButton, isProcessing && styles.submitButtonDisabled]}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={Theme.accent.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {isProcessing ? (
                    <>
                      <ActivityIndicator color="#ffffff" size="small" />
                      <Text style={styles.submitText}>Перенаправление...</Text>
                    </>
                  ) : (
                    <Text style={styles.submitText}>
                      Продолжить с {paymentMethod === 'apple' ? 'Apple Pay' : paymentMethod === 'google' ? 'Google Pay' : 'СБП'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Security Notice */}
        <Animated.View entering={FadeInDown.duration(400).delay(400)}>
          <LinearGradient
            colors={isDark ? ['rgba(55, 65, 81, 0.4)', 'rgba(31, 41, 55, 0.4)'] : ['rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.4)']}
            style={styles.finalNotice}
          >
            <Text style={[styles.finalNoticeText, isDark && styles.finalNoticeTextDark]}>
              🔒 Безопасная оплата через защищенное соединение. Мы не храним данные вашей карты.
            </Text>
          </LinearGradient>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    gap: 12,
  },
  headerDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  backButtonDark: {
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  headerTitleDark: {
    color: '#f1f5f9',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  cardTitleDark: {
    color: '#f1f5f9',
  },
  orderDetails: {
    gap: 12,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  orderLabelDark: {
    color: '#94a3b8',
  },
  orderValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  orderValueDark: {
    color: '#f1f5f9',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  orderTotalDark: {
    color: '#f1f5f9',
  },
  orderPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  orderPriceDark: {
    color: '#f1f5f9',
  },
  orderNote: {
    fontSize: 11,
    color: '#64748b',
  },
  orderNoteDark: {
    color: '#94a3b8',
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  paymentMethod: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    gap: 8,
  },
  paymentMethodDark: {
    borderColor: 'rgba(55, 65, 81, 0.5)',
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
  },
  paymentMethodActive: {
    borderColor: Theme.accent.primary,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
  },
  paymentMethodActiveDark: {
    borderColor: Theme.accent.primary,
    backgroundColor: 'rgba(255, 107, 0, 0.2)',
  },
  paymentMethodText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  paymentMethodTextDark: {
    color: '#94a3b8',
  },
  paymentMethodTextActive: {
    color: Theme.accent.primary,
    fontWeight: '600',
  },
  paymentMethodTextActiveDark: {
    color: Theme.accent.secondary,
  },
  formContainer: {
    gap: 16,
  },
  input: {
    marginBottom: 0,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  securityNoticeDark: {
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderColor: 'rgba(96, 165, 250, 0.2)',
  },
  securityText: {
    flex: 1,
    fontSize: 11,
    color: '#1e40af',
  },
  securityTextDark: {
    color: '#93c5fd',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  alternativePayment: {
    alignItems: 'center',
    gap: 16,
  },
  alternativeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Theme.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alternativeIconDark: {
    backgroundColor: Theme.accent.secondary,
  },
  alternativeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  alternativeTitleDark: {
    color: '#f1f5f9',
  },
  alternativeText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  alternativeTextDark: {
    color: '#94a3b8',
  },
  finalNotice: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  finalNoticeText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  finalNoticeTextDark: {
    color: '#94a3b8',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successGradient: {
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    width: '100%',
    maxWidth: 400,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconDark: {
    backgroundColor: '#10b981',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  successTitleDark: {
    color: '#f1f5f9',
  },
  errorAlert: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
  },
  errorTextDark: {
    color: '#ef4444',
  },
  successText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  successTextDark: {
    color: '#94a3b8',
  },
  redirectText: {
    fontSize: 12,
    color: '#64748b',
  },
  redirectTextDark: {
    color: '#94a3b8',
  },
});
