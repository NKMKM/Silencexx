import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/utils/ThemeContext';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface VoiceAssistantProps {
  visible: boolean;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export function VoiceAssistant({ visible, onClose }: VoiceAssistantProps) {
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (isListening) {
      // Анимация прослушивания
      scale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.1, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      rotate.value = withRepeat(
        withSequence(
          withTiming(5, { duration: 500 }),
          withTiming(-5, { duration: 500 })
        ),
        -1,
        true
      );
      pulseScale.value = withRepeat(
        withTiming(1.5, { duration: 1500, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
      glowOpacity.value = withTiming(0.6, { duration: 300 });
    } else if (isSpeaking) {
      // Анимация говорения
      scale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 400 }),
          withTiming(1.03, { duration: 400 })
        ),
        -1,
        true
      );
      rotate.value = 0;
      glowOpacity.value = withTiming(0.5, { duration: 300 });
    } else {
      // Idle анимация
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      rotate.value = withRepeat(
        withSequence(
          withTiming(2, { duration: 1000 }),
          withTiming(-2, { duration: 1000 })
        ),
        -1,
        true
      );
      glowOpacity.value = withTiming(0.3, { duration: 300 });
    }
  }, [isListening, isSpeaking]);

  const cloudAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [
      { scale: isListening ? pulseScale.value : isSpeaking ? 1.4 : 1 },
    ],
  }));

  const handleToggleListening = () => {
    if (isListening) {
      setIsListening(false);
      // Симуляция завершения распознавания и получения текста
      setTimeout(() => {
        const mockTexts = [
          'Я чувствую себя немного уставшим сегодня',
          'Мне нужно поговорить о своих переживаниях',
          'Как справиться со стрессом?',
          'Расскажи мне что-нибудь успокаивающее',
          'Я беспокоюсь о будущем',
        ];
        const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
        
        const userMessage: Message = {
          id: messages.length + 1,
          text: randomText,
          sender: 'user',
          timestamp: new Date(),
        };
        setMessages([...messages, userMessage]);

        // Ответ AI
        setTimeout(() => {
          setIsSpeaking(true);
          const responses = [
            'Я слышу тебя. Усталость — это нормально. Позволь себе отдохнуть.',
            'Спасибо, что поделился. Твои чувства важны. Я здесь, чтобы слушать.',
            'Стресс может быть тяжёлым. Попробуй дышать глубже. Вдох... выдох...',
            'Представь себе облака, плывущие по небу. Медленно, спокойно. Всё будет хорошо.',
            'Тревога о будущем — это часть жизни. Но сейчас ты здесь, в безопасности.',
          ];
          const response = responses[Math.floor(Math.random() * responses.length)];
          
          const aiMessage: Message = {
            id: messages.length + 2,
            text: response,
            sender: 'ai',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);

          setTimeout(() => {
            setIsSpeaking(false);
          }, 3000);
        }, 1000);
      }, 500);
    } else {
      setIsListening(true);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={isDark ? ['#1a1a2e', '#16213e', '#0f3460', '#1a1a2e'] : ['#eff6ff', '#f3e8ff', '#fce7f3']}
        style={styles.container}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)' }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconContainer, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(139, 92, 246, 0.2)' }]}>
                <Ionicons name="sparkles" size={20} color={isDark ? '#818cf8' : '#8b5cf6'} />
              </View>
              <Text style={[styles.headerTitle, { color: isDark ? '#e2e8f0' : '#1e293b' }]}>Голосовой AI</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={isDark ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Area */}
        <View style={styles.mainArea}>
          {/* Status Text at Top */}
          <Text style={[styles.statusText, { color: isDark ? '#cbd5e1' : '#475569' }]}>
            {isListening
              ? 'Слушаю вас...'
              : isSpeaking
              ? 'Отвечаю...'
              : 'Нажмите на кнопку для начала'}
          </Text>

          {/* Animated Mic Visualization */}
          <View style={styles.micContainer}>
            {/* Outer Glow Rings */}
            {isListening && (
              <View style={styles.pulseContainer}>
                {[0, 1, 2].map((i) => (
                  <PulseRing key={i} delay={i * 600} isDark={isDark} />
                ))}
              </View>
            )}

            {/* Animated Glow Background */}
            <Animated.View
              style={[
                styles.glow,
                glowAnimatedStyle,
                {
                  backgroundColor: isListening
                    ? 'rgba(99, 102, 241, 0.3)'
                    : isSpeaking
                    ? 'rgba(168, 85, 247, 0.3)'
                    : 'rgba(129, 140, 248, 0.2)',
                },
              ]}
            />

            {/* Main Mic Button */}
            <Animated.View style={cloudAnimatedStyle}>
              <TouchableOpacity
                onPress={handleToggleListening}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    isListening
                      ? ['#6366f1', '#a855f7']
                      : isSpeaking
                      ? ['#a855f7', '#ec4899']
                      : ['#818cf8', '#6366f1']
                  }
                  style={[styles.micButton, {
                    shadowColor: isListening ? '#6366f1' : isSpeaking ? '#a855f7' : '#818cf8',
                  }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons
                    name={isListening ? 'mic' : isSpeaking ? 'volume-high' : 'mic-outline'}
                    size={64}
                    color="#ffffff"
                  />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Waveform Visualization for Speaking */}
            {isSpeaking && (
              <View style={styles.waveformContainer}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <WaveformBar key={i} delay={i * 100} isDark={isDark} />
                ))}
              </View>
            )}
          </View>

          {/* Control Button */}
          <TouchableOpacity onPress={handleToggleListening} style={styles.controlButtonWrapper}>
            <LinearGradient
              colors={
                isListening
                  ? ['#ef4444', '#dc2626']
                  : isDark
                  ? ['rgba(30, 41, 59, 0.8)', 'rgba(30, 41, 59, 0.6)']
                  : ['#e0e7ff', '#ddd6fe']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.controlButton, {
                borderWidth: isListening ? 0 : 1.5,
                borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(139, 92, 246, 0.3)',
              }]}
            >
              <Ionicons
                name={isListening ? 'stop-circle' : 'mic'}
                size={20}
                color={isListening ? '#fff' : isDark ? '#818cf8' : '#6366f1'}
              />
              <Text style={[styles.controlButtonText, {
                color: isListening ? '#fff' : isDark ? '#818cf8' : '#6366f1',
              }]}>
                {isListening ? 'Остановить' : 'Начать разговор'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Messages History */}
        <View style={[styles.messagesContainer, {
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          borderTopColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.3)',
        }]}>
          <Text style={[styles.messagesTitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            История разговора
          </Text>
          <ScrollView style={styles.messagesList} showsVerticalScrollIndicator={false}>
            {messages.slice(-5).map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.messageWrapper,
                  msg.sender === 'user' ? styles.messageWrapperUser : styles.messageWrapperAI,
                ]}
              >
                {msg.sender === 'user' ? (
                  <LinearGradient
                    colors={['#6366f1', '#a855f7']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.messageUser}
                  >
                    <Text style={styles.messageUserText}>{msg.text}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.messageAI, {
                    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.4)',
                    borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                  }]}>
                    <Text style={[styles.messageAIText, { color: isDark ? '#cbd5e1' : '#475569' }]}>
                      {msg.text}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </LinearGradient>
    </Modal>
  );
}

// Pulse Ring Component
function PulseRing({ delay, isDark }: { delay: number; isDark: boolean }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(2, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        animatedStyle,
        { borderColor: isDark ? 'rgba(99, 102, 241, 0.5)' : 'rgba(255, 255, 255, 0.5)' }
      ]}
    />
  );
}

// Waveform Bar Component
function WaveformBar({ delay, isDark }: { delay: number; isDark: boolean }) {
  const height = useSharedValue(20);

  useEffect(() => {
    height.value = withRepeat(
      withSequence(
        withTiming(Math.random() * 60 + 20, { duration: 300 }),
        withTiming(Math.random() * 60 + 20, { duration: 300 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        styles.waveformBar,
        animatedStyle,
        { backgroundColor: isDark ? '#818cf8' : '#a855f7' }
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 8,
  },
  mainArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  statusText: {
    fontSize: 18,
    marginBottom: 40,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  micContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
    width: 240,
    height: 240,
  },
  glow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  micButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  pulseContainer: {
    position: 'absolute',
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
  },
  waveformContainer: {
    position: 'absolute',
    bottom: -60,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 80,
  },
  waveformBar: {
    width: 6,
    borderRadius: 3,
  },
  controlButtonWrapper: {
    width: '100%',
    maxWidth: 280,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  messagesContainer: {
    borderTopWidth: 1.5,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: 220,
  },
  messagesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  messagesList: {
    flex: 1,
  },
  messageWrapper: {
    marginBottom: 10,
  },
  messageWrapperUser: {
    alignItems: 'flex-end',
  },
  messageWrapperAI: {
    alignItems: 'flex-start',
  },
  messageUser: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  messageUserText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  messageAI: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  messageAIText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
