import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { inboxApi, AnonymousMessage } from '../services/api';
import { useTheme } from '../utils/ThemeContext';
import { AnimatedGradient } from '@/components/AnimatedGradient';

export default function InboxPage() {
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  
  const [messages, setMessages] = useState<AnonymousMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [canSend, setCanSend] = useState(true);
  const [minutesLeft, setMinutesLeft] = useState(0);
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    loadMessages();
    checkCanSend();
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await inboxApi.getReceived();
      if (response.success) {
        setMessages(response.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkCanSend = async () => {
    try {
      const response = await inboxApi.canSend();
      if (response.success) {
        setCanSend(response.canSend);
        setMinutesLeft(response.minutesLeft || 0);
      }
    } catch (error) {
      console.error('Error checking send availability:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadMessages(), checkCanSend()]);
    setRefreshing(false);
  };

  const handleSendWish = async () => {
    if (!newMessage.trim()) {
      Alert.alert('Ошибка', 'Пожалуйста, введите сообщение');
      return;
    }

    if (newMessage.length > 500) {
      Alert.alert('Ошибка', 'Сообщение слишком длинное (макс. 500 символов)');
      return;
    }

    try {
      setSendingMessage(true);
      const response = await inboxApi.sendWish(newMessage);
      
      if (response.success) {
        Alert.alert('Успешно! 💌', response.message || 'Пожелание отправлено');
        setNewMessage('');
        setCanSend(false);
        setMinutesLeft(8 * 60); // 8 часов в минутах
      } else {
        Alert.alert('Ошибка', response.error || 'Не удалось отправить сообщение');
      }
    } catch (error) {
      console.error('Error sending wish:', error);
      Alert.alert('Ошибка', 'Не удалось отправить сообщение');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleMarkAsRead = async (messageId: number) => {
    try {
      await inboxApi.markAsRead(messageId);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, is_read: true } : msg
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const renderMessage = ({ item }: { item: AnonymousMessage }) => (
    <TouchableOpacity
      style={[
        styles.messageCard,
        { backgroundColor: isDark
            ? Platform.OS === 'ios'
              ? 'rgba(30, 41, 59, 0.6)'
              : '#1e293b'
            : Platform.OS === 'ios'
            ? '#fff'
            : '#f8fafc',
          shadowOpacity: Platform.OS === 'ios' ? 0.06 : 0,
          elevation: Platform.OS === 'ios' ? 3 : 0,
        },
        !item.is_read && [styles.unreadCard, { borderLeftColor: isDark ? '#a78bfa' : '#6B46C1' }]
      ]}
      onPress={() => !item.is_read && handleMarkAsRead(item.id)}
    >
      <View style={styles.messageHeader}>
        <Ionicons
          name={item.is_read ? "mail-open-outline" : "mail-outline"}
          size={20}
          color={isDark ? '#a78bfa' : '#6B46C1'}
        />
        <Text style={[styles.messageDate, { color: isDark ? '#64748b' : '#9CA3AF' }]}>
          {new Date(item.sent_at).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
      <Text style={[styles.messageText, { color: isDark ? '#e2e8f0' : '#1F2937' }]}>
        {item.message}
      </Text>
      {!item.is_read && (
        <View style={[styles.unreadBadge, { backgroundColor: isDark ? '#a78bfa' : '#6B46C1' }]} />
      )}
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="mail-outline" size={80} color={isDark ? '#334155' : '#E9D5FF'} />
      <Text style={[styles.emptyTitle, { color: isDark ? '#a78bfa' : '#6B46C1' }]}>
        Inbox пуст
      </Text>
      <Text style={[styles.emptyText, { color: isDark ? '#64748b' : '#9CA3AF' }]}>
        Здесь будут отображаться анонимные пожелания от других пользователей
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AnimatedGradient
        lightColors={['#e0e7ff', '#ddd6fe', '#e9d5ff']}
        darkColors={['#1a1a2e', '#16213e', '#0f3460', '#1a1a2e']}
        isDark={isDark}
      />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? 'rgba(26, 26, 46, 0.95)' : '#ffffff' }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="mail" size={24} color={isDark ? '#818cf8' : '#8b5cf6'} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>Inbox</Text>
            <Text style={[styles.headerSubtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              Анонимные пожелания
            </Text>
          </View>
          <TouchableOpacity onPress={onRefresh} style={[styles.refreshButton, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(139, 92, 246, 0.1)' }]}>
            <Ionicons name="refresh" size={20} color={isDark ? '#818cf8' : '#8b5cf6'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Send Section */}
      <View style={[styles.sendSection, { 
        backgroundColor: isDark
          ? Platform.OS === 'ios'
            ? 'rgba(30, 41, 59, 0.6)'
            : '#1e293b'
          : Platform.OS === 'ios'
          ? '#ffffff'
          : '#f8fafc',
        borderColor: isDark ? 'rgba(99, 102, 241, 0.25)' : '#e2e8f0',
        shadowOpacity: Platform.OS === 'ios' ? 0.08 : 0,
        elevation: Platform.OS === 'ios' ? 4 : 0,
      }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
          Отправить пожелание 💬
        </Text>
        {canSend ? (
          <>
            <View style={[styles.inputContainer, { backgroundColor: isDark
              ? Platform.OS === 'ios'
                ? 'rgba(15, 23, 42, 0.6)'
                : '#0f172a'
              : Platform.OS === 'ios'
              ? '#f8fafc'
              : '#ffffff'
            }]}>
              <TextInput
                style={[styles.input, { 
                  color: isDark ? '#f1f5f9' : '#0f172a',
                }]}
                placeholder="Напишите доброе пожелание..."
                placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                maxLength={500}
              />
            </View>
            <View style={styles.inputFooter}>
              <Text style={[styles.charCount, { color: isDark ? '#64748b' : '#94a3b8' }]}>
                {newMessage.length}/500
              </Text>
              <TouchableOpacity
                style={[styles.sendButton, sendingMessage && styles.sendButtonDisabled]}
                onPress={handleSendWish}
                disabled={sendingMessage || !newMessage.trim()}
              >
                <View style={[styles.sendButtonGradient, { 
                  backgroundColor: sendingMessage || !newMessage.trim() ? (isDark ? '#475569' : '#cbd5e1') : (isDark ? '#6366f1' : '#8b5cf6')
                }]}>
                  {sendingMessage ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={18} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.cooldownContainer}>
            <Ionicons name="time-outline" size={32} color={isDark ? '#a78bfa' : '#6B46C1'} />
            <Text style={[styles.cooldownText, { color: isDark ? '#94a3b8' : '#6B7280' }]}>
              Можно отправить следующее пожелание через
            </Text>
            <Text style={[styles.cooldownTime, { color: isDark ? '#a78bfa' : '#6B46C1' }]}>
              {Math.floor(minutesLeft / 60)} ч {minutesLeft % 60} мин
            </Text>
          </View>
        )}
      </View>

      {/* Messages List */}
      <View style={styles.messagesSection}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#a78bfa' : '#6B46C1' }]}>
          Полученные пожелания
        </Text>
        {loading && !refreshing ? (
          <ActivityIndicator color={isDark ? '#a78bfa' : '#6B46C1'} size="large" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={isDark ? '#a78bfa' : '#6B46C1'}
              />
            }
            contentContainerStyle={messages.length === 0 ? styles.emptyList : undefined}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  sendSection: {
    margin: 20,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.OS === 'ios' ? 0.08 : 0,
    shadowRadius: 12,
    elevation: Platform.OS === 'ios' ? 4 : 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  inputContainer: {
    borderRadius: 20,
    padding: 4,
    marginBottom: 12,
  },
  input: {
    padding: 14,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  sendButton: {
    borderRadius: 22,
  },
  sendButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  cooldownContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  cooldownText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  cooldownTime: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  messagesSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  messageCard: {
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Platform.OS === 'ios' ? 0.06 : 0,
    shadowRadius: 8,
    elevation: Platform.OS === 'ios' ? 3 : 0,
    position: 'relative',
  },
  unreadCard: {
    borderLeftWidth: 4,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  messageDate: {
    fontSize: 13,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  unreadBadge: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
    fontWeight: '500',
  },
});
