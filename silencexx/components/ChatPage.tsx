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
import { useTheme } from '@/utils/ThemeContext';
import { ChatSidebar } from './ChatSidebar';
import { CrisisDetectionModal } from './CrisisDetectionModal';
import { DisclaimerModal } from './DisclaimerModal';
import chatApi, { ChatMessage } from '@/services/api';
import { useCrisisDetection } from '@/hooks/useCrisisDetection';
import { useDisclaimerState } from '@/hooks/useDisclaimerState';
import { AudioPlayer } from './AudioPlayer';

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
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  const insets = useSafeAreaInsets();
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
                bitRate: 256000,  // Увеличен до 256kbps
            },
            ios: {
                extension: '.m4a',
                outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
                audioQuality: Audio.IOSAudioQuality.MAX,  // Максимальное качество
                sampleRate: 44100,
                numberOfChannels: 2,  // Stereo
                bitRate: 256000,  // Увеличен до 256kbps
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
        // ВАЖНО: Сначала останавливаем и выгружаем
        await recording.stopAndUnloadAsync();
        
        // Restore audio mode
        await Audio.setAudioModeAsync({ 
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true 
        });
    } catch(e) {
      console.error('Error stopping recording:', e);
    }
    
    // ТОЛЬКО ПОСЛЕ stopAndUnloadAsync получаем URI
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
                 case 'uploaded': return 'Обработка...';
                 case 'transcribing': return 'Расшифровка...';
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
                      colors={['#3b82f6', '#8b5cf6']}
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
                          <Text style={styles.voiceLoadingText}>Голосовое</Text>
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
              onPress={() => {}}
            >
              {/* <Ionicons
                name="ellipsis-vertical"
                size={20}
                color={isDark ? '#e2e8f0' : '#1e293b'}
              /> */}
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
              backgroundColor: isDark ? 'rgba(10, 12, 18, 0.98)' : 'rgba(248, 250, 252, 0.98)',
              paddingBottom: insets.bottom + 8,
              marginBottom: isKeyboardVisible
                ? keyboardHeight - insets.bottom + 8
                : tabBarOffset + 12,
              borderTopWidth: 1,
              borderTopColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(226, 232, 240, 0.5)',
              shadowColor: isDark ? '#6366f1' : '#8b5cf6',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: isDark ? 0.15 : 0.08,
              shadowRadius: 16,
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
                colors={isDark ? ['rgba(239, 68, 68, 0.15)', 'rgba(220, 38, 38, 0.1)'] : ['rgba(239, 68, 68, 0.1)', 'rgba(220, 38, 38, 0.05)']}
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
                    <Text style={[styles.recordingLabel, { color: isDark ? '#fca5a5' : '#dc2626' }]}>
                      Запись аудио
                    </Text>
                    <Text style={[styles.recordingTimer, { color: isDark ? '#f87171' : '#b91c1c' }]}>
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
                    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(139, 92, 246, 0.1)',
                    borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(139, 92, 246, 0.25)',
                    opacity: !activeChatId ? 0.5 : 1,
                  }
                ]}
              >
                <Ionicons 
                  name="mic" 
                  size={22} 
                  color={isDark ? '#818cf8' : '#8b5cf6'} 
                />
              </TouchableOpacity>

              {/* Text Input */}
              <View
                style={[
                  styles.inputFieldBox,
                  {
                    borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(226, 232, 240, 0.8)',
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                  }
                ]}
              >
                <TextInput
                  ref={textInputRef}
                  style={[
                    styles.input,
                    { color: isDark ? '#f1f5f9' : '#1e293b' }
                  ]}
                  placeholder="Напишите сообщение..."
                  placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
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
                    disabled={isLoading || !message.trim()}
                    style={styles.sendBtnWrapper}
                  >
                    <LinearGradient
                      colors={isLoading ? ['#6b7280', '#4b5563'] : (isDark ? ['#6366f1', '#4f46e5'] : ['#8b5cf6', '#7c3aed'])}
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  recordingPulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordingText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  // New Recording Styles
  recordingContainer: {
    width: '100%',
  },
  recordingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recordingPulseOuter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingPulseInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingDotLarge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ef4444',
  },
  recordingTextBox: {
    gap: 2,
  },
  recordingLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  recordingTimer: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  recordingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recordingCancelBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingStopBtn: {
    overflow: 'hidden',
    borderRadius: 24,
  },
  recordingStopGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Mic Button
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  // Input Field
  inputFieldBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    minHeight: 44,
    maxHeight: 120,
  },
  // Send Button
  sendBtnWrapper: {
    overflow: 'hidden',
    borderRadius: 22,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingLeft: 4,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  // Voice Message Styles
  voiceMessageBubble: {
    borderRadius: 20,
    overflow: 'hidden',
    minWidth: 200,
    maxWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  voiceMessageHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  voiceLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  voiceLoadingText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500',
  },
  voicePlayerWrapper: {
    marginVertical: 2,
  },
  voiceTranscription: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  voiceTranscriptionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});






