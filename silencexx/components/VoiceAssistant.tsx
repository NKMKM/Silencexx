import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
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
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

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
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: 'Привет. Я твой голосовой помощник. Нажми на облачко, чтобы начать говорить.',
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);

  // Анимации
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
        colors={['#eff6ff', '#f3e8ff', '#fce7f3']}
        style={styles.container}
      >
        {/* Header */}
        <BlurView intensity={80} tint="light" style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Ionicons name="volume-high" size={24} color="#8b5cf6" />
              <Text style={styles.headerTitle}>Голосовой помощник</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>Говорите с вашим AI-помощником</Text>
        </BlurView>

        {/* Main Area */}
        <View style={styles.mainArea}>
          {/* Animated Cloud */}
          <View style={styles.cloudContainer}>
            {/* Glow Effect */}
            <Animated.View
              style={[
                styles.glow,
                glowAnimatedStyle,
                {
                  backgroundColor: isListening
                    ? 'rgba(96, 165, 250, 0.4)'
                    : isSpeaking
                    ? 'rgba(167, 139, 250, 0.4)'
                    : 'rgba(192, 132, 252, 0.3)',
                },
              ]}
            />

            {/* Main Cloud Button */}
            <Animated.View style={cloudAnimatedStyle}>
              <TouchableOpacity
                onPress={handleToggleListening}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    isListening
                      ? ['#60a5fa', '#3b82f6']
                      : isSpeaking
                      ? ['#a78bfa', '#8b5cf6']
                      : ['#c084fc', '#f9a8d4']
                  }
                  style={styles.cloudButton}
                >
                  <Ionicons name="cloud" size={96} color="rgba(255,255,255,0.8)" />
                  
                  {/* Mic Icon */}
                  <View style={styles.micIconContainer}>
                    <Ionicons
                      name={isListening ? 'mic' : isSpeaking ? 'volume-high' : 'mic-off'}
                      size={48}
                      color="#fff"
                    />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Pulse Rings */}
            {isListening && (
              <View style={styles.pulseContainer}>
                {[0, 1, 2].map((i) => (
                  <PulseRing key={i} delay={i * 600} />
                ))}
              </View>
            )}
          </View>

          {/* Status Text */}
          <Text style={styles.statusText}>
            {isListening
              ? 'Слушаю вас...'
              : isSpeaking
              ? 'Отвечаю...'
              : 'Нажмите на облачко для начала'}
          </Text>

          {/* Control Button */}
          <TouchableOpacity onPress={handleToggleListening}>
            <LinearGradient
              colors={
                isListening
                  ? ['#ef4444', '#dc2626']
                  : ['#3b82f6', '#8b5cf6']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.controlButton}
            >
              <Ionicons
                name={isListening ? 'mic-off' : 'mic'}
                size={20}
                color="#fff"
              />
              <Text style={styles.controlButtonText}>
                {isListening ? 'Остановить' : 'Начать разговор'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Messages History */}
        <BlurView intensity={80} tint="light" style={styles.messagesContainer}>
          <Text style={styles.messagesTitle}>История разговора</Text>
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
                    colors={['#3b82f6', '#8b5cf6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.messageUser}
                  >
                    <Text style={styles.messageUserText}>{msg.text}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.messageAI}>
                    <Text style={styles.messageAIText}>{msg.text}</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </BlurView>
      </LinearGradient>
    </Modal>
  );
}

// Pulse Ring Component
function PulseRing({ delay }: { delay: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.5, { duration: 2000, easing: Easing.out(Easing.ease) }),
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
      style={[styles.pulseRing, animatedStyle, { animationDelay: `${delay}ms` }]}
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
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  closeButton: {
    padding: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  mainArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  cloudContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  glow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.3,
  },
  cloudButton: {
    width: 192,
    height: 192,
    borderRadius: 96,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  micIconContainer: {
    position: 'absolute',
  },
  pulseContainer: {
    position: 'absolute',
    width: 192,
    height: 192,
  },
  pulseRing: {
    position: 'absolute',
    width: 192,
    height: 192,
    borderRadius: 96,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  statusText: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 24,
    textAlign: 'center',
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  messagesContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: 200,
  },
  messagesTitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  messagesList: {
    flex: 1,
  },
  messageWrapper: {
    marginBottom: 8,
  },
  messageWrapperUser: {
    alignItems: 'flex-end',
  },
  messageWrapperAI: {
    alignItems: 'flex-start',
  },
  messageUser: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  messageUserText: {
    color: '#fff',
    fontSize: 14,
  },
  messageAI: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  messageAIText: {
    color: '#475569',
    fontSize: 14,
  },
});
