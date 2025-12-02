import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  Keyboard,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInLeft, FadeInRight, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/utils/ThemeContext';
import { VoiceAssistant } from './VoiceAssistant';
import { ChatSidebar } from './ChatSidebar';
import { CrisisDetectionModal } from './CrisisDetectionModal';
import { DisclaimerModal } from './DisclaimerModal';
import chatApi, { ChatMessage } from '@/services/api';
import { useCrisisDetection } from '@/hooks/useCrisisDetection';
import { useDisclaimerState } from '@/hooks/useDisclaimerState';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isTyping?: boolean;
}

interface Chat {
  id: number;
  title: string;
  preview: string;
  timestamp: Date;
}

export function ChatPage() {
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [isTemporaryChat, setIsTemporaryChat] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [crisisMessage, setCrisisMessage] = useState('');
  const [isCrisis, setIsCrisis] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentIndexRef = useRef(0);
  const fullTextRef = useRef('');
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputTranslateY = useSharedValue(0);
  const { detectCrisis } = useCrisisDetection();
  const { shouldShowDisclaimer, setShouldShowDisclaimer } = useDisclaimerState();

  const tabBarOffset = useMemo(() => -5 + insets.bottom, [insets.bottom]);

  const listPaddingBottom = useMemo(() => {
    const inputAreaHeight = 110;
    const bottomSpacer = isKeyboardVisible
      ? Math.max(0, keyboardHeight - insets.bottom)
      : tabBarOffset + 12;
    return inputAreaHeight + bottomSpacer;
  }, [isKeyboardVisible, keyboardHeight, insets.bottom, tabBarOffset]);

  const inputAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: 0 }],
  }));

  const mapChats = useCallback((items: any[]): Chat[] => {
    return items
      .sort((a, b) => new Date(b.last_message_date || b.created_at || 0).getTime() - new Date(a.last_message_date || a.created_at || 0).getTime())
      .map((chat) => {
        const hasLastMessage = !!chat.last_message;
        return {
          id: chat.id,
          title: hasLastMessage
            ? new Date(chat.last_message_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
            : 'Новый чат',
          preview: hasLastMessage ? `${chat.last_message.slice(0, 50)}${chat.last_message.length > 50 ? '...' : ''}` : 'Начните диалог',
          timestamp: hasLastMessage ? new Date(chat.last_message_date) : new Date(),
        };
      });
  }, []);

  // Показываем дисклеймер если пользователь только что вошел
  useEffect(() => {
    if (shouldShowDisclaimer) {
      setShowDisclaimer(true);
      setShouldShowDisclaimer(false);
    }
  }, [shouldShowDisclaimer]);

    useEffect(() => {
    const initChat = async () => {
      try {
        console.log('[Chat] Loading chat list...');
        const listResponse = await chatApi.getChatList();
        console.log('[Chat] Chat list response:', listResponse);
        
        if (listResponse.success) {
          const loadedChats = mapChats(listResponse.chats || []);
          setChats(loadedChats);

          if (loadedChats.length > 0) {
            const firstChat = loadedChats[0];
            setCurrentChatId(firstChat.id);
            setActiveChatId(firstChat.id);
            await loadChatMessages(firstChat.id);
          } else {
            setMessages([]);
          }
        } else {
          console.log('[Chat] No chats - will create on first message');
        }
      } catch (error) {
        console.error('[Chat] Error initializing chat:', error);
      }
    };
    initChat();
  }, [mapChats]);

    useEffect(() => {
    const animateInput = (toValue: number) => {
      inputTranslateY.value = withTiming(toValue, { duration: 220 });
    };

    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        const height = Math.max(0, e.endCoordinates.height - insets.bottom);
        setKeyboardHeight(height);
        animateInput(0);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
        animateInput(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [inputTranslateY]);

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
          });

    const BackHandler = require('react-native').BackHandler;
    const backSub = BackHandler.addEventListener('hardwareBackPress', backHandler);

    return () => {
      backSub.remove();
      subscription.remove();
    };
  }, [isKeyboardVisible]);

  const handleSendMessage = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading) return;

    const newUserMessage: Message = {
      id: Date.now(),
      text: trimmedMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setMessage('');
    setIsLoading(true);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      let chatIdToUse = activeChatId;

      if (!chatIdToUse) {
        console.log('Creating chat on-demand before sending message');
        try {
          const chatResponse = await chatApi.createChat(isTemporaryChat);
          if (chatResponse.success && chatResponse.chatId) {
            chatIdToUse = chatResponse.chatId;
            setActiveChatId(chatResponse.chatId);
            setCurrentChatId(chatResponse.chatId);
            console.log((isTemporaryChat ? 'Temporary' : 'Regular') + ' chat created: ' + chatResponse.chatId);
          }
        } catch (error) {
          console.warn('Could not create chat, sending without chatId:', error);
        }
      }

      const conversationHistory: ChatMessage[] = updatedMessages.map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        text: msg.text,
      }));

      console.log('Sending message with chatId:', chatIdToUse);
      const response = await chatApi.sendMessage({
        message: trimmedMessage,
        conversationHistory,
        chatId: chatIdToUse || undefined,
      });
      console.log('Message sent, response received');

      const aiResponse: Message = {
        id: Date.now() + 1,
        text: '',
        sender: 'ai',
        timestamp: new Date(),
        isTyping: true,
      };

      setMessages((prev) => [...prev, aiResponse]);

      fullTextRef.current = response.response || '';
      currentIndexRef.current = 0;

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

          if (currentIndexRef.current % 10 === 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        } else {
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

          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }, 30) as ReturnType<typeof setInterval>;

      if (response.isCrisis) {
        console.log('Crisis detected in conversation');
        setCrisisMessage(trimmedMessage);
        setIsCrisis(true);
        setShowCrisisModal(true);
      }

      if (updatedMessages.length === 1) {
        await refreshChatList();
      }
    } catch (error) {
      console.error('Error sending message:', error);

      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }

      setMessages((prev) => prev.filter((msg) => !msg.isTyping));

      const errorText =
        error instanceof Error
          ? error.message
          : 'Произошла ошибка, попробуйте снова. Если проблема повторяется, свяжитесь с поддержкой.';

      const errorMessage: Message = {
        id: Date.now(),
        text: errorText,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

    const loadChatMessages = async (chatId: number) => {
    try {
      console.log('[Chat] Loading messages for chat:', chatId);
      const response = await chatApi.getChatMessages(chatId);
      
      if (response.success && response.messages) {
        const loadedMessages: Message[] = response.messages.map((msg, index) => ({
          id: index + 1,
          text: msg.message,
          sender: msg.sender,
          timestamp: new Date(msg.senddate)
        }));
        
        setMessages(loadedMessages);
        console.log('[Chat] Loaded', loadedMessages.length, 'messages');

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 50);
      }
    } catch (error) {
      console.error('[Chat] Error loading chat messages:', error);
      setMessages([]);
    }
  };

    const refreshChatList = async () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    refreshTimeoutRef.current = setTimeout(async () => {
      try {
        const listResponse = await chatApi.getChatList();
        if (listResponse.success) {
          const loadedChats = mapChats(listResponse.chats || []);
          setChats(loadedChats);
        }
      } catch (error) {
        console.error('[Chat] Error refreshing chat list:', error);
      }
    }, 1000);
  };

  const handleNewChat = async () => {
    try {
      setIsTemporaryChat(false);
      
            if (messages.length === 0 && activeChatId) {
        console.log('[Chat] Already have empty chat:', activeChatId);
        return;
      }
      
            setMessages([]);
      setActiveChatId(null);       console.log('[Chat] Created local empty chat');
      
            chatApi.createChat().then(response => {
        if (response.success && response.chatId) {
          setActiveChatId(response.chatId);
          setCurrentChatId(response.chatId);
          console.log('[Chat] Server chat created:', response.chatId);
        }
      }).catch(error => {
        console.error('[Chat] Error creating chat on server:', error);
              });
      
    } catch (error) {
      console.error('[Chat] Error creating new chat:', error);
    }
  };

  const handleNewTemporaryChat = async () => {
    try {
            if (isTemporaryChat) {
                setIsTemporaryChat(false);
        console.log('[Chat] Temporary chat mode disabled');
        return;
      }
      
      setIsTemporaryChat(true);
      
            setMessages([]);
      setActiveChatId(null);
      console.log('[Chat] Created local temporary chat');
      
            chatApi.createChat(true).then(response => {
        if (response.success && response.chatId) {
          setActiveChatId(response.chatId);
          setCurrentChatId(response.chatId);
          console.log('[Chat] Temporary chat created on server:', response.chatId);
        }
      }).catch(error => {
        console.error('[Chat] Error creating temporary chat:', error);
      });
      
    } catch (error) {
      console.error('[Chat] Error creating temporary chat:', error);
    }
  };

  const handleSelectChat = async (id: number) => {
    setIsTemporaryChat(false);
    setCurrentChatId(id);
    setActiveChatId(id);
    
        await loadChatMessages(id);
  };

  const handleDeleteChat = async (chatId: number) => {
    try {
      console.log('[Chat] Deleting chat:', chatId);
      await chatApi.deleteChatHistory(chatId);
      
            const updatedChats = chats.filter(chat => chat.id !== chatId);
      setChats(updatedChats);
      
            if (currentChatId === chatId) {
        if (updatedChats.length > 0) {
          setCurrentChatId(updatedChats[0].id);
          setActiveChatId(updatedChats[0].id);
          await loadChatMessages(updatedChats[0].id);
        } else {
                    await handleNewChat();
        }
      }
      
      console.log('[Chat] Chat deleted successfully');
    } catch (error) {
      console.error('[Chat] Error deleting chat:', error);
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
                <Text style={{ color: isDark ? '#a78bfa' : '#8b5cf6' }}>...</Text>
              )}
            </Text>
          </View>
        )}
      </Animated.View>
    );
  }, [isDark, messages.length]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.mainContainer}>
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

        {/* Сообщения или приветствие */}
        {messages.length === 0 ? (
          <View style={[
            styles.emptyStateContainer,
            { 
              paddingTop: insets.top + 100,
              paddingBottom: listPaddingBottom
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
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.messagesList,
              { paddingBottom: listPaddingBottom + 20, flexGrow: 1 }
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input Area */}
        <Animated.View
          style={[
            styles.inputContainer,
            inputAnimatedStyle,
            {
              backgroundColor: isDark ? 'rgba(10, 12, 18, 0.85)' : 'rgba(20, 22, 30, 0.85)',
              paddingBottom: insets.bottom + 6,
              marginBottom: isKeyboardVisible
                ? Math.max(8, keyboardHeight - insets.bottom + 8)
                : tabBarOffset + 12,
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
                placeholder="Message Pulsar AI"
                placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
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
        </Animated.View>
        <CrisisDetectionModal
          visible={showCrisisModal}
          message={crisisMessage}
          isCrisis={isCrisis}
          onClose={() => setShowCrisisModal(false)}
          onDismiss={() => setShowCrisisModal(false)}
        />
        <DisclaimerModal
          visible={showDisclaimer}
          onAccept={() => setShowDisclaimer(false)}
          onReject={() => setShowDisclaimer(false)}
        />
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
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
    bottom: 30,
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
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  attachButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  voiceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 6,
    lineHeight: 22,
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






