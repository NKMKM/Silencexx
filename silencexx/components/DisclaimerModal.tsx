import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Checkbox from 'expo-checkbox';
import Animated, { 
  FadeIn, 
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { Theme } from '@/constants/theme';

interface DisclaimerModalProps {
  visible: boolean;
  onAccept: () => void;
  onReject: () => void;
}

interface CrisisKeyword {
  text: string;
  color: string;
  icon: string;
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({
  visible,
  onAccept,
  onReject,
}) => {
  const [isChecked, setIsChecked] = useState(false);
  const router = useRouter();
  const checkboxScale = useSharedValue(1);

  const crisisKeywords: CrisisKeyword[] = [
    { text: 'суицид / самовред', color: '#EF4444', icon: '⚠️' },
    { text: 'серьезная депрессия', color: '#A855F7', icon: '🧡' },
    { text: 'злоупотребление ПВ', color: '#F97316', icon: '⛔' },
    { text: 'психоз / галлюцинации', color: '#EC4899', icon: '🔮' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={() => {}} // Не закрывается
    >
      <View style={styles.backdrop}>
        <LinearGradient
          colors={[Theme.background.primary, '#0A0A0A', Theme.background.secondary]}
          style={styles.fullScreen}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Background animated elements */}
          <View style={styles.bgElements}>
            <View style={[styles.bgBlob, styles.blob1]} />
            <View style={[styles.bgBlob, styles.blob2]} />
          </View>

          <SafeAreaView style={styles.safeArea}>
            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.scrollContainer}
            >
              {/* Main content */}
              <Animated.View 
                style={styles.content}
                entering={FadeIn.duration(600).delay(200)}
              >
                {/* Header - Compact */}
                <View style={styles.header}>
                  <Text style={styles.mainTitle}>✨ Важная информация</Text>
                  <Text style={styles.mainSubtitle}>
                    Пожалуйста, ознакомьтесь перед началом
                  </Text>
                </View>

                {/* Disclaimer sections - Compact */}
                <View style={styles.sectionsContainer}>
                  {/* Section 1 */}
                  <Animated.View
                    entering={FadeIn.delay(300).duration(600)}
                    style={styles.section}
                  >
                    <LinearGradient
                      colors={['rgba(255, 107, 0, 0.1)', 'rgba(255, 140, 51, 0.05)']}
                      style={styles.sectionGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.sectionContent}>
                        <View style={styles.customIconContainer}>
                          <LinearGradient
                            colors={Theme.accent.gradient as unknown as [string, string]}
                            style={styles.customIcon}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Text style={styles.customIconText}>⚕️</Text>
                          </LinearGradient>
                        </View>
                        <View style={styles.sectionTextBlock}>
                          <Text style={styles.sectionHeader}>
                            Не диагноз или лечение
                          </Text>
                          <Text style={styles.sectionDesc}>
                            Поддержка и общение, но не замена врачу
                          </Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </Animated.View>

                  {/* Section 2 */}
                  <Animated.View
                    entering={FadeIn.delay(400).duration(600)}
                    style={styles.section}
                  >
                    <LinearGradient
                      colors={['rgba(255, 140, 51, 0.1)', 'rgba(255, 107, 0, 0.05)']}
                      style={styles.sectionGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.sectionContent}>
                        <View style={styles.customIconContainer}>
                          <LinearGradient
                            colors={Theme.accent.gradient as unknown as [string, string]}
                            style={styles.customIcon}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Text style={styles.customIconText}>🛡️</Text>
                          </LinearGradient>
                        </View>
                        <View style={styles.sectionTextBlock}>
                          <Text style={styles.sectionHeader}>
                            Защита от опасного контента
                          </Text>
                          <Text style={styles.sectionDesc}>
                            Система выявляет риски и справочные номера
                          </Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </Animated.View>

                  {/* Section 3 */}
                  <Animated.View
                    entering={FadeIn.delay(500).duration(600)}
                    style={styles.section}
                  >
                    <LinearGradient
                      colors={['rgba(239, 68, 68, 0.1)', 'rgba(249, 115, 115, 0.05)']}
                      style={styles.sectionGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.sectionContent}>
                        <View style={styles.customIconContainer}>
                          <LinearGradient
                            colors={['#EF4444', '#F97316']}
                            style={styles.customIcon}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Text style={styles.customIconText}>🆘</Text>
                          </LinearGradient>
                        </View>
                        <View style={styles.sectionTextBlock}>
                          <Text style={styles.sectionHeader}>
                            Всегда есть помощь
                          </Text>
                          <Text style={styles.sectionDesc}>
                            Горячие линии доступны 24/7: 8-800-333-44-34
                          </Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </Animated.View>
                </View>

                {/* Checkbox */}
                <Animated.View
                  entering={FadeIn.delay(600).duration(600)}
                  style={styles.checkboxSection}
                >
                  <TouchableOpacity
                    style={styles.checkboxWrapper}
                    onPress={() => setIsChecked(!isChecked)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.customCheckbox,
                      isChecked && styles.customCheckboxChecked
                    ]}>
                      {isChecked && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                    <Text style={styles.checkboxLabel}>
                      Я согласен(а) и готов(а)
                    </Text>
                  </TouchableOpacity>
                </Animated.View>

                {/* Button */}
                <Animated.View
                  entering={FadeIn.delay(700).duration(600)}
                  style={styles.buttonsSection}
                >
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      !isChecked && styles.primaryButtonDisabled
                    ]}
                    onPress={onAccept}
                    disabled={!isChecked}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={isChecked 
                        ? Theme.accent.gradient as unknown as [string, string]
                        : ['#94A3B8', '#CBD5E1']}
                      style={styles.buttonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.primaryButtonText}>Начать чат</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const handleEmergencyCall = (country: string = 'russia') => {
  const numbers: { [key: string]: string } = {
    russia: 'tel:+7-800-333-44-34',
    usa: 'tel:988',
    uk: 'tel:116-123',
    eu: 'tel:116-000',
  };

  const number = numbers[country] || numbers.russia;
  Linking.openURL(number).catch(() => {
    Alert.alert(
      'Экстренная помощь',
      'Если вы в опасности, пожалуйста, позвоните в скорую или на горячую линию психологической помощи.'
    );
  });
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  fullScreen: {
    flex: 1,
  },
  bgElements: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    zIndex: 0,
  },
  bgBlob: {
    position: 'absolute',
    borderRadius: 300,
    opacity: 0.12,
  },
  blob1: {
    width: 420,
    height: 420,
    backgroundColor: Theme.accent.primary,
    top: -120,
    left: -120,
  },
  blob2: {
    width: 320,
    height: 320,
    backgroundColor: Theme.accent.secondary,
    bottom: -70,
    right: -70,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: 620,
    zIndex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  mainTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: Theme.text.primary,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 38,
  },
  mainSubtitle: {
    fontSize: 17,
    color: Theme.text.secondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  sectionsContainer: {
    gap: 18,
    marginBottom: Theme.spacing.lg,
  },
  section: {
    borderRadius: Theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.accent.primary,
    backgroundColor: Theme.background.card,
  },
  sectionGradient: {
    padding: 20,
    borderWidth: 0,
  },
  sectionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 18,
  },
  customIconContainer: {
    marginTop: 2,
  },
  customIcon: {
    width: 60,
    height: 60,
    borderRadius: Theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.background.elevated,
    shadowColor: '#0A0A0F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  customIconText: {
    fontSize: 30,
  },
  sectionTextBlock: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: '700',
    color: Theme.text.primary,
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 15,
    color: Theme.text.secondary,
    lineHeight: 22,
  },
  checkboxSection: {
    marginBottom: 22,
  },
  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Theme.background.tertiary,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.border.primary,
  },
  customCheckbox: {
    width: 26,
    height: 26,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: Theme.border.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  customCheckboxChecked: {
    backgroundColor: Theme.accent.primary,
    borderColor: Theme.accent.primary,
  },
  checkmark: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Theme.text.primary,
  },
  buttonsSection: {
    gap: 14,
  },
  primaryButton: {
    borderRadius: Theme.radius.md,
    overflow: 'hidden',
    shadowColor: Theme.accent.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
