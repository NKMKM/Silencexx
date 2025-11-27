import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/utils/ThemeContext';
import {
  registerForPushNotificationsAsync,
  scheduleDailyReminder,
  cancelAllReminders,
  getScheduledNotifications,
} from '@/utils/notifications';

interface ReminderModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ReminderModal({ visible, onClose }: ReminderModalProps) {
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  const [enabled, setEnabled] = useState(false);
  const [selectedHour, setSelectedHour] = useState(9);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    checkNotifications();
  }, []);

  const checkNotifications = async () => {
    const notifications = await getScheduledNotifications();
    setEnabled(notifications.length > 0);
  };

  const handleEnableReminder = async () => {
    if (!hasPermission) {
      const granted = await registerForPushNotificationsAsync();
      if (!granted) {
        Alert.alert('Ошибка', 'Необходимо разрешить уведомления в настройках');
        return;
      }
      setHasPermission(true);
    }

    try {
      await cancelAllReminders();
      await scheduleDailyReminder(
        selectedHour,
        0,
        'CloudMind 💜',
        'Как прошёл ваш день? Расскажите мне о своих мыслях.'
      );
      setEnabled(true);
      Alert.alert('Успех', `Напоминание установлено на ${selectedHour}:00`);
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось установить напоминание');
    }
  };

  const handleDisableReminder = async () => {
    try {
      await cancelAllReminders();
      setEnabled(false);
      Alert.alert('Успех', 'Напоминание отключено');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось отключить напоминание');
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={styles.blurView}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        </BlurView>

        <View style={styles.modalContainer}>
          <View style={[styles.modal, isDark && styles.modalDark]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={[styles.iconContainer, isDark && styles.iconContainerDark]}>
                  <Ionicons name="time" size={24} color={isDark ? '#818cf8' : '#6366f1'} />
                </View>
                <Text style={[styles.title, isDark && styles.titleDark, { fontWeight: '700', letterSpacing: -0.5 }]}>
                  Напоминания
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={isDark ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>

            {/* Description */}
            <Text style={[styles.description, isDark && styles.descriptionDark]}>
              Установите ежедневное напоминание для записи мыслей
            </Text>

            {/* Time Selector */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
                Время напоминания
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.hoursScroll}
                contentContainerStyle={styles.hoursContent}
              >
                {hours.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    onPress={() => setSelectedHour(hour)}
                    style={[
                      styles.hourButton,
                      selectedHour === hour && styles.hourButtonSelected,
                      isDark && styles.hourButtonDark,
                      selectedHour === hour && isDark && styles.hourButtonSelectedDark,
                    ]}
                  >
                    <Text
                      style={[
                        styles.hourText,
                        selectedHour === hour && styles.hourTextSelected,
                        isDark && styles.hourTextDark,
                        selectedHour === hour && isDark && styles.hourTextSelectedDark,
                      ]}
                    >
                      {hour.toString().padStart(2, '0')}:00
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              {enabled ? (
                <TouchableOpacity onPress={handleDisableReminder} style={styles.actionButton}>
                  <LinearGradient
                    colors={['#ef4444', '#dc2626']}
                    style={styles.actionGradient}
                  >
                    <Ionicons name="close-circle" size={20} color="#fff" />
                    <Text style={styles.actionText}>Отключить</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleEnableReminder} style={styles.actionButton}>
                  <LinearGradient
                    colors={['#3b82f6', '#8b5cf6']}
                    style={styles.actionGradient}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.actionText}>Включить</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    flex: 1,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalDark: {
    backgroundColor: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerDark: {
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  titleDark: {
    color: '#e2e8f0',
  },
  closeButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
    lineHeight: 20,
  },
  descriptionDark: {
    color: '#94a3b8',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
  },
  sectionTitleDark: {
    color: '#cbd5e1',
  },
  hoursScroll: {
    marginHorizontal: -24,
  },
  hoursContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  hourButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  hourButtonDark: {
    borderColor: '#334155',
    backgroundColor: '#0f172a',
  },
  hourButtonSelected: {
    borderColor: '#8b5cf6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  hourButtonSelectedDark: {
    borderColor: '#a78bfa',
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
  },
  hourText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  hourTextDark: {
    color: '#cbd5e1',
  },
  hourTextSelected: {
    color: '#8b5cf6',
  },
  hourTextSelectedDark: {
    color: '#a78bfa',
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
