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
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import { Theme } from '@/constants/theme';

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
  const isDark = true; // Force dark theme
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

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (mins < 1) return 'Сейчас';
    if (mins < 60) return `${mins} мин`;
    if (hours < 24) return `${hours} ч`;
    if (days < 7) return `${days} дн`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
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
            intensity={90}
            tint="dark"
            style={styles.blurContainer}
          >
            <LinearGradient
              colors={[Theme.background.secondary, Theme.background.primary]}
              style={styles.gradient}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTop}>
                  <Text
                    style={[
                      styles.headerTitle,
                      { color: Theme.text.primary },
                    ]}
                  >
                    Чаты
                  </Text>
                  <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: Theme.background.card }]}>
                    <Ionicons
                      name="close"
                      size={24}
                      color={Theme.text.secondary}
                    />
                  </TouchableOpacity>
                </View>

                {/* New Chat Button */}
                <TouchableOpacity onPress={handleNewChat}>
                  <LinearGradient
                    colors={Theme.accent.gradient as any}
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
                        { backgroundColor: Theme.glass.background },
                        currentChatId === chat.id && {
                          backgroundColor: Theme.accent.primarySoft,
                          borderColor: Theme.accent.primary,
                          borderWidth: 1.5,
                        },
                      ]}
                    >
                      <View style={styles.chatItemContent}>
                        <View style={[
                          styles.chatIconContainer,
                          currentChatId === chat.id && { backgroundColor: 'rgba(255, 107, 0, 0.2)' }
                        ]}>
                          <Ionicons
                            name="chatbubble-outline"
                            size={18}
                            color={
                              currentChatId === chat.id
                                ? Theme.accent.primary
                                : Theme.text.tertiary
                            }
                          />
                        </View>
                        <View style={styles.chatItemText}>
                          <Text
                            style={[
                              styles.chatTitle,
                              {
                                color:
                                  currentChatId === chat.id
                                    ? Theme.accent.primary
                                    : Theme.text.primary,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {chat.title}
                          </Text>
                          <Text
                            style={[
                              styles.chatPreview,
                              { color: Theme.text.tertiary },
                            ]}
                            numberOfLines={1}
                          >
                            {chat.preview}
                          </Text>
                        </View>
                        <Text style={styles.chatTime}>
                          {formatTime(chat.timestamp)}
                        </Text>
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
  // AURORA Sidebar Design — Floating, glassmorphic
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 0, 20, 0.85)',
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 300,
    backgroundColor: Theme.glass.backgroundDark,
  },
  blurContainer: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: Theme.spacing.gutter,
    paddingBottom: Theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Theme.glass.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.xl,
  },
  headerTitle: {
    fontSize: Theme.typography.size.xxl,
    fontWeight: Theme.typography.weight.bold,
    letterSpacing: Theme.typography.tracking.wide,
    color: Theme.text.primary,
  },
  closeButton: {
    padding: 10,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.glass.background,
    borderWidth: 1,
    borderColor: Theme.glass.border,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.md,
    paddingVertical: Theme.spacing.lg,
    borderRadius: Theme.radius.lg,
    ...Theme.shadow.glow,
  },
  newChatText: {
    color: '#fff',
    fontSize: Theme.typography.size.md,
    fontWeight: Theme.typography.weight.semibold,
    letterSpacing: 0.3,
  },
  chatsList: {
    flex: 1,
    padding: Theme.spacing.lg,
  },
  chatItemWrapper: {
    marginBottom: Theme.spacing.md,
  },
  chatItem: {
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.glass.border,
    backgroundColor: Theme.glass.background,
    ...Theme.shadow.sm,
  },
  chatItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  chatIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatItemText: {
    flex: 1,
  },
  chatTime: {
    fontSize: 11,
    color: Theme.text.tertiary,
    fontWeight: '500',
  },
  chatTitle: {
    fontSize: Theme.typography.size.base,
    fontWeight: Theme.typography.weight.semibold,
    marginBottom: 4,
    letterSpacing: 0.1,
    color: Theme.text.primary,
  },
  chatPreview: {
    fontSize: Theme.typography.size.sm,
    lineHeight: 20,
    color: Theme.text.tertiary,
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: Theme.spacing.md,
    borderTopRightRadius: Theme.radius.lg,
    borderBottomRightRadius: Theme.radius.lg,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    backgroundColor: Theme.status.error,
  },
  deleteText: {
    color: '#fff',
    fontSize: Theme.typography.size.xs,
    fontWeight: Theme.typography.weight.bold,
    marginTop: 4,
  },
  deleteButton: {
    padding: Theme.spacing.sm,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.status.errorBg,
  },
});
