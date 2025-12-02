import React, { useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInLeft, FadeOutLeft, FadeIn, FadeOut } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme } from '@/utils/ThemeContext';
import { LayoutAnimation, Platform, UIManager } from 'react-native';

interface Chat {
  id: number;
  title: string;
  preview: string;
  timestamp: Date;
}

interface ChatSidebarProps {
  visible: boolean;
  onClose: () => void;
  chats: Chat[];
  currentChatId: number | null;
  onSelectChat: (id: number) => void;
  onNewChat: () => void;
  onDeleteChat?: (id: number) => void;
}

export function ChatSidebar({
  visible,
  onClose,
  chats,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
}: ChatSidebarProps) {
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  const [isRendered, setIsRendered] = React.useState(visible);
  const swipeableRefs = useRef<{ [key: number]: Swipeable | null }>({});

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
    } else {
      const timer = setTimeout(() => setIsRendered(false), 220);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleSelectChat = (id: number) => {
    onSelectChat(id);
    onClose();
  };

  const handleNewChat = () => {
    onNewChat();
    onClose();
  };

  const handleDeleteChat = (id: number) => {
    Alert.alert(
      'Удалить чат?',
      'Вы уверены, что хотите удалить этот чат? Это действие нельзя отменить.',
      [
        {
          text: 'Отмена',
          style: 'cancel',
          onPress: () => {
            swipeableRefs.current[id]?.close();
          },
        },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            if (onDeleteChat) {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              onDeleteChat(id);
            }
            swipeableRefs.current[id]?.close();
          },
        },
      ]
    );
  };

  const renderRightActions = (chatId: number) => {
    return (
      <TouchableOpacity
        onPress={() => handleDeleteChat(chatId)}
        style={[
          styles.deleteAction,
          { backgroundColor: isDark ? '#dc2626' : '#ef4444' },
        ]}
      >
        <Ionicons name="trash-outline" size={24} color="#fff" />
        <Text style={styles.deleteText}>Удалить</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={isRendered}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.container}>
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        >
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={styles.backdropOverlay}
          />
        </TouchableOpacity>

        {/* Sidebar */}
        <Animated.View
          entering={FadeInLeft.springify()}
          exiting={FadeOutLeft.duration(250)}
          style={styles.sidebar}
        >
          <BlurView
            intensity={85}
            tint={isDark ? 'dark' : 'light'}
            style={styles.blurContainer}
          >
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(30, 41, 59, 0.7)', 'rgba(15, 23, 42, 0.5)']
                  : ['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.5)']
              }
              style={styles.gradient}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTop}>
                  <Text
                    style={[
                      styles.headerTitle,
                      { color: isDark ? '#e2e8f0' : '#1e293b' },
                    ]}
                  >
                    Чаты
                  </Text>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons
                      name="close"
                      size={24}
                      color={isDark ? '#94a3b8' : '#64748b'}
                    />
                  </TouchableOpacity>
                </View>

                {/* New Chat Button */}
                <TouchableOpacity onPress={handleNewChat}>
                  <LinearGradient
                    colors={['#3b82f6', '#8b5cf6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.newChatButton}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={styles.newChatText}>Новый разговор</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Chats List */}
              <ScrollView
                style={styles.chatsList}
                showsVerticalScrollIndicator={false}
              >
                {chats.map((chat) => (
                  <Swipeable
                    key={chat.id}
                    ref={(ref) => {
                      swipeableRefs.current[chat.id] = ref;
                    }}
                    renderRightActions={() => renderRightActions(chat.id)}
                    overshootRight={false}
                  >
                    <TouchableOpacity
                      onPress={() => handleSelectChat(chat.id)}
                      style={[
                        styles.chatItem,
                        currentChatId === chat.id && {
                          backgroundColor: isDark
                            ? 'rgba(139, 92, 246, 0.2)'
                            : 'rgba(139, 92, 246, 0.1)',
                          borderColor: isDark
                            ? 'rgba(139, 92, 246, 0.5)'
                            : 'rgba(139, 92, 246, 0.3)',
                        },
                      ]}
                    >
                      <View style={styles.chatItemContent}>
                        <Ionicons
                          name="chatbubble-outline"
                          size={18}
                          color={
                            currentChatId === chat.id
                              ? isDark
                                ? '#a78bfa'
                                : '#8b5cf6'
                              : isDark
                              ? '#64748b'
                              : '#94a3b8'
                          }
                        />
                        <View style={styles.chatItemText}>
                          <Text
                            style={[
                              styles.chatTitle,
                              {
                                color:
                                  currentChatId === chat.id
                                    ? isDark
                                      ? '#c4b5fd'
                                      : '#7c3aed'
                                    : isDark
                                    ? '#cbd5e1'
                                    : '#475569',
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {chat.title}
                          </Text>
                          <Text
                            style={[
                              styles.chatPreview,
                              { color: isDark ? '#64748b' : '#94a3b8' },
                            ]}
                            numberOfLines={1}
                          >
                            {chat.preview}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </Swipeable>
                ))}
              </ScrollView>
            </LinearGradient>
          </BlurView>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 300,
  },
  blurContainer: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 0,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  newChatText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  chatsList: {
    flex: 1,
    padding: 16,
  },
  chatItemWrapper: {
    marginBottom: 10,
  },
  chatItem: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  chatItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chatItemText: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  chatPreview: {
    fontSize: 13,
    lineHeight: 18,
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 84,
    marginBottom: 8,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  deleteText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  deleteButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
});
