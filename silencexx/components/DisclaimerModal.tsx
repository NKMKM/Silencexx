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
    { text: 'серьезная депрессия', color: '#A855F7', icon: '💜' },
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
          colors={['#0F172A', '#1E1B4B', '#3B2667']}
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
                      colors={['rgba(99, 102, 241, 0.1)', 'rgba(168, 85, 247, 0.05)']}
                      style={styles.sectionGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.sectionContent}>
                        <View style={styles.customIconContainer}>
                          <LinearGradient
                            colors={['#6366F1', '#A855F7']}
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
                      colors={['rgba(168, 85, 247, 0.1)', 'rgba(236, 72, 153, 0.05)']}
                      style={styles.sectionGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.sectionContent}>
                        <View style={styles.customIconContainer}>
                          <LinearGradient
                            colors={['#A855F7', '#EC4899']}
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
                        ? ['#6366F1', '#A855F7']
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
    opacity: 0.15,
  },
  blob1: {
    width: 400,
    height: 400,
    backgroundColor: '#6366F1',
    top: -100,
    left: -100,
  },
  blob2: {
    width: 300,
    height: 300,
    backgroundColor: '#A855F7',
    bottom: -50,
    right: -50,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    zIndex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 36,
  },
  mainSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontWeight: '500',
  },
  sectionsContainer: {
    gap: 16,
    marginBottom: 28,
  },
  section: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  sectionGradient: {
    padding: 18,
    borderWidth: 0,
  },
  sectionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  customIconContainer: {
    marginTop: 2,
  },
  customIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  customIconText: {
    fontSize: 28,
  },
  sectionTextBlock: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  sectionDesc: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 21,
  },
  checkboxSection: {
    marginBottom: 20,
  },
  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  customCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  customCheckboxChecked: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonsSection: {
    gap: 12,
  },
  primaryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
