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

export default function InboxPage() {
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
      style={[styles.messageCard, !item.is_read && styles.unreadCard]}
      onPress={() => !item.is_read && handleMarkAsRead(item.id)}
    >
      <View style={styles.messageHeader}>
        <Ionicons
          name={item.is_read ? "mail-open-outline" : "mail-outline"}
          size={20}
          color="#6B46C1"
        />
        <Text style={styles.messageDate}>
          {new Date(item.sent_at).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
      <Text style={styles.messageText}>{item.message}</Text>
      {!item.is_read && <View style={styles.unreadBadge} />}
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="mail-outline" size={80} color="#E9D5FF" />
      <Text style={styles.emptyTitle}>Inbox пуст</Text>
      <Text style={styles.emptyText}>
        Здесь будут отображаться анонимные пожелания от других пользователей
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inbox 💌</Text>
        <Text style={styles.headerSubtitle}>Анонимные пожелания</Text>
      </View>

      {/* Send Section */}
      <View style={styles.sendSection}>
        <Text style={styles.sectionTitle}>Отправить пожелание</Text>
        {canSend ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Напишите доброе пожелание..."
              placeholderTextColor="#A78BFA"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
            />
            <View style={styles.inputFooter}>
              <Text style={styles.charCount}>{newMessage.length}/500</Text>
              <TouchableOpacity
                style={[styles.sendButton, sendingMessage && styles.sendButtonDisabled]}
                onPress={handleSendWish}
                disabled={sendingMessage}
              >
                {sendingMessage ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#fff" />
                    <Text style={styles.sendButtonText}>Отправить</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.cooldownContainer}>
            <Ionicons name="time-outline" size={32} color="#6B46C1" />
            <Text style={styles.cooldownText}>
              Можно отправить следующее пожелание через
            </Text>
            <Text style={styles.cooldownTime}>
              {Math.floor(minutesLeft / 60)} ч {minutesLeft % 60} мин
            </Text>
          </View>
        )}
      </View>

      {/* Messages List */}
      <View style={styles.messagesSection}>
        <Text style={styles.sectionTitle}>Полученные пожелания</Text>
        {loading && !refreshing ? (
          <ActivityIndicator color="#6B46C1" size="large" style={{ marginTop: 20 }} />
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
                tintColor="#6B46C1"
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
    backgroundColor: '#F3E8FF',
  },
  header: {
    backgroundColor: '#6B46C1',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E9D5FF',
    marginTop: 5,
  },
  sendSection: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B46C1',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 15,
    padding: 15,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  sendButton: {
    backgroundColor: '#6B46C1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  cooldownContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  cooldownText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 10,
    textAlign: 'center',
  },
  cooldownTime: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6B46C1',
    marginTop: 8,
  },
  messagesSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  messageCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#6B46C1',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  messageDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  messageText: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
  },
  unreadBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6B46C1',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B46C1',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 40,
  },
});
