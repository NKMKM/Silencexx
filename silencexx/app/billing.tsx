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
import { Theme } from '@/constants/theme';

const { width } = Dimensions.get('window');

const plans = [
  {
    id: 1,
    name: 'Бесплатный',
    slug: 'free',
    price: '0₽',
    period: 'навсегда',
    icon: 'sparkles-outline' as const,
    gradient: ['#666666', '#444444'] as const,
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
    slug: 'plus',
    price: '99₽',
    period: 'в месяц',
    icon: 'star-outline' as const,
    gradient: ['#A855F7', '#C084FC'] as const,
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
    slug: 'pro',
    price: '299₽',
    period: 'в месяц',
    icon: 'flash-outline' as const,
    gradient: ['#C084FC', '#FFAD66'] as const,
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
  const isDark = true; // Force dark theme
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
        tierSlug: plan.slug,
      },
    });
  };

  return (
    <LinearGradient
      colors={Theme.accent.gradient}
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
              color={Theme.text.primary}
            />
          </TouchableOpacity>
          <Text
            style={[
              styles.headerTitle,
              { color: Theme.text.primary },
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
            { color: Theme.text.secondary },
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
                    backgroundColor: Theme.background.card,
                    borderColor:
                      selectedPlan.id === plan.id
                        ? Theme.accent.primary
                        : Theme.background.tertiary,
                    borderWidth: selectedPlan.id === plan.id ? 2 : 1,
                  },
                ]}
              >
                {/* Badges */}
                {plan.isPopular && (
                  <View style={styles.popularBadge}>
                    <LinearGradient
                      colors={['#A855F7', '#C084FC']}
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
                        { color: Theme.text.primary },
                      ]}
                    >
                      {plan.name}
                    </Text>
                    <View style={styles.priceRow}>
                      <Text
                        style={[
                          styles.planPrice,
                          { color: Theme.accent.primary },
                        ]}
                      >
                        {plan.price}
                      </Text>
                      <Text
                        style={[
                          styles.planPeriod,
                          { color: Theme.text.secondary },
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
                        color={Theme.accent.primary}
                      />
                      <Text
                        style={[
                          styles.featureText,
                          { color: Theme.text.secondary },
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
            { color: Theme.text.tertiary },
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
    backgroundColor: Theme.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 65,
    paddingHorizontal: 22,
    paddingBottom: Theme.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  backButton: {
    padding: 10,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.background.elevated,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Theme.text.primary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: Theme.text.secondary,
    lineHeight: 24,
  },
  planWrapper: {
    marginBottom: 22,
  },
  planCard: {
    borderRadius: Theme.radius.lg,
    padding: 22,
    backgroundColor: Theme.background.card,
    borderWidth: 1,
    borderColor: Theme.border.primary,
    shadowColor: '#0A0A0F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  popularBadge: {
    position: 'absolute',
    top: -14,
    left: '50%',
    transform: [{ translateX: -50 }],
    zIndex: 1,
  },
  currentBadge: {
    position: 'absolute',
    top: -14,
    right: 18,
    zIndex: 1,
  },
  badgeGradient: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Theme.radius.sm,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  planIcon: {
    width: 60,
    height: 60,
    borderRadius: Theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
    backgroundColor: Theme.background.elevated,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 5,
    color: Theme.text.primary,
    letterSpacing: -0.2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  planPrice: {
    fontSize: 26,
    fontWeight: '700',
    color: Theme.accent.primary,
  },
  planPeriod: {
    fontSize: 14,
    color: Theme.text.secondary,
  },
  featuresContainer: {
    gap: 14,
    marginBottom: 22,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
    color: Theme.text.primary,
  },
  subscribeButtonWrapper: {
    marginTop: 10,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: Theme.radius.md,
    shadowColor: Theme.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
    color: Theme.text.tertiary,
  },
});
