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
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Alert, // added
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av'; // Added Audio
import Animated, { FadeInDown, FadeInLeft, FadeInRight, useSharedValue, useAnimatedStyle, withTiming, FadeOutRight, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatSidebar } from './ChatSidebar';
import { CrisisDetectionModal } from './CrisisDetectionModal';
import { DisclaimerModal } from './DisclaimerModal';
import chatApi, { ChatMessage } from '@/services/api';
import { useCrisisDetection } from '@/hooks/useCrisisDetection';
import { useDisclaimerState } from '@/hooks/useDisclaimerState';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { AudioPlayer } from './AudioPlayer';
import { useRouter } from 'expo-router';
import { Theme } from '@/constants/theme';

interface Message {
  id: number | string; // Changed to support string IDs from voice upload
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isTyping?: boolean;
  type?: 'text' | 'voice';
  audioUrl?: string;
  status?: 'uploaded' | 'transcribing' | 'ready' | 'error';
}

interface Chat {
  id: number;
  title: string;
  preview: string;
  timestamp: Date;
}

export function ChatPage() {
  const isDark = true; // Force dark theme
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
  const textInputRef = useRef<TextInput>(null);
  const panResponderRef = useRef<any>(null);
  const scrollStartYRef = useRef<number>(0);
  const keyboardDismissThresholdRef = useRef<number>(50);
  const { detectCrisis } = useCrisisDetection();
  const { shouldShowDisclaimer, setShouldShowDisclaimer } = useDisclaimerState();
  const { limits, canSendMessage, getRemainingMessages, refreshLimits } = useSubscriptionLimits();

  // Voice Logic
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        // Set audio mode BEFORE creating recording
        await Audio.setAudioModeAsync({ 
          allowsRecordingIOS: true, 
          playsInSilentModeIOS: true 
        });
        
        // Production-ready recording options for iOS + Android
        const { recording } = await Audio.Recording.createAsync({
            android: {
                extension: '.m4a',
                outputFormat: Audio.AndroidOutputFormat.MPEG_4,
                audioEncoder: Audio.AndroidAudioEncoder.AAC,
                sampleRate: 44100,
                numberOfChannels: 2,  // Stereo для лучшего качества
                bitRate: 256000,  // Повышено до 256kbps
            },
            ios: {
                extension: '.m4a',
                outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
                audioQuality: Audio.IOSAudioQuality.MAX,  // Максимальное качество
                sampleRate: 44100,
                numberOfChannels: 2,  // Stereo
                bitRate: 256000,  // Повышено до 256kbps
                linearPCMBitDepth: 16,
                linearPCMIsBigEndian: false,
                linearPCMIsFloat: false,
            },
            web: {
                mimeType: 'audio/webm',
                bitsPerSecond: 128000,
            }
        });
        
        setRecording(recording);
        setIsRecording(true);
        setRecordingTime(0);
        
        // Start timer
        recordingIntervalRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        Alert.alert("Требуется разрешение на микрофон");
      }
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert("Ошибка", "Не удалось начать запись");
    }
  }

  async function stopRecording() {
    if (!recording) return;
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    
    setIsRecording(false);
    
    try {
        // Важно: сначала остановить и выгрузить
        await recording.stopAndUnloadAsync();
        
        // Restore audio mode
        await Audio.setAudioModeAsync({ 
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true 
        });
    } catch(e) {
      console.error('Error stopping recording:', e);
    }
    
    // Только после stopAndUnloadAsync получаем URI
    const uri = recording.getURI(); 
    
    // Clear recording state
    setRecording(null);
    setRecordingTime(0);
    
    // Only send if valid chat and URI
    if (uri && activeChatId) {
        // Optimistic UI
        const tempId = `temp-${Date.now()}`;
        const newMessage: Message = {
           id: tempId,
           text: '',
           sender: 'user',
           timestamp: new Date(),
           type: 'voice',
           status: 'uploaded',
           audioUrl: uri
        };
        setMessages(prev => [...prev, newMessage]);

        try {
           const result = await chatApi.sendVoiceMessage(activeChatId.toString(), uri);
           setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: result.messageId, status: 'uploaded' } : m));
           
           // Poll for updates
           const interval = setInterval(async () => {
                if (activeChatId) {
                  try {
                    const data = await chatApi.getChatMessages(activeChatId);
                    if (data.success && data.messages) {
                      setMessages(data.messages.map(m => ({
                        id: m.id.toString(),
                        text: m.text || '',
                        sender: m.role === 'assistant' ? 'ai' : 'user', // Fixed: assistant -> ai
                        timestamp: new Date(m.created_at),
                        type: m.type || 'text',
                        status: m.status || 'ready',
                        audioUrl: m.audio_url
                      })));
                    }
                  } catch (err) {
                    console.log('Polling error:', err);
                  }
                }
           }, 2000);
           setTimeout(() => clearInterval(interval), 30000);

        } catch (e) {
           setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'error' } : m));
           Alert.alert("Ошибка", "Не удалось отправить голосовое сообщение");
        }
    }
    setRecordingTime(0);
  }

  const keyboardTranslateY = useSharedValue(0);

  const tabBarOffset = useMemo(() => -5 + insets.bottom, [insets.bottom]);

  const listPaddingBottom = useMemo(() => {
    const inputAreaHeight = 110;
    const keyboardSpacing = 8;
    const bottomSpacer = isKeyboardVisible
      ? Math.max(0, keyboardHeight - insets.bottom) + keyboardSpacing
      : tabBarOffset + 12;
    return inputAreaHeight + bottomSpacer;
  }, [isKeyboardVisible, keyboardHeight, insets.bottom, tabBarOffset]);

  const inputAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: keyboardTranslateY.value }],
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

  // Show disclaimer if user just logged in
  useEffect(() => {
    if (shouldShowDisclaimer) {
      setShowDisclaimer(true);
      setShouldShowDisclaimer(false);
    }
  }, [shouldShowDisclaimer]);

  // Initialize chat and load messages
  useEffect(() => {
    const initChat = async () => {
      try {
        console.log('[Chat] Loading chat list...');
        const listResponse = await chatApi.getChatList();
        console.log('[Chat] Chat list response:', listResponse);
        
        if (listResponse.success) {
          const loadedChats = mapChats(listResponse.chats || []);
          setChats(loadedChats);

          // Don't auto-load the first chat - start with empty new chat
          setCurrentChatId(null);
          setActiveChatId(null);
          setMessages([]);
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
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        const height = Math.max(0, e.endCoordinates.height - insets.bottom);
        setKeyboardHeight(height);
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
  }, [insets.bottom]);

  // Reliable auto-scroll using native callbacks and requestAnimationFrame
  const performAutoScroll = useCallback(() => {
    if (messages.length === 0) return;
    
    // Use requestAnimationFrame for smooth animation frame
    const scrollTask = requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    });
    return () => cancelAnimationFrame(scrollTask);
  }, [messages.length]);

  // Auto-scroll on message content changes
  useEffect(() => {
    performAutoScroll();
  }, [messages.length, performAutoScroll]);

  // Auto-scroll when keyboard appears
  useEffect(() => {
    if (isKeyboardVisible && messages.length > 0) {
      const task = requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      });
      return () => cancelAnimationFrame(task);
    }
  }, [isKeyboardVisible, messages.length]);

  // PanResponder: ONLY for downward gesture to dismiss keyboard
  // Gated to activate ONLY when keyboard is visible AND gesture is downward > 40px
  useEffect(() => {
    // Only create responder when keyboard is visible
    if (!isKeyboardVisible) {
      panResponderRef.current = null;
      return;
    }

    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => false,  // Don't capture initially
      
      onMoveShouldSetPanResponder: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        // CLEAR GATE: Only activate for downward drag > 40px
        // This prevents interference with normal FlatList scrolling
        const isVertical = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        const isDownwardEnough = gestureState.dy > 40;  // Only downward, not upward
        
        // Return true only when BOTH conditions met
        return isVertical && isDownwardEnough;
      },
      
      onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        // Smooth drag animation during gesture
        const dragDistance = gestureState.dy;  // Positive when dragging down
        const maxDrag = keyboardHeight;
        const translation = Math.min(dragDistance, maxDrag);
        keyboardTranslateY.value = translation;
      },
      
      onPanResponderRelease: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        // Dismiss if threshold reached (30% of keyboard height)
        const dismissThreshold = keyboardHeight * 0.3;
        
        if (gestureState.dy > dismissThreshold) {
          // Animate to full dismiss and close keyboard
          keyboardTranslateY.value = withTiming(keyboardHeight, { duration: 200 });
          setTimeout(() => {
            Keyboard.dismiss();
            keyboardTranslateY.value = 0;
          }, 150);
        } else {
          // Return smoothly to open position if threshold not met
          keyboardTranslateY.value = withTiming(0, { duration: 200 });
        }
      },
    });
    
    panResponderRef.current = panResponder;
  }, [isKeyboardVisible, keyboardHeight]);

  // Helper function to send any message (text only)
  const sendMessageInternal = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const newUserMessage: Message = {
        id: Date.now(),
        text,
        sender: 'user',
        timestamp: new Date(),
      };

      const updatedMessages = [...messages, newUserMessage];
      setMessages(updatedMessages);
      setMessage('');
      setIsLoading(true);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);

      try {
        let chatIdToUse = activeChatId;

        if (!chatIdToUse) {
          try {
            const chatResponse = await chatApi.createChat(isTemporaryChat);
            if (chatResponse.success && chatResponse.chatId) {
              chatIdToUse = chatResponse.chatId;
              setActiveChatId(chatResponse.chatId);
              setCurrentChatId(chatResponse.chatId);
            }
          } catch (error) {
            console.warn('Could not create chat:', error);
          }
        }

        const conversationHistory: ChatMessage[] = updatedMessages.map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          text: msg.text,
        }));

        const response = await chatApi.sendMessage({
          message: text,
          conversationHistory,
          chatId: chatIdToUse || undefined,
        });

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
            flatListRef.current?.scrollToEnd({ animated: false });
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
            }, 50);
          }
        }, 30) as ReturnType<typeof setInterval>;

        if (response.isCrisis) {
          setCrisisMessage(text);
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
          error instanceof Error ? error.message : 'Failed to process message';

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
    },
    [messages, activeChatId, isTemporaryChat, isLoading]
  );
  
  // Send text message from input field
  const handleSendMessage = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading) return;

    // Check subscription limits
    if (!canSendMessage()) {
      const remaining = getRemainingMessages();
      Alert.alert(
        '?? Daily Limit Reached',
        `You've reached your daily chat limit. Upgrade your subscription for unlimited access.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upgrade',
            onPress: () => {
              router.push('/billing');
            },
          },
        ]
      );
      return;
    }

    await sendMessageInternal(trimmedMessage);
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
        const loadedMessages: Message[] = response.messages.map((msg) => ({
          id: msg.id.toString(),
          text: msg.text || '',
          sender: msg.role === 'assistant' ? 'ai' : 'user', // Convert 'assistant' to 'ai'
          timestamp: new Date(msg.created_at),
          type: msg.type || 'text',
          status: msg.status || 'ready',
          audioUrl: msg.audio_url
        }));
        
        setMessages(loadedMessages);
        console.log('[Chat] Loaded', loadedMessages.length, 'messages');
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
    
    if (item.type === 'voice') {
         const getStatusText = () => {
             switch(item.status) {
                 case 'uploaded': return 'Загрузка...';
                 case 'transcribing': return 'Распознаём...';
                 case 'ready': return item.text || 'Голосовое сообщение';
                 case 'error': return 'Ошибка';
                 default: return item.text || 'Голосовое сообщение';
             }
         };
         
         const isLoading = item.status === 'uploaded' || item.status === 'transcribing';
         
         return (
             <Animated.View
                entering={isLastMessage ? FadeInRight.springify() : undefined}
                style={[styles.messageContainer, styles.messageContainerUser]}
              >
                  <View style={styles.voiceMessageBubble}>
                    {/* Voice Message Header with Gradient */}
                    <LinearGradient
                      colors={Theme.accent.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.voiceMessageHeader}
                    >
                      {/* Player or Loading */}
                      {isLoading ? (
                        <View style={styles.voiceLoadingContainer}>
                          <ActivityIndicator size="small" color="white" />
                          <Text style={styles.voiceLoadingText}>{getStatusText()}</Text>
                        </View>
                      ) : item.audioUrl ? (
                        <View style={styles.voicePlayerWrapper}>
                          <AudioPlayer audioUri={item.audioUrl} isDark={true} />
                        </View>
                      ) : (
                        <View style={styles.voiceLoadingContainer}>
                          <Ionicons name="mic" size={16} color="rgba(255,255,255,0.8)" />
                          <Text style={styles.voiceLoadingText}>Загрузка</Text>
                        </View>
                      )}
                    </LinearGradient>
                    
                    {/* Transcription Text (if ready) */}
                    {!isLoading && item.text && (
                      <View style={[styles.voiceTranscription, { backgroundColor: isDark ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.95)' }]}>
                        <Ionicons name="document-text-outline" size={12} color={isDark ? '#94a3b8' : '#64748b'} style={{ marginRight: 6 }} />
                        <Text style={[styles.voiceTranscriptionText, { color: isDark ? '#e2e8f0' : '#1e293b' }]}>
                          {item.text}
                        </Text>
                      </View>
                    )}
                  </View>
              </Animated.View>
         );
    }

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
            colors={[Theme.accent.primary, Theme.accent.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.messageUserBubble}
          >
            <Text style={styles.messageUserText}>{item.text}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.aiMessageRow}>
            {/* AI Avatar */}
            <View style={styles.aiAvatarContainer}>
              <LinearGradient
                colors={[Theme.accent.primary, Theme.accent.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.aiAvatar}
              >
                <Ionicons name="sparkles" size={14} color="#FFF" />
              </LinearGradient>
            </View>
            {/* AI Message Bubble */}
            <View
              style={[
                styles.messageAIBubble,
                {
                  backgroundColor: Theme.background.card,
                  borderColor: Theme.border.default,
                },
              ]}
            >
              <Text
                style={[
                  styles.messageAIText,
                  { color: Theme.text.primary },
                ]}
              >
                {item.text}
                {item.isTyping && (
                  <Text style={{ color: Theme.accent.primary }}>...</Text>
                )}
              </Text>
            </View>
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
            colors={Theme.gradients.backgroundDeep}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={{ flex: 1 }}>
            {/* Aurora Header - Minimal floating */}
            <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 8,
              backgroundColor: 'transparent',
              borderBottomWidth: 0,
            },
          ]}
            >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              onPress={() => setShowSidebar(true)}
              style={[styles.backButton, { backgroundColor: Theme.glass.background, borderColor: Theme.glass.border }]}
            >
              <Ionicons
                name="grid-outline"
                size={20}
                color={Theme.text.secondary}
              />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <View style={styles.headerOrb}>
                <LinearGradient
                  colors={[Theme.accent.primary, Theme.accent.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.headerOrbGradient}
                />
              </View>
              <Text
                style={[
                  styles.headerTitle,
                  { color: Theme.text.primary },
                ]}
              >
                Aurora
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.panicButtonEnhanced}
              onPress={() => router.push('/panic')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['rgba(239, 68, 68, 0.2)', 'rgba(220, 38, 38, 0.15)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.panicButtonGradient}
              >
                <Ionicons
                  name="warning"
                  size={20}
                  color="#EF4444"
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

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
        {/* Chat Messages Container - No gesture here, gestures on messages container only */}
        <View 
          style={[{ flex: 1 }]}
        >

        {/* Messages or Welcome State */}
        {messages.length === 0 ? (
          <View style={[
            styles.emptyStateContainer,
            { 
              paddingTop: insets.top + 60,
              paddingBottom: listPaddingBottom
            }
          ]}>
            <View style={styles.welcomeCard}>
              {/* Floating Orb with aurora glow */}
              <View style={styles.orbContainer}>
                <View style={styles.orbGlowOuter}>
                  <View style={styles.orbGlowMiddle}>
                    <LinearGradient
                      colors={[Theme.accent.primaryLight, Theme.accent.primary, Theme.accent.secondary]}
                      style={styles.orbCore}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                  </View>
                </View>
              </View>
              
              <Text style={[styles.welcomeTitle, { color: Theme.text.primary }]}>
                Чем могу помочь?
              </Text>
              <Text style={[styles.welcomeSubtitle, { color: Theme.text.tertiary }]}>
                Голосом или текстом — я здесь для вас
              </Text>
              
              {/* Suggestion pills */}
              <View style={styles.suggestionContainer}>
                <TouchableOpacity style={styles.suggestionPill}>
                  <Text style={styles.suggestionText}>💭 Хочу поговорить</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.suggestionPill}>
                  <Text style={styles.suggestionText}>🌿 Помоги расслабиться</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.suggestionPill}>
                  <Text style={styles.suggestionText}>✨ Вдохнови меня</Text>
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
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={[
              styles.messagesList,
              { paddingBottom: listPaddingBottom + 40, flexGrow: 1 }
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            showsVerticalScrollIndicator={true}
            scrollIndicatorInsets={{ right: 1 }}
            scrollEnabled={true}
            nestedScrollEnabled={false}
            scrollEventThrottle={16}
            decelerationRate="normal"
            removeClippedSubviews={true}
            onLayout={() => {
              // Auto-scroll when FlatList layout is measured
              if (messages.length > 0) {
                requestAnimationFrame(() => {
                  flatListRef.current?.scrollToEnd({ animated: false });
                });
              }
            }}
            onContentSizeChange={() => {
              // Auto-scroll when content size changes
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
          />
        )}

        </View>

        {/* Input Area with Gesture Support */}
        <Animated.View
          style={[
            styles.inputContainer,
            {
              backgroundColor: 'rgba(0, 0, 0, 0.95)',
              paddingBottom: insets.bottom + 8,
              marginBottom: isKeyboardVisible
                ? keyboardHeight - insets.bottom + 8
                : tabBarOffset + 12,
              borderTopWidth: 1,
              borderTopColor: Theme.border.accent,
              shadowColor: Theme.accent.primary,
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.2,
              shadowRadius: 20,
              elevation: 12,
              transform: [{ translateY: keyboardTranslateY }],
            },
          ]}
          {...(panResponderRef.current?.panHandlers || {})}
        >
          {/* Recording Mode - Full Width Recording UI */}
          {isRecording ? (
            <Animated.View entering={FadeInDown} style={styles.recordingContainer}>
              <LinearGradient
                colors={['rgba(239, 68, 68, 0.15)', 'rgba(220, 38, 38, 0.1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.recordingBox}
              >
                {/* Recording Indicator */}
                <View style={styles.recordingInfo}>
                  <Animated.View 
                    entering={ZoomIn}
                    style={styles.recordingPulseOuter}
                  >
                    <View style={styles.recordingPulseInner}>
                      <View style={styles.recordingDotLarge} />
                    </View>
                  </Animated.View>
                  <View style={styles.recordingTextBox}>
                    <Text style={[styles.recordingLabel, { color: Theme.status.error }]}>
                      Идёт запись
                    </Text>
                    <Text style={[styles.recordingTimer, { color: Theme.status.error }]}>
                      {String(Math.floor(recordingTime / 60)).padStart(2, '0')}:{String(recordingTime % 60).padStart(2, '0')}
                    </Text>
                  </View>
                </View>

                {/* Recording Actions */}
                <View style={styles.recordingActions}>
                  {/* Cancel Button */}
                  <TouchableOpacity
                    onPress={() => {
                      if (recordingIntervalRef.current) {
                        clearInterval(recordingIntervalRef.current);
                      }
                      setIsRecording(false);
                      if (recording) {
                        recording.stopAndUnloadAsync().catch(() => {});
                      }
                      setRecording(null);
                      setRecordingTime(0);
                    }}
                    style={[styles.recordingCancelBtn, { backgroundColor: isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(107, 114, 128, 0.15)' }]}
                  >
                    <Ionicons name="close" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
                  </TouchableOpacity>

                  {/* Send/Stop Button */}
                  <TouchableOpacity
                    onPress={stopRecording}
                    style={styles.recordingStopBtn}
                  >
                    <LinearGradient
                      colors={['#ef4444', '#dc2626']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.recordingStopGradient}
                    >
                      <Ionicons name="send" size={22} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </Animated.View>
          ) : (
            /* Normal Input Mode */
            <View style={styles.inputWrapper}>
              {/* Mic Button (Left) */}
              <TouchableOpacity
                onPress={startRecording}
                disabled={!activeChatId || isLoading}
                style={[
                  styles.micButton,
                  {
                    backgroundColor: 'rgba(255, 107, 0, 0.15)',
                    borderColor: 'rgba(255, 107, 0, 0.3)',
                    opacity: !activeChatId ? 0.5 : 1,
                  }
                ]}
              >
                <Ionicons 
                  name="mic" 
                  size={22} 
                  color={Theme.accent.primary} 
                />
              </TouchableOpacity>

              {/* Text Input */}
              <View
                style={[
                  styles.inputFieldBox,
                  {
                    borderColor: Theme.border.default,
                    backgroundColor: Theme.background.tertiary,
                  }
                ]}
              >
                <TextInput
                  ref={textInputRef}
                  style={[
                    styles.input,
                    { color: Theme.text.primary }
                  ]}
                  placeholder="Напишите сообщение..."
                  placeholderTextColor={Theme.text.tertiary}
                  multiline
                  value={message}
                  onChangeText={setMessage}
                  maxLength={1000}
                />
              </View>

              {/* Send Button (Right) */}
              {(message.trim().length > 0 || isLoading) && (
                <Animated.View entering={FadeInRight} exiting={FadeOutRight}>
                  <TouchableOpacity
                    onPress={handleSendMessage}
                    disabled={isLoading || !message.trim() || !canSendMessage()}
                    style={styles.sendBtnWrapper}
                  >
                    <LinearGradient
                      colors={!canSendMessage() ? ['#4b5563', '#374151'] : isLoading ? ['#6b7280', '#4b5563'] : [Theme.accent.primary, Theme.accent.primaryLight]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.sendBtn}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Ionicons name="send" size={18} color="#fff" />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>
          )}
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
  // ═══════════════════════════════════════════════════════════════════════
  // AURORA Chat Design — Immersive, fluid interface
  // ═══════════════════════════════════════════════════════════════════════
  
  mainContainer: {
    flex: 1,
    backgroundColor: Theme.background.pure,
  },
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  
  // ─────────────────────────────────────────────────────────────────────
  // HEADER — Floating, transparent
  // ─────────────────────────────────────────────────────────────────────
  header: {
    paddingBottom: 12,
    paddingHorizontal: Theme.spacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerOrb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    ...Theme.shadow.glow,
  },
  headerOrbGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.glass.background,
    borderWidth: 1,
    borderColor: Theme.glass.border,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.glass.background,
    borderWidth: 1,
    borderColor: Theme.glass.border,
  },
  panicButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.glass.background,
    borderWidth: 1,
    borderColor: Theme.status.errorBorder,
  },
  panicButtonEnhanced: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  panicButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  headerTitle: {
    fontSize: Theme.typography.size.lg,
    fontWeight: Theme.typography.weight.semibold,
    letterSpacing: Theme.typography.tracking.wide,
    color: Theme.text.primary,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: Theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.background.elevated,
  },
  headerButton: {
    padding: 10,
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
    paddingVertical: 5,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.status.warningBg,
    borderWidth: 1,
    borderColor: Theme.status.warningBorder,
  },
  temporaryText: {
    fontSize: 11,
    fontWeight: Theme.typography.weight.semibold,
    color: Theme.status.warning,
    letterSpacing: 0.3,
  },
  
  // ─────────────────────────────────────────────────────────────────────
  // MESSAGES LIST — Soft, glowing bubbles
  // ─────────────────────────────────────────────────────────────────────
  messagesList: {
    paddingHorizontal: Theme.spacing.gutter,
    paddingTop: Theme.spacing.xl,
  },
  messageContainer: {
    marginBottom: Theme.spacing.lg,
    maxWidth: '82%',
  },
  messageContainerUser: {
    alignSelf: 'flex-end',
  },
  messageContainerAI: {
    alignSelf: 'flex-start',
  },
  messageUserBubble: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md + 2,
    borderRadius: Theme.radius.xl,
    borderBottomRightRadius: Theme.radius.sm,
    backgroundColor: Theme.accent.primary,
    ...Theme.shadow.glow,
  },
  messageUserText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.size.base,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  messageAIBubble: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md + 2,
    borderRadius: Theme.radius.xl,
    borderBottomLeftRadius: Theme.radius.sm,
    borderWidth: 1,
    backgroundColor: Theme.glass.background,
    borderColor: Theme.glass.border,
    flex: 1,
  },
  messageAIText: {
    fontSize: Theme.typography.size.base,
    lineHeight: 24,
    letterSpacing: 0.2,
    color: Theme.text.primary,
  },
  aiMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  aiAvatarContainer: {
    marginBottom: 4,
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadow.sm,
  },
  
  // ─────────────────────────────────────────────────────────────────────
  // INPUT AREA — Floating, glowing
  // ─────────────────────────────────────────────────────────────────────
  inputContainer: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    backgroundColor: Theme.glass.background,
    borderRadius: Theme.radius.xxxl,
    padding: 8,
    borderWidth: 1,
    borderColor: Theme.glass.border,
    ...Theme.shadow.md,
  },
  inputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Theme.radius.xl,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: Theme.background.tertiary,
    borderWidth: 1,
    borderColor: Theme.border.default,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: Theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.background.elevated,
  },
  voiceButton: {
    width: 36,
    height: 36,
    borderRadius: Theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.background.elevated,
  },
  input: {
    flex: 1,
    fontSize: Theme.typography.size.md,
    maxHeight: 100,
    paddingVertical: 6,
    lineHeight: 22,
    color: Theme.text.primary,
  },
  sendButtonContainer: {
    marginBottom: 4,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: Theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.accent.primary,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  // ─────────────────────────────────────────────────────────────────────
  // EMPTY STATE / WELCOME — Aurora orb, immersive
  // ─────────────────────────────────────────────────────────────────────
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.gutter,
  },
  welcomeCard: {
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
  },
  orbContainer: {
    marginBottom: Theme.spacing.xxxl,
  },
  orbGlowOuter: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Theme.accent.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadow.glowStrong,
  },
  orbGlowMiddle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Theme.accent.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbCore: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  welcomeIconContainer: {
    marginBottom: Theme.spacing.xxl,
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.accent.primary,
    ...Theme.shadow.glow,
  },
  welcomeTitle: {
    fontSize: Theme.typography.size.xxl,
    fontWeight: Theme.typography.weight.semibold,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
    letterSpacing: Theme.typography.tracking.normal,
    color: Theme.text.primary,
  },
  welcomeSubtitle: {
    fontSize: Theme.typography.size.base,
    fontWeight: Theme.typography.weight.regular,
    marginBottom: Theme.spacing.xxl,
    textAlign: 'center',
    lineHeight: 24,
    color: Theme.text.tertiary,
  },
  suggestionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
  },
  suggestionPill: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm + 2,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.glass.background,
    borderWidth: 1,
    borderColor: Theme.glass.border,
  },
  suggestionText: {
    fontSize: Theme.typography.size.sm,
    color: Theme.text.secondary,
    fontWeight: Theme.typography.weight.medium,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    width: '100%',
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    backgroundColor: Theme.glass.background,
    borderColor: Theme.glass.border,
  },
  actionText: {
    fontSize: Theme.typography.size.sm,
    fontWeight: Theme.typography.weight.medium,
    color: Theme.text.primary,
  },
  welcomeText: {
    fontSize: Theme.typography.size.base,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Theme.spacing.lg,
    color: Theme.text.secondary,
  },
  welcomeFeatures: {
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  featureText: {
    fontSize: Theme.typography.size.base,
    fontWeight: Theme.typography.weight.medium,
    color: Theme.text.secondary,
  },
  welcomePrompt: {
    fontSize: Theme.typography.size.lg,
    fontWeight: Theme.typography.weight.semibold,
    textAlign: 'center',
    color: Theme.text.primary,
  },
  
  // ─────────────────────────────────────────────────────────────────────
  // ERROR STATES
  // ─────────────────────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    marginHorizontal: Theme.spacing.md,
    marginBottom: 10,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.status.errorBg,
    borderWidth: 1,
    borderColor: Theme.status.errorBorder,
  },
  errorText: {
    flex: 1,
    fontSize: Theme.typography.size.sm,
    fontWeight: Theme.typography.weight.medium,
    color: Theme.status.error,
  },
  
  // ─────────────────────────────────────────────────────────────────────
  // RECORDING UI
  // ─────────────────────────────────────────────────────────────────────
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    backgroundColor: Theme.status.errorBg,
    borderColor: Theme.status.errorBorder,
  },
  recordingPulse: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.status.error,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  recordingText: {
    fontSize: Theme.typography.size.sm,
    fontWeight: Theme.typography.weight.semibold,
    letterSpacing: 0.2,
    color: Theme.text.primary,
  },
  recordingContainer: {
    width: '100%',
  },
  recordingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.lg,
    borderRadius: Theme.radius.xl,
    borderWidth: 1.5,
    borderColor: Theme.status.errorBorder,
    backgroundColor: Theme.status.errorBg,
  },
  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  recordingPulseOuter: {
    width: 48,
    height: 48,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.status.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.status.errorBorder,
  },
  recordingPulseInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.status.error,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.3,
  },
  recordingDotLarge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Theme.status.error,
  },
  recordingTextBox: {
    gap: 4,
  },
  recordingLabel: {
    fontSize: Theme.typography.size.sm,
    fontWeight: Theme.typography.weight.semibold,
    letterSpacing: 0.2,
    color: Theme.status.error,
  },
  recordingTimer: {
    fontSize: Theme.typography.size.xxl,
    fontWeight: Theme.typography.weight.bold,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1.5,
    color: Theme.text.primary,
  },
  recordingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  recordingCancelBtn: {
    width: 44,
    height: 44,
    borderRadius: Theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.background.elevated,
  },
  recordingStopBtn: {
    overflow: 'hidden',
    borderRadius: Theme.radius.lg,
  },
  recordingStopGradient: {
    width: 52,
    height: 52,
    borderRadius: Theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.status.error,
  },
// ─────────────────────────────────────────────────────────────────────
  // INPUT CONTROLS — Glowing, soft
  // ─────────────────────────────────────────────────────────────────────
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.accent.primarySoft,
    borderWidth: 1,
    borderColor: Theme.accent.primaryGlow,
  },
  inputFieldBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Theme.radius.xxl,
    paddingHorizontal: Theme.spacing.md,
    backgroundColor: 'transparent',
    minHeight: 44,
    maxHeight: 100,
  },
  sendBtnWrapper: {
    overflow: 'hidden',
    borderRadius: 24,
    ...Theme.shadow.glow,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.accent.primary,
  },
  inputField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Theme.radius.lg,
    paddingLeft: 6,
    borderWidth: 1,
    borderColor: Theme.border.default,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    backgroundColor: Theme.background.tertiary,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 10,
  },
  
  // ─────────────────────────────────────────────────────────────────────
  // VOICE MESSAGE UI
  // ─────────────────────────────────────────────────────────────────────
  voiceMessageBubble: {
    borderRadius: Theme.radius.lg,
    overflow: 'hidden',
    minWidth: 220,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    backgroundColor: Theme.background.card,
    borderWidth: 1,
    borderColor: Theme.border.default,
  },
  voiceMessageHeader: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
  },
  voiceLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  voiceLoadingText: {
    color: Theme.text.secondary,
    fontSize: Theme.typography.size.sm,
    fontWeight: Theme.typography.weight.medium,
  },
  voicePlayerWrapper: {
    marginVertical: 4,
  },
  voiceTranscription: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.border.default,
    backgroundColor: Theme.background.tertiary,
  },
  voiceTranscriptionText: {
    flex: 1,
    fontSize: Theme.typography.size.sm,
    lineHeight: 21,
    color: Theme.text.primary,
  },
});






