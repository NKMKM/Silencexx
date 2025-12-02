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
import { useTheme } from '@/utils/ThemeContext';
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
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
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
        colors={
          isDark
            ? ['#0b0820', '#120f2d', '#0b0820']
            : ['#e8e7ff', '#f3e8ff', '#e8e7ff']
        }
        style={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.headerIcon,
                { backgroundColor: isDark ? 'rgba(129,140,248,0.18)' : 'rgba(99,102,241,0.2)' },
              ]}
            >
              <Ionicons name="pulse" size={20} color={isDark ? '#c7d2fe' : '#4f46e5'} />
            </View>
            <Text style={[styles.headerTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              Голосовой ИИ
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={isDark ? '#cbd5e1' : '#475569'} />
          </TouchableOpacity>
        </View>

        <View style={styles.main}>
          <Text style={[styles.status, { color: isDark ? '#cbd5e1' : '#475569' }]}>
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
                    ? 'rgba(168, 85, 247, 0.35)'
                    : 'rgba(129, 140, 248, 0.3)',
                },
              ]}
            />
            <Animated.View style={[styles.orb, orbStyle]}>
              <LinearGradient
                colors={['#5b7bff', '#a855f7', '#22d3ee']}
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
                shadowColor: isListening ? '#22d3ee' : '#8b5cf6',
                borderColor: isListening ? '#22d3ee' : '#a855f7',
              },
            ]}
          >
            <LinearGradient
              colors={isListening ? ['#22d3ee', '#6366f1'] : ['#8b5cf6', '#22d3ee']}
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
              backgroundColor: isDark ? 'rgba(20, 27, 45, 0.65)' : 'rgba(255, 255, 255, 0.72)',
              borderColor: isDark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(139, 92, 246, 0.2)',
            },
          ]}
        >
          <Text style={[styles.historyTitle, { color: isDark ? '#cbd5e1' : '#334155' }]}>
            История
          </Text>
          <ScrollView style={{ maxHeight: height * 0.25 }} showsVerticalScrollIndicator={false}>
            {messages.length === 0 ? (
              <Text style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
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
                        ? { backgroundColor: isDark ? '#7c3aed' : '#6366f1' }
                        : {
                            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.55)' : 'rgba(255,255,255,0.9)',
                            borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(139, 92, 246, 0.2)',
                          },
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        { color: msg.sender === 'user' ? '#fff' : isDark ? '#e2e8f0' : '#0f172a' },
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
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: 8,
  },
  main: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  status: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  orbContainer: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  orb: {
    width: 200,
    height: 200,
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 14,
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  history: {
    padding: 16,
    borderWidth: 1.5,
    borderRadius: 18,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  bubbleWrapper: {
    marginBottom: 10,
  },
  bubbleLeft: {
    alignItems: 'flex-start',
  },
  bubbleRight: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1.2,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
});
