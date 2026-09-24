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
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '@/constants/theme';

export default function InboxPage() {
  const isDark = true; // Force dark theme
  
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
        { backgroundColor: Theme.background.card,
          shadowOpacity: Platform.OS === 'ios' ? 0.08 : 0,
          elevation: Platform.OS === 'ios' ? 3 : 0,
          borderColor: Theme.border.primary,
        },
        !item.is_read && [styles.unreadCard, { borderLeftColor: Theme.accent.primary }]
      ]}
      onPress={() => !item.is_read && handleMarkAsRead(item.id)}
    >
      <View style={styles.messageHeader}>
        <Ionicons
          name={item.is_read ? "mail-open-outline" : "mail-outline"}
          size={20}
          color={Theme.accent.primary}
        />
        <Text style={[styles.messageDate, { color: Theme.text.tertiary }]}>
          {new Date(item.sent_at).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
      <Text style={[styles.messageText, { color: Theme.text.primary }]}>
        {item.message}
      </Text>
      {!item.is_read && (
        <View style={[styles.unreadBadge, { backgroundColor: Theme.accent.primary }]} />
      )}
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="mail-outline" size={80} color={Theme.text.tertiary} />
      <Text style={[styles.emptyTitle, { color: Theme.accent.primary }]}>
        Inbox пуст
      </Text>
      <Text style={[styles.emptyText, { color: Theme.text.secondary }]}>
        Здесь будут отображаться анонимные пожелания от других пользователей
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[Theme.background.primary, Theme.background.secondary]}
        style={StyleSheet.absoluteFill}
      />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: 'rgba(0, 0, 0, 0.8)' }]}>
        <View style={styles.headerContent}>
          <View style={[styles.headerIcon, { backgroundColor: 'rgba(255, 107, 0, 0.12)', borderColor: 'rgba(255, 107, 0, 0.2)' }]}>
            <Ionicons name="mail" size={24} color={Theme.accent.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: Theme.text.primary }]}>Inbox</Text>
            <Text style={[styles.headerSubtitle, { color: Theme.text.secondary }]}>
              Анонимные пожелания
            </Text>
          </View>
          <TouchableOpacity onPress={onRefresh} style={[styles.refreshButton, { backgroundColor: 'rgba(255, 107, 0, 0.1)', borderColor: 'rgba(255, 107, 0, 0.2)' }]}>
            <Ionicons name="refresh" size={20} color={Theme.accent.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Send Section */}
      <View style={[styles.sendSection, { 
        backgroundColor: Theme.background.card,
        borderColor: 'rgba(255, 107, 0, 0.25)',
        shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0,
        elevation: Platform.OS === 'ios' ? 4 : 0,
      }]}>
        <Text style={[styles.sectionTitle, { color: Theme.text.primary }]}>
          Отправить пожелание 💬
        </Text>
        {canSend ? (
          <>
            <View style={[styles.inputContainer, { backgroundColor: Theme.background.secondary }]}>
              <TextInput
                style={[styles.input, { 
                  color: Theme.text.primary,
                }]}
                placeholder="Напишите доброе пожелание..."
                placeholderTextColor={Theme.text.tertiary}
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                maxLength={500}
              />
            </View>
            <View style={styles.inputFooter}>
              <Text style={[styles.charCount, { color: Theme.text.tertiary }]}>
                {newMessage.length}/500
              </Text>
              <TouchableOpacity
                style={[styles.sendButton, sendingMessage && styles.sendButtonDisabled]}
                onPress={handleSendWish}
                disabled={sendingMessage || !newMessage.trim()}
              >
                <View style={[styles.sendButtonGradient, { 
                  backgroundColor: sendingMessage || !newMessage.trim() ? Theme.text.tertiary : Theme.accent.primary
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
            <Ionicons name="time-outline" size={32} color={Theme.accent.primary} />
            <Text style={[styles.cooldownText, { color: Theme.text.secondary }]}>
              Можно отправить следующее пожелание через
            </Text>
            <Text style={[styles.cooldownTime, { color: Theme.accent.primary }]}>
              {Math.floor(minutesLeft / 60)} ч {minutesLeft % 60} мин
            </Text>
          </View>
        )}
      </View>

      {/* Messages List */}
      <View style={styles.messagesSection}>
        <Text style={[styles.sectionTitle, { color: Theme.accent.primary }]}>
          Полученные пожелания
        </Text>
        {loading && !refreshing ? (
          <ActivityIndicator color={Theme.accent.primary} size="large" style={{ marginTop: 20 }} />
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
                tintColor={Theme.accent.primary}
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
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 0, 0.2)',
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
    borderColor: 'rgba(255, 107, 0, 0.2)',
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
    shadowColor: '#A855F7',
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
