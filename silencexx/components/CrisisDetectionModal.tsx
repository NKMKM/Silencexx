import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeIn, 
  SlideInUp,
} from 'react-native-reanimated';

interface CrisisDetectionModalProps {
  visible: boolean;
  message: string;
  isCrisis: boolean;
  onClose: () => void;
  onDismiss?: () => void;
}

const CRISIS_RESOURCES = [
  {
    name: 'Всероссийский телефон доверия',
    number: '8-800-333-44-34',
    url: 'tel:+7-800-333-44-34',
    country: '🇷🇺',
    available: '24/7',
  },
  {
    name: 'Suicide & Crisis Lifeline',
    number: '988',
    url: 'tel:988',
    country: '🇺🇸',
    available: '24/7',
  },
  {
    name: 'Samaritans',
    number: '116 123',
    url: 'tel:116-123',
    country: '🇬🇧',
    available: '24/7',
  },
  {
    name: 'LifeCall',
    number: '0800 111 4455',
    url: 'tel:0800-111-4455',
    country: '🇪🇺',
    available: '24/7',
  },
];

export const CrisisDetectionModal: React.FC<CrisisDetectionModalProps> = ({
  visible,
  message,
  isCrisis,
  onClose,
  onDismiss,
}) => {
  const [autoClose, setAutoClose] = useState(false);

  useEffect(() => {
    if (isCrisis && visible) {
      // Автоматически закрыть через 60 секунд, если не взаимодействовали
      const timer = setTimeout(() => {
        setAutoClose(true);
      }, 60000);

      return () => clearTimeout(timer);
    }
  }, [isCrisis, visible]);

  const handleCall = (url: string, name: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert(
        'Невозможно открыть номер',
        `Пожалуйста, позвоните на номер: ${name}`
      );
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <LinearGradient
          colors={isCrisis 
            ? ['#7C2D12', '#5B21B6', '#1E1B4B']
            : ['#0F172A', '#1E3A8A', '#1E1B4B']}
          style={styles.fullScreen}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Background blobs */}
          <View style={styles.bgElements}>
            <View style={[styles.bgBlob, 
              isCrisis ? styles.blobCrisis1 : styles.blob1
            ]} />
            <View style={[styles.bgBlob, 
              isCrisis ? styles.blobCrisis2 : styles.blob2
            ]} />
          </View>

          <SafeAreaView style={styles.safeArea}>
            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Close button */}
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={onClose}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>

              {/* Main content */}
              <Animated.View 
                style={styles.content}
                entering={FadeIn.duration(600).delay(200)}
              >
                {/* Header */}
                <View style={styles.header}>
                  <Animated.View 
                    style={[
                      styles.iconWrapper,
                      isCrisis && styles.iconWrapperCrisis
                    ]}
                    entering={SlideInUp.springify().damping(14).delay(400)}
                  >
                    <LinearGradient
                      colors={isCrisis 
                        ? ['#EF4444', '#DC2626']
                        : ['#3B82F6', '#1D4ED8']}
                      style={styles.iconBg}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.headerIcon}>
                        {isCrisis ? '🆘' : '⚠️'}
                      </Text>
                    </LinearGradient>
                  </Animated.View>
                  
                  <Text style={[styles.mainTitle, isCrisis && styles.mainTitleCrisis]}>
                    {isCrisis
                      ? 'Обнаружены признаки кризиса'
                      : 'Обнаружен чувствительный контент'}
                  </Text>
                  <Text style={styles.mainSubtitle}>
                    {isCrisis
                      ? 'Профессионалы готовы помочь вам'
                      : 'Пожалуйста, будьте осторожны'}
                  </Text>
                </View>

                {/* Message display */}
                <Animated.View
                  entering={FadeIn.delay(300).duration(600)}
                  style={styles.messageSection}
                >
                  <LinearGradient
                    colors={isCrisis
                      ? ['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.05)']
                      : ['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.05)']}
                    style={styles.messageGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.messageContent}>
                      <Text style={styles.messageLabel}>Ваше сообщение:</Text>
                      <Text style={styles.messageText}>"{message}"</Text>
                    </View>
                  </LinearGradient>
                </Animated.View>

                {/* Crisis warning */}
                {isCrisis && (
                  <Animated.View
                    entering={FadeIn.delay(400).duration(600)}
                    style={styles.warningSection}
                  >
                    <View style={styles.warningBox}>
                      <Text style={styles.warningIcon}>🚨</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.warningTitle}>Это важно</Text>
                        <Text style={styles.warningText}>
                          Если вы в непосредственной опасности, позвоните в скорую (911, 112, 999)
                        </Text>
                      </View>
                    </View>
                  </Animated.View>
                )}

                {/* Resources section */}
                <Animated.View
                  entering={FadeIn.delay(isCrisis ? 500 : 400).duration(600)}
                  style={styles.resourcesSection}
                >
                  <Text style={styles.resourcesTitle}>
                    {isCrisis ? '📞 Горячие линии помощи' : '📞 Справочные ресурсы'}
                  </Text>
                  <Text style={styles.resourcesSubtitle}>
                    {isCrisis 
                      ? 'Специалисты готовы помочь 24/7'
                      : 'Профессионалы в области психического здоровья'}
                  </Text>

                  <View style={styles.resourcesList}>
                    {CRISIS_RESOURCES.slice(0, 2).map((resource, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.resourceCard, isCrisis && styles.resourceCardCrisis]}
                        onPress={() => handleCall(resource.url, resource.number)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.resourceContent}>
                          <Text style={styles.resourceCountry}>{resource.country}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.resourceName}>{resource.name}</Text>
                            <Text style={styles.resourceNumber}>{resource.number}</Text>
                          </View>
                          <Text style={styles.resourceArrow}>→</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Animated.View>

                {/* Tips section */}
                {!isCrisis && (
                  <Animated.View
                    entering={FadeIn.delay(500).duration(600)}
                    style={styles.tipsSection}
                  >
                    <Text style={styles.tipsTitle}>💡 Помните</Text>
                    <View style={styles.tipsList}>
                      <Text style={styles.tipItem}>
                        • Ваша безопасность — приоритет
                      </Text>
                      <Text style={styles.tipItem}>
                        • Профессионалы всегда готовы помочь
                      </Text>
                    </View>
                  </Animated.View>
                )}

                {/* Buttons */}
                <Animated.View
                  entering={FadeIn.delay(isCrisis ? 600 : 550).duration(600)}
                  style={styles.buttonsSection}
                >
                  {isCrisis && (
                    <TouchableOpacity
                      style={styles.emergencyButton}
                      onPress={() => handleCall('tel:112', 'Скорая помощь')}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#EF4444', '#DC2626']}
                        style={styles.emergencyGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={styles.emergencyText}>🚑 Вызвать скорую</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={onClose}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={isCrisis 
                        ? ['#10B981', '#059669']
                        : ['#6366F1', '#4F46E5']}
                      style={styles.primaryGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.primaryText}>
                        {isCrisis ? 'Я получу помощь' : 'Я понимаю'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {!isCrisis && onDismiss && (
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={onDismiss}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.secondaryText}>Продолжить</Text>
                    </TouchableOpacity>
                  )}
                </Animated.View>
              </Animated.View>
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </View>
    </Modal>
  );
};;

const styles = StyleSheet.create({
  // Dark themed backdrop and main container
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  fullScreen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  
  // Background elements
  bgElements: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bgBlob: {
    position: 'absolute',
    borderRadius: 500,
    opacity: 0.3,
  },
  blob1: {
    width: 300,
    height: 300,
    backgroundColor: 'rgba(99, 102, 241, 0.4)',
    top: -80,
    right: -50,
  },
  blob2: {
    width: 250,
    height: 250,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    bottom: -60,
    left: -40,
  },
  blobCrisis1: {
    width: 300,
    height: 300,
    backgroundColor: 'rgba(239, 68, 68, 0.35)',
    top: -80,
    right: -50,
  },
  blobCrisis2: {
    width: 250,
    height: 250,
    backgroundColor: 'rgba(220, 38, 38, 0.3)',
    bottom: -60,
    left: -40,
  },

  // Layout
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  content: {
    paddingBottom: 20,
  },

  // Close button
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconWrapper: {
    marginBottom: 16,
  },
  iconWrapperCrisis: {
    // Crisis version uses red gradient
  },
  iconBg: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  headerIcon: {
    fontSize: 36,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  mainTitleCrisis: {
    color: '#FCA5A5',
  },
  mainSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Message section
  messageSection: {
    marginBottom: 20,
  },
  messageGradient: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  messageContent: {},
  messageLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontStyle: 'italic',
    lineHeight: 21,
  },

  // Warning section
  warningSection: {
    marginBottom: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  warningIcon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FCA5A5',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 19,
  },

  // Resources section
  resourcesSection: {
    marginBottom: 24,
  },
  resourcesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  resourcesSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 14,
    fontWeight: '500',
  },
  resourcesList: {
    gap: 10,
  },
  resourceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  resourceCardCrisis: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  resourceContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resourceCountry: {
    fontSize: 24,
    marginRight: 12,
  },
  resourceName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  resourceNumber: {
    fontSize: 12,
    color: '#60A5FA',
    fontWeight: '600',
  },
  resourceArrow: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '600',
    marginLeft: 8,
  },

  // Tips section
  tipsSection: {
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  tipsList: {
    gap: 6,
  },
  tipItem: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 19,
    fontWeight: '500',
  },

  // Buttons section
  buttonsSection: {
    marginBottom: 20,
  },
  emergencyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  emergencyGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  primaryGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
