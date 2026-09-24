import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Theme } from '@/constants/theme';
import * as Speech from 'expo-speech';
import Constants from 'expo-constants';
import { NativeModules } from 'react-native';
import { ChatMessage } from '@/services/api';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface VoiceAssistantProps {
  visible: boolean;
  onClose: () => void;
}

const { height } = Dimensions.get('window');

export function VoiceAssistant({ visible, onClose }: VoiceAssistantProps) {
  const isDark = true; // Force dark theme
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState('');
  const [voiceReady, setVoiceReady] = useState(false);
  const [voiceModule, setVoiceModule] = useState<any>(null);
  const msgCounterRef = useRef<number>(Date.now());

  const uid = () => {
    msgCounterRef.current += 1;
    return `va-${Date.now()}-${msgCounterRef.current}`;
  };

  // Lazy load voice recognition to avoid crash if module отсутствует
  useEffect(() => {
    let mounted = true;
    // Expo Go: модуль отсутствует
    if (Constants?.appOwnership === 'expo' || !NativeModules?.Voice) {
      setVoiceReady(false);
      setVoiceModule(null);
      return;
    }

    (async () => {
      try {
        const Voice = (await import('react-native-voice')).default;
        if (mounted && Voice) {
          setVoiceModule(Voice);
          Voice.onSpeechResults = (e: any) => {
            if (e.value && e.value.length > 0) {
              setTranscript(e.value[0]);
            }
          };
          Voice.onSpeechEnd = () => setIsListening(false);
          Voice.onSpeechError = () => setIsListening(false);
          setVoiceReady(true);
        }
      } catch (error) {
        console.warn('[VoiceAssistant] react-native-voice не найден или не поддерживается.');
        setVoiceReady(false);
      }
    })();

    return () => {
      mounted = false;
      if (voiceModule?.destroy) {
        voiceModule.destroy();
      }
    };
  }, []);

  const pulse = useSharedValue(1);
  const glow = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 800 }),
        withTiming(0.35, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: isListening ? 1.3 : 1.1 }],
  }));

  const handleToggle = () => {
    if (isListening) {
      finishRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    if (!voiceReady || !voiceModule) {
      Alert.alert('Речь', 'Распознавание речи доступно только в dev-сборке с react-native-voice.');
      return;
    }
    try {
      setTranscript('');
      setIsListening(true);
      await voiceModule.start('ru-RU');
    } catch (e) {
      console.warn('Error starting voice', e);
      setIsListening(false);
    }
  };

  const finishRecording = async () => {
    setIsListening(false);
    if (voiceModule?.stop) {
      try {
        await voiceModule.stop();
      } catch (e) {
        console.warn('Error stopping voice', e);
      }
    }
    const spoken = transcript.trim();
    if (!spoken) {
      Alert.alert('Речь', 'Фраза не распознана. Попробуйте снова.');
      return;
    }
    setTranscript('');
    sendToAI(spoken);
  };

  const sendToAI = async (text: string) => {
    const userId = uid();
    const aiId = uid();
    const userMessage: Message = {
      id: userId,
      text,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsThinking(true);
    try {
      const { chatApi } = await import('@/services/api');
      const history: ChatMessage[] = [...messages, userMessage].map<ChatMessage>((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text,
      }));
      const response = await chatApi.sendMessage({ message: text, conversationHistory: history });
      const aiMessage: Message = {
        id: aiId,
        text: response.response || '...',
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      if (Speech.speak) {
        Speech.speak(aiMessage.text, {
          language: 'ru-RU',
          pitch: 1.0,
          rate: 0.95,
        });
      }
    } catch (error) {
      console.warn('AI error', error);
    } finally {
      setIsThinking(false);
    }
  };

  const statusText = isListening ? 'Слушаю...' : isThinking ? 'Думаю...' : transcript ? transcript : 'Нажмите и говорите';

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <LinearGradient
        colors={Theme.accent.gradient}
        style={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.headerIcon,
                { backgroundColor: 'rgba(255, 107, 0, 0.18)' },
              ]}
            >
              <Ionicons name="pulse" size={20} color={Theme.accent.primary} />
            </View>
            <Text style={[styles.headerTitle, { color: Theme.text.primary }]}>
              Голосовой ИИ
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Theme.text.secondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.main}>
          <Text style={[styles.status, { color: Theme.text.secondary }]}>
            {statusText}
          </Text>

          <View style={styles.orbContainer}>
            <Animated.View
              style={[
                styles.glow,
                glowStyle,
                {
                  backgroundColor: isListening
                    ? 'rgba(96, 165, 250, 0.4)'
                    : isThinking
                    ? 'rgba(255, 140, 51, 0.35)'
                    : 'rgba(255, 107, 0, 0.3)',
                },
              ]}
            />
            <Animated.View style={[styles.orb, orbStyle]}>
              <LinearGradient
                colors={Theme.accent.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.orb}
              />
            </Animated.View>
          </View>

          <TouchableOpacity
            onPress={handleToggle}
            activeOpacity={0.9}
            style={[
              styles.micButton,
              {
                shadowColor: Theme.accent.primary,
                borderColor: isListening ? Theme.accent.secondary : Theme.accent.primary,
              },
            ]}
          >
            <LinearGradient
              colors={Theme.accent.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 80, opacity: 0.55 }]}
            />
            <Ionicons
              name={isListening ? 'mic' : 'mic-outline'}
              size={48}
              color="#fff"
            />
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.history,
            {
              backgroundColor: Theme.background.card,
              borderColor: Theme.background.tertiary,
            },
          ]}
        >
          <Text style={[styles.historyTitle, { color: Theme.text.secondary }]}>
            История
          </Text>
          <ScrollView style={{ maxHeight: height * 0.25 }} showsVerticalScrollIndicator={false}>
            {messages.length === 0 ? (
              <Text style={{ color: Theme.text.tertiary }}>
                Пока нет сообщений
              </Text>
            ) : (
              messages.slice(-6).map((msg, idx) => (
                <View
                  key={`${msg.id}-${idx}`}
                  style={[
                    styles.bubbleWrapper,
                    msg.sender === 'user' ? styles.bubbleRight : styles.bubbleLeft,
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      msg.sender === 'user'
                        ? { backgroundColor: Theme.accent.primary }
                        : {
                            backgroundColor: 'rgba(15, 23, 42, 0.55)',
                            borderColor: Theme.background.tertiary,
                          },
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        { color: msg.sender === 'user' ? '#fff' : Theme.text.primary },
                      ]}
                    >
                      {msg.text}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 22,
    paddingBottom: Theme.spacing.lg,
    backgroundColor: Theme.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.background.elevated,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: Theme.text.primary,
  },
  closeButton: {
    padding: 10,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.background.tertiary,
  },
  main: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.xl,
  },
  status: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: Theme.text.secondary,
  },
  orbContainer: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: Theme.accent.primary,
    opacity: 0.15,
  },
  orb: {
    width: 220,
    height: 220,
    borderRadius: 110,
    shadowColor: Theme.accent.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  micButton: {
    width: 130,
    height: 130,
    borderRadius: Theme.radius.xxl + 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Theme.border.accent,
    overflow: 'hidden',
    shadowColor: Theme.accent.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    backgroundColor: Theme.background.card,
  },
  history: {
    padding: 18,
    borderWidth: 1,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.background.card,
    borderColor: Theme.border.primary,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 14,
    letterSpacing: 0.3,
    color: Theme.accent.primary,
    textTransform: 'uppercase',
  },
  bubbleWrapper: {
    marginBottom: 12,
  },
  bubbleLeft: {
    alignItems: 'flex-start',
  },
  bubbleRight: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    backgroundColor: Theme.background.tertiary,
    borderColor: Theme.border.primary,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: 0.1,
    color: Theme.text.primary,
  },
});
