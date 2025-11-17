import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Dimensions,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/utils/ThemeContext';
import { VoiceAssistant } from './VoiceAssistant';
import { ChatSidebar } from './ChatSidebar';
import { AnimatedButton } from './AnimatedButton';
import chatApi, { ChatMessage } from '@/services/api';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface Chat {
  id: number;
  title: string;
  preview: string;
  timestamp: Date;
}

const { width, height } = Dimensions.get('window');

export function ChatPage() {
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(1);
  const [isTemporaryChat, setIsTemporaryChat] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [chats, setChats] = useState<Chat[]>([
    {
      id: 1,
      title: 'Сегодня',
      preview: 'Привет! Это CloudMind...',
      timestamp: new Date(),
    },
  ]);
  const [messages, setMessages] = useState<Message[]>([]);
  const flatListRef = useRef<FlatList>(null);

  // Отслеживание состояния клавиатуры
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Android: скрывать клавиатуру при системной кнопке "Назад" если она открыта
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = (event: any) => {
      if (isKeyboardVisible) {
        Keyboard.dismiss();
        return true;
      }
      return false;
    };

    const subscription = Keyboard.addListener('keyboardDidHide', () => {
      // ничего, просто держим стейт в актуальном виде
    });

    const BackHandler = require('react-native').BackHandler;
    const backSub = BackHandler.addEventListener('hardwareBackPress', backHandler);

    return () => {
      backSub.remove();
      subscription.remove();
    };
  }, [isKeyboardVisible]);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const newUserMessage: Message = {
      id: messages.length + 1,
      text: message,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages([...messages, newUserMessage]);
    const userText = message;
    setMessage('');
    setIsLoading(true);

    // Прокрутка к последнему сообщению
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Подготовка истории разговора для контекста
      const conversationHistory: ChatMessage[] = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        text: msg.text,
      }));

      // Отправка запроса к AI
      const response = await chatApi.sendMessage({
        message: userText,
        conversationHistory,
      });

      // Добавление ответа AI
      const aiResponse: Message = {
        id: messages.length + 2,
        text: response.response,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiResponse]);
      
      // Прокрутка к ответу AI
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Если обнаружен кризис, можно показать дополнительное уведомление
      if (response.isCrisis) {
        console.log('⚠️ Crisis detected in conversation');
        // Здесь можно добавить модальное окно с ресурсами помощи
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Показываем подробное сообщение об ошибке
      const errorText = error instanceof Error 
        ? error.message 
        : 'Извините, произошла ошибка. Пожалуйста, убедитесь что backend запущен и попробуйте снова.';
      
      const errorMessage: Message = {
        id: messages.length + 2,
        text: errorText,
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setIsTemporaryChat(false);
    const newChat: Chat = {
      id: chats.length + 1,
      title: 'Новый разговор',
      preview: 'Начните новый разговор...',
      timestamp: new Date(),
    };
    setChats([newChat, ...chats]);
    setCurrentChatId(newChat.id);
    setMessages([]);
  };

  const handleNewTemporaryChat = () => {
    setIsTemporaryChat(true);
    setCurrentChatId(-1);
    setMessages([]);
  };

  const handleSelectChat = (id: number) => {
    setIsTemporaryChat(false);
    setCurrentChatId(id);
    // Здесь можно загрузить сообщения конкретного чата
    setMessages([]);
  };

  const handleDeleteChat = (chatId: number) => {
    setChats(chats.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId && chats.length > 1) {
      const remainingChats = chats.filter(chat => chat.id !== chatId);
      setCurrentChatId(remainingChats[0].id);
    }
  };

  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isUser = item.sender === 'user';
    const isLastMessage = index === messages.length - 1;
    
    return (
      <Animated.View
        entering={isLastMessage ? (isUser ? FadeInRight.springify() : FadeInLeft.springify()) : undefined}
        style={[
          styles.messageContainer,
          isUser ? styles.messageContainerUser : styles.messageContainerAI,
        ]}
      >
        {isUser ? (
          <LinearGradient
            colors={['#3b82f6', '#8b5cf6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.messageUserBubble}
          >
            <Text style={styles.messageUserText}>{item.text}</Text>
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.messageAIBubble,
              {
                backgroundColor: isDark
                  ? 'rgba(30, 41, 59, 0.8)'
                  : 'rgba(255, 255, 255, 0.8)',
                borderColor: isDark
                  ? 'rgba(71, 85, 105, 0.3)'
                  : 'rgba(226, 232, 240, 0.3)',
              },
            ]}
          >
            <Text
              style={[
                styles.messageAIText,
                { color: isDark ? '#e2e8f0' : '#1e293b' },
              ]}
            >
              {item.text}
            </Text>
          </View>
        )}
      </Animated.View>
    );
  }, [isDark, messages.length]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={
            isDark
              ? ['#0f172a', '#1e1b4b', '#312e81', '#1e293b']
              : ['#e0e7ff', '#ddd6fe', '#e9d5ff']
          }
          style={StyleSheet.absoluteFillObject}
        />

        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ flex: 1 }}>
            {/* Header */}
            <View
              style={[
                styles.header,
                {
                  paddingTop: insets.top + 4,
                  backgroundColor: isDark
                    ? 'rgba(15, 23, 42, 0.7)'
                    : 'rgba(255, 255, 255, 0.85)',
                  borderBottomColor: isDark
                    ? 'rgba(71, 85, 105, 0.4)'
                    : 'rgba(226, 232, 240, 0.7)',
                },
              ]}
            >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => setShowSidebar(true)}>
              <Ionicons
                name="menu"
                size={24}
                color={isDark ? '#a78bfa' : '#8b5cf6'}
              />
            </TouchableOpacity>
            <LinearGradient
              colors={['#60a5fa', '#a78bfa']}
              style={styles.headerIcon}
            >
              <Ionicons name="cloud" size={18} color="#fff" />
            </LinearGradient>
            <Text
              style={[
                styles.headerTitle,
                { color: isDark ? '#e2e8f0' : '#1e293b' },
              ]}
            >
              CloudMind
            </Text>
            {isTemporaryChat && (
              <View style={styles.temporaryBadge}>
                <Ionicons name="time-outline" size={12} color="#f59e0b" />
                <Text style={styles.temporaryText}>Временный</Text>
              </View>
            )}
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={handleNewTemporaryChat}
            >
              <Ionicons
                name="flash-outline"
                size={22}
                color={isDark ? '#f59e0b' : '#f97316'}
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setShowVoiceAssistant(true)}
            >
              <Ionicons
                name="mic-outline"
                size={22}
                color={isDark ? '#a78bfa' : '#8b5cf6'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Voice Assistant Modal */}
        <VoiceAssistant
          visible={showVoiceAssistant}
          onClose={() => setShowVoiceAssistant(false)}
        />

        {/* Chat Sidebar */}
        <ChatSidebar
          visible={showSidebar}
          onClose={() => setShowSidebar(false)}
          chats={chats}
          currentChatId={currentChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
        />

        {/* Messages или приветствие */}
        {messages.length === 0 ? (
          <View style={[
            styles.emptyStateContainer,
            { paddingBottom: insets.bottom + 100 }
          ]}>
            <View style={styles.welcomeCard}>
              <View style={styles.welcomeIconContainer}>
                <LinearGradient
                  colors={['#3b82f6', '#8b5cf6']}
                  style={styles.welcomeIcon}
                >
                  <Ionicons name="cloud" size={48} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={[styles.welcomeTitle, { color: isDark ? '#e2e8f0' : '#1e293b' }]}>
                Привет! 👋
              </Text>
              <Text style={[styles.welcomeSubtitle, { color: isDark ? '#cbd5e1' : '#475569' }]}>
                Это CloudMind
              </Text>
              <Text style={[styles.welcomeText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                Твой персональный помощник для поддержки ментального здоровья
              </Text>
              <View style={styles.welcomeFeatures}>
                <View style={styles.featureItem}>
                  <Ionicons name="ear" size={20} color={isDark ? '#a78bfa' : '#8b5cf6'} />
                  <Text style={[styles.featureText, { color: isDark ? '#cbd5e1' : '#475569' }]}>
                    Выслушаю тебя
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="heart" size={20} color={isDark ? '#a78bfa' : '#8b5cf6'} />
                  <Text style={[styles.featureText, { color: isDark ? '#cbd5e1' : '#475569' }]}>
                    Помогу с эмоциями
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="sunny" size={20} color={isDark ? '#a78bfa' : '#8b5cf6'} />
                  <Text style={[styles.featureText, { color: isDark ? '#cbd5e1' : '#475569' }]}>
                    Найдём спокойствие
                  </Text>
                </View>
              </View>
              <Text style={[styles.welcomePrompt, { color: isDark ? '#a78bfa' : '#8b5cf6' }]}>
                Расскажи, как ты себя чувствуешь? 💬
              </Text>
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={[
              styles.messagesList,
              { paddingBottom: insets.bottom + 90 }
            ]}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={10}
            updateCellsBatchingPeriod={50}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* Input Area */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: isDark
                ? 'rgba(15, 23, 42, 0.6)'
                : 'rgba(255, 255, 255, 0.6)',
              borderTopColor: isDark
                ? 'rgba(71, 85, 105, 0.3)'
                : 'rgba(226, 232, 240, 0.5)',
              paddingBottom: isKeyboardVisible 
                ? 8
                : 70,
              marginBottom: isKeyboardVisible ? 0 : insets.bottom,
            },
          ]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Напиши всё, что чувствуешь..."
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              multiline
              maxLength={500}
              style={[
                styles.input,
                {
                  backgroundColor: isDark
                    ? 'rgba(30, 41, 59, 0.5)'
                    : 'rgba(255, 255, 255, 0.5)',
                  borderColor: isDark
                    ? 'rgba(71, 85, 105, 0.5)'
                    : 'rgba(226, 232, 240, 0.5)',
                  color: isDark ? '#e2e8f0' : '#1e293b',
                },
              ]}
            />
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={!message.trim() || isLoading}
            >
              <LinearGradient
                colors={
                  message.trim() && !isLoading
                    ? ['#3b82f6', '#8b5cf6']
                    : isDark
                    ? ['#334155', '#475569']
                    : ['#cbd5e1', '#94a3b8']
                }
                style={styles.sendButton}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name="send"
                    size={20}
                    color={message.trim() ? '#fff' : isDark ? '#64748b' : '#94a3b8'}
                  />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingBottom: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerButton: {
    padding: 8,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '85%',
  },
  messageContainerUser: {
    alignSelf: 'flex-end',
  },
  messageContainerAI: {
    alignSelf: 'flex-start',
  },
  messageUserBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  messageUserText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 20,
  },
  messageAIBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  messageAIText: {
    fontSize: 15,
    lineHeight: 20,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    maxHeight: 120,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  temporaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  temporaryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f59e0b',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  welcomeCard: {
    alignItems: 'center',
    maxWidth: 480,
    width: '100%',
  },
  welcomeIconContainer: {
    marginBottom: 24,
  },
  welcomeIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  welcomeFeatures: {
    gap: 16,
    marginBottom: 32,
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  featureText: {
    fontSize: 16,
    fontWeight: '500',
  },
  welcomePrompt: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});
