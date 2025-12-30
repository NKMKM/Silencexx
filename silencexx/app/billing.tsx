import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/utils/ThemeContext';

const { width } = Dimensions.get('window');

const plans = [
  {
    id: 1,
    name: 'Бесплатный',
    price: '0₽',
    period: 'навсегда',
    icon: 'sparkles-outline' as const,
    gradient: ['#94a3b8', '#64748b'] as const,
    features: [
      '5 сообщений в день',
      '1 голосовое сообщение в день',
      '3 анализа настроения в день',
      '1 запись в журнал в день',
      'История чатов 30 дней',
      'Базовые упражнения',
    ],
    isCurrent: true,
  },
  {
    id: 2,
    name: 'Плюс',
    price: '99₽',
    period: 'в месяц',
    icon: 'star-outline' as const,
    gradient: ['#a78bfa', '#ec4899'] as const,
    features: [
      '50 сообщений в день',
      'Неограниченные голосовые сообщения',
      'Неограниченные анализы настроения',
      'Неограниченные записи в журнал',
      'История чатов 6 месяцев',
      'Синтез речи (озвучка)',
      'Экспорт дневника',
    ],
    isPopular: true,
  },
  {
    id: 3,
    name: 'Профессиональный',
    price: '299₽',
    period: 'в месяц',
    icon: 'flash-outline' as const,
    gradient: ['#60a5fa', '#06b6d4'] as const,
    features: [
      '200 сообщений в день',
      'Неограниченные голосовые сообщения',
      'Неограниченные анализы настроения',
      'Неограниченные записи в журнал',
      'Полная история чатов',
      'Синтез речи (озвучка)',
      'Экспорт дневника',
      'Приоритетная обработка запросов',
    ],
  },
];

export default function BillingScreen() {
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState(plans[1]);

  const handleSubscribe = (plan: typeof plans[0]) => {
    if (plan.id === 1) {
      // Already on free plan
      return;
    }
    // Navigate to payment screen with plan details
    router.push({
      pathname: '/payment',
      params: {
        planName: plan.name,
        planPrice: plan.price,
      },
    });
  };

  return (
    <LinearGradient
      colors={
        isDark
          ? ['#0f172a', '#1e293b', '#334155']
          : ['#e0e7ff', '#ddd6fe', '#e9d5ff']
      }
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={isDark ? '#e2e8f0' : '#1e293b'}
            />
          </TouchableOpacity>
          <Text
            style={[
              styles.headerTitle,
              { color: isDark ? '#e2e8f0' : '#1e293b' },
            ]}
          >
            Подписки
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Subtitle */}
        <Text
          style={[
            styles.subtitle,
            { color: isDark ? '#94a3b8' : '#64748b' },
          ]}
        >
          Выберите подходящий план
        </Text>

        {/* Plans */}
        {plans.map((plan, index) => (
          <Animated.View
            key={plan.id}
            entering={FadeInDown.delay(index * 100).springify()}
            style={styles.planWrapper}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setSelectedPlan(plan)}
            >
              <View
                style={[
                  styles.planCard,
                  {
                    backgroundColor: isDark
                      ? 'rgba(30, 41, 59, 0.6)'
                      : 'rgba(255, 255, 255, 0.6)',
                    borderColor:
                      selectedPlan.id === plan.id
                        ? isDark
                          ? '#a78bfa'
                          : '#8b5cf6'
                        : isDark
                        ? 'rgba(71, 85, 105, 0.3)'
                        : 'rgba(226, 232, 240, 0.5)',
                    borderWidth: selectedPlan.id === plan.id ? 2 : 1,
                  },
                ]}
              >
                {/* Badges */}
                {plan.isPopular && (
                  <View style={styles.popularBadge}>
                    <LinearGradient
                      colors={['#a78bfa', '#ec4899']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.badgeGradient}
                    >
                      <Text style={styles.badgeText}>Популярный</Text>
                    </LinearGradient>
                  </View>
                )}
                {plan.isCurrent && (
                  <View style={styles.currentBadge}>
                    <LinearGradient
                      colors={['#10b981', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.badgeGradient}
                    >
                      <Text style={styles.badgeText}>Текущий</Text>
                    </LinearGradient>
                  </View>
                )}

                {/* Header */}
                <View style={styles.planHeader}>
                  <LinearGradient
                    colors={plan.gradient}
                    style={styles.planIcon}
                  >
                    <Ionicons name={plan.icon} size={28} color="#fff" />
                  </LinearGradient>
                  <View style={styles.planInfo}>
                    <Text
                      style={[
                        styles.planName,
                        { color: isDark ? '#e2e8f0' : '#1e293b' },
                      ]}
                    >
                      {plan.name}
                    </Text>
                    <View style={styles.priceRow}>
                      <Text
                        style={[
                          styles.planPrice,
                          { color: isDark ? '#c4b5fd' : '#7c3aed' },
                        ]}
                      >
                        {plan.price}
                      </Text>
                      <Text
                        style={[
                          styles.planPeriod,
                          { color: isDark ? '#94a3b8' : '#64748b' },
                        ]}
                      >
                        {plan.period}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Features */}
                <View style={styles.featuresContainer}>
                  {plan.features.map((feature, featureIndex) => (
                    <View key={featureIndex} style={styles.featureRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={isDark ? '#a78bfa' : '#8b5cf6'}
                      />
                      <Text
                        style={[
                          styles.featureText,
                          { color: isDark ? '#cbd5e1' : '#475569' },
                        ]}
                      >
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Subscribe Button */}
                {!plan.isCurrent && (
                  <TouchableOpacity
                    onPress={() => handleSubscribe(plan)}
                    style={styles.subscribeButtonWrapper}
                  >
                    <LinearGradient
                      colors={plan.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.subscribeButton}
                    >
                      <Text style={styles.subscribeButtonText}>
                        Подписаться
                      </Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}

        {/* Footer */}
        <Text
          style={[
            styles.footerText,
            { color: isDark ? '#64748b' : '#94a3b8' },
          ]}
        >
          Подписку можно отменить в любое время. Автоматическое продление.
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  planWrapper: {
    marginBottom: 20,
  },
  planCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: [{ translateX: -50 }],
    zIndex: 1,
  },
  currentBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    zIndex: 1,
  },
  badgeGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  planIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700',
  },
  planPeriod: {
    fontSize: 14,
  },
  featuresContainer: {
    gap: 12,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
  },
  subscribeButtonWrapper: {
    marginTop: 8,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
