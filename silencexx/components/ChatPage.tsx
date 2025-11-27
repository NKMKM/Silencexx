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
  isTyping?: boolean; // Флаг для эффекта печатания
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
  const [activeChatId, setActiveChatId] = useState<number | null>(null); // ID чата в БД
  const [isTemporaryChat, setIsTemporaryChat] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
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
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentIndexRef = useRef(0);
  const fullTextRef = useRef('');
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Загрузка списка чатов при монтировании
  useEffect(() => {
    const initChat = async () => {
      try {
        console.log('🔄 Loading chat list...');
        const listResponse = await chatApi.getChatList();
        console.log('📦 Chat list response:', listResponse);
        
        if (listResponse.success && listResponse.chats.length > 0) {
          // Фильтруем чаты которые имеют сообщения
          const chatsWithMessages = listResponse.chats.filter(chat => chat.last_message);
          
          if (chatsWithMessages.length > 0) {
            // Есть сохраненные чаты - загружаем только список
            const loadedChats: Chat[] = chatsWithMessages.map(chat => ({
              id: chat.id,
              title: new Date(chat.last_message_date).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long'
              }),
              preview: chat.last_message.substring(0, 50) + (chat.last_message.length > 50 ? '...' : ''),
              timestamp: new Date(chat.last_message_date)
            }));
            
            setChats(loadedChats);
            console.log('✅ Loaded', loadedChats.length, 'chats in sidebar');
            
            // НЕ создаём чат - создастся при первом сообщении
            console.log('⚡ Ready - chat will be created on first message');
          }
        } else {
          // Нет чатов - тоже не создаём, создастся при первом сообщении
          console.log('⚡ No chats - will create on first message');
        }
      } catch (error) {
        console.error('❌ Error initializing chat:', error);
      }
    };
    initChat();
  }, []);

  // Отслеживание состояния клавиатуры с высотой
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
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

    // Скролл к последнему сообщению после небольшой задержки
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Если нет активного chatId, создаём его перед отправкой
      let currentChatId = activeChatId;
      
      if (!currentChatId) {
        console.log('⚡ Creating chat on-demand before sending message');
        try {
          const chatResponse = await chatApi.createChat(isTemporaryChat);
          if (chatResponse.success && chatResponse.chatId) {
            currentChatId = chatResponse.chatId;
            setActiveChatId(chatResponse.chatId);
            setCurrentChatId(chatResponse.chatId);
            console.log(`✅ ${isTemporaryChat ? 'Temporary' : 'Regular'} chat created:`, chatResponse.chatId);
          }
        } catch (error) {
          console.warn('⚠️ Could not create chat, sending without chatId:', error);
        }
      }
      
      // Подготовка истории разговора для контекста
      const conversationHistory: ChatMessage[] = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        text: msg.text,
      }));

      // Отправка запроса к AI
      console.log('🚀 Sending message with chatId:', currentChatId);
      const response = await chatApi.sendMessage({
        message: userText,
        conversationHistory,
        chatId: currentChatId || undefined,
      });
      console.log('📨 Message sent, response received');

      // Добавление ответа AI с эффектом печатания
      const aiResponse: Message = {
        id: messages.length + 2,
        text: '', // Начинаем с пустого текста
        sender: 'ai',
        timestamp: new Date(),
        isTyping: true,
      };

      setMessages((prev) => [...prev, aiResponse]);
      
      // Анимация печатания
      fullTextRef.current = response.response;
      currentIndexRef.current = 0;
      
      // Очищаем предыдущий интервал если он был
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
      
      typingIntervalRef.current = setInterval(() => {
        if (currentIndexRef.current < fullTextRef.current.length) {
          const nextChar = fullTextRef.current[currentIndexRef.current];
          
          setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg && lastMsg.isTyping) {
              lastMsg.text += nextChar;
            }
            return updated;
          });
          
          currentIndexRef.current++;
          
          // Прокрутка только каждые 10 символов для оптимизации
          if (currentIndexRef.current % 10 === 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        } else {
          // Завершаем печатание
          if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
          }
          
          setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg) {
              lastMsg.isTyping = false;
            }
            return updated;
          });
          
          // Финальный скролл после завершения печатания
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }, 30) as ReturnType<typeof setInterval>; // Скорость печатания: 30мс на символ

      // Если обнаружен кризис, можно показать дополнительное уведомление
      if (response.isCrisis) {
        console.log('⚠️ Crisis detected in conversation');
        // Здесь можно добавить модальное окно с ресурсами помощи
      }
      
      // Обновляем список чатов только если это первое сообщение в чате
      if (messages.length === 1) {
        await refreshChatList();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Останавливаем анимацию печатания если была ошибка
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
      
      // Убираем сообщение с печатанием
      setMessages((prev) => prev.filter(msg => !msg.isTyping));
      
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
    } finally {
      setIsLoading(false);
    }
  };

  // Очистка интервала при размонтировании
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, []);

  // Функция загрузки сообщений чата из БД
  const loadChatMessages = async (chatId: number) => {
    try {
      console.log('📥 Loading messages for chat:', chatId);
      const response = await chatApi.getChatMessages(chatId);
      
      if (response.success && response.messages) {
        const loadedMessages: Message[] = response.messages.map((msg, index) => ({
          id: index + 1,
          text: msg.message,
          sender: msg.sender,
          timestamp: new Date(msg.senddate)
        }));
        
        setMessages(loadedMessages);
        console.log('✅ Loaded', loadedMessages.length, 'messages');
        
        // НЕ автоматически скроллим - пользователь сам может прокрутить если нужно
      }
    } catch (error) {
      console.error('❌ Error loading chat messages:', error);
      // Если чат не найден или нет доступа, просто показываем пустой чат
      setMessages([]);
    }
  };

  // Функция обновления списка чатов с debounce
  const refreshChatList = async () => {
    // Отменяем предыдущий таймер если есть
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // Создаём новый таймер - обновление через 1 секунду
    refreshTimeoutRef.current = setTimeout(async () => {
      try {
        const listResponse = await chatApi.getChatList();
        if (listResponse.success && listResponse.chats.length > 0) {
          // Фильтруем только чаты с сообщениями
          const chatsWithMessages = listResponse.chats.filter(chat => chat.last_message);
          
          const loadedChats: Chat[] = chatsWithMessages.map(chat => ({
            id: chat.id,
            title: new Date(chat.last_message_date).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long'
            }),
            preview: chat.last_message.substring(0, 50) + (chat.last_message.length > 50 ? '...' : ''),
            timestamp: new Date(chat.last_message_date)
          }));
          setChats(loadedChats);
        }
      } catch (error) {
        console.error('❌ Error refreshing chat list:', error);
      }
    }, 1000);
  };

  const handleNewChat = async () => {
    try {
      setIsTemporaryChat(false);
      
      // Проверяем есть ли уже пустой чат
      if (messages.length === 0 && activeChatId) {
        console.log('♻️ Already have empty chat:', activeChatId);
        return;
      }
      
      // Мгновенно создаём локальное состояние
      setMessages([]);
      setActiveChatId(null); // Временно null
      console.log('⚡ Created local empty chat');
      
      // В фоне создаём чат на сервере
      chatApi.createChat().then(response => {
        if (response.success && response.chatId) {
          setActiveChatId(response.chatId);
          setCurrentChatId(response.chatId);
          console.log('✅ Server chat created:', response.chatId);
        }
      }).catch(error => {
        console.error('❌ Error creating chat on server:', error);
        // Продолжаем работать локально даже если сервер не ответил
      });
      
    } catch (error) {
      console.error('❌ Error creating new chat:', error);
    }
  };

  const handleNewTemporaryChat = async () => {
    try {
      // Переключаем режим временного чата
      if (isTemporaryChat) {
        // Выключаем временный режим
        setIsTemporaryChat(false);
        console.log('⚠️ Temporary chat mode disabled');
        return;
      }
      
      setIsTemporaryChat(true);
      
      // Мгновенно создаём локальное состояние
      setMessages([]);
      setActiveChatId(null);
      console.log('⚡ Created local temporary chat');
      
      // В фоне создаём временный чат на сервере
      chatApi.createChat(true).then(response => {
        if (response.success && response.chatId) {
          setActiveChatId(response.chatId);
          setCurrentChatId(response.chatId);
          console.log('✅ Temporary chat created on server:', response.chatId);
        }
      }).catch(error => {
        console.error('❌ Error creating temporary chat:', error);
      });
      
    } catch (error) {
      console.error('❌ Error creating temporary chat:', error);
    }
  };

  const handleSelectChat = async (id: number) => {
    setIsTemporaryChat(false);
    setCurrentChatId(id);
    setActiveChatId(id);
    
    // Загружаем сообщения из БД
    await loadChatMessages(id);
  };

  const handleDeleteChat = async (chatId: number) => {
    try {
      console.log('🗑️ Deleting chat:', chatId);
      await chatApi.deleteChatHistory(chatId);
      
      // Удаляем из локального состояния
      const updatedChats = chats.filter(chat => chat.id !== chatId);
      setChats(updatedChats);
      
      // Если удалили текущий чат, переключаемся на другой или создаем новый
      if (currentChatId === chatId) {
        if (updatedChats.length > 0) {
          setCurrentChatId(updatedChats[0].id);
          setActiveChatId(updatedChats[0].id);
          await loadChatMessages(updatedChats[0].id);
        } else {
          // Если чатов не осталось, создаем новый
          await handleNewChat();
        }
      }
      
      console.log('✅ Chat deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting chat:', error);
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
              {item.isTyping && (
                <Text style={{ color: isDark ? '#a78bfa' : '#8b5cf6' }}>▊</Text>
              )}
            </Text>
          </View>
        )}
      </Animated.View>
    );
  }, [isDark, messages.length]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <LinearGradient
          colors={
            isDark
              ? ['#1a1a2e', '#16213e', '#0f3460', '#1a1a2e']
              : ['#e0e7ff', '#ddd6fe', '#e9d5ff']
          }
          style={StyleSheet.absoluteFillObject}
        />

        <View style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 12,
              backgroundColor: isDark ? 'rgba(26, 26, 46, 0.95)' : '#ffffff',
              borderBottomWidth: 0,
            },
          ]}
            >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              onPress={() => setShowSidebar(true)}
              style={styles.backButton}
            >
              <Ionicons
                name="chevron-back"
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
              CloudMind
            </Text>
            <TouchableOpacity 
              style={styles.menuButton}
              onPress={() => setShowVoiceAssistant(true)}
            >
              <Ionicons
                name="ellipsis-vertical"
                size={20}
                color={isDark ? '#e2e8f0' : '#1e293b'}
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
        {messages.length === 0 && !isKeyboardVisible ? (
          <View style={[
            styles.emptyStateContainer,
            { 
              paddingTop: insets.top + 100,
              paddingBottom: insets.bottom + 80
            }
          ]}>
            <View style={styles.welcomeCard}>
              <View style={styles.welcomeIconContainer}>
                <LinearGradient
                  colors={isDark ? ['#6366f1', '#a855f7'] : ['#8b5cf6', '#ec4899']}
                  style={styles.welcomeIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="sparkles" size={48} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={[styles.welcomeTitle, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
                Привет!
              </Text>
              <Text style={[styles.welcomeSubtitle, { color: isDark ? '#cbd5e1' : '#475569' }]}>
                Как я могу помочь тебе сегодня?
              </Text>
              <View style={styles.quickActions}>
                <TouchableOpacity style={[styles.actionCard, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(139, 92, 246, 0.1)', borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(139, 92, 246, 0.2)' }]}>
                  <Ionicons name="chatbubble" size={20} color={isDark ? '#818cf8' : '#8b5cf6'} />
                  <Text style={[styles.actionText, { color: isDark ? '#e2e8f0' : '#1e293b' }]}>Поговорить</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionCard, { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.1)' : 'rgba(236, 72, 153, 0.1)', borderColor: isDark ? 'rgba(168, 85, 247, 0.2)' : 'rgba(236, 72, 153, 0.2)' }]}>
                  <Ionicons name="heart" size={20} color={isDark ? '#c084fc' : '#ec4899'} />
                  <Text style={[styles.actionText, { color: isDark ? '#e2e8f0' : '#1e293b' }]}>Поддержка</Text>
                </TouchableOpacity>
              </View>
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
              { paddingBottom: insets.bottom + 20 }
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={true}
            scrollEnabled={true}
          />
        )}

        {/* Input Area */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: isDark ? 'rgba(26, 26, 46, 0.98)' : '#ffffff',
              paddingBottom: Platform.OS === 'ios' ? insets.bottom + 8 : 8,
              marginBottom: Platform.OS === 'ios' ? (isKeyboardVisible ? keyboardHeight - insets.bottom : 60) : (isKeyboardVisible ? keyboardHeight : 60),
              borderTopWidth: 1,
              borderTopColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#e2e8f0',
              shadowColor: isDark ? '#6366f1' : '#8b5cf6',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: isDark ? 0.2 : 0.1,
                shadowRadius: 12,
                elevation: 8,
              },
            ]}>
          <View style={styles.inputWrapper}>
            <View style={[styles.inputRow, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f1f5f9', borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'transparent', borderWidth: 1 }]}>
              <TouchableOpacity style={styles.attachButton}>
                <Ionicons name="add" size={22} color={isDark ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Сообщение CloudMind"
                placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                multiline
                maxLength={500}
                style={[
                  styles.input,
                  { color: isDark ? '#f1f5f9' : '#0f172a' },
                ]}
              />
              <TouchableOpacity style={styles.voiceButton}>
                <Ionicons name="mic" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={!message.trim() || isLoading}
              style={styles.sendButtonContainer}
            >
              <LinearGradient
                colors={message.trim() && !isLoading ? ['#6366f1', '#a855f7'] : ['#475569', '#64748b']}
                style={styles.sendButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name="arrow-up"
                    size={24}
                    color="#fff"
                  />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </View>
    </TouchableWithoutFeedback>
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
    paddingBottom: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButton: {
    padding: 8,
  },
  messagesList: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '75%',
  },
  messageContainerUser: {
    alignSelf: 'flex-end',
  },
  messageContainerAI: {
    alignSelf: 'flex-start',
  },
  messageUserBubble: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderTopRightRadius: 4,
  },
  messageUserText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  messageAIBubble: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderTopLeftRadius: 4,
    borderWidth: 1,
  },
  messageAIText: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  attachButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 8,
    lineHeight: 20,
  },
  sendButtonContainer: {
    marginBottom: 4,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  temporaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  temporaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f59e0b',
    letterSpacing: 0.3,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  welcomeCard: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  welcomeIconContainer: {
    marginBottom: 32,
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
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  welcomeText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  welcomeFeatures: {
    gap: 12,
    marginBottom: 20,
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '500',
  },
  welcomePrompt: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
