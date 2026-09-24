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
import { Theme } from '@/constants/theme';
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
  const isDark = true;
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
        <BlurView intensity={20} tint="dark" style={styles.blurView}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        </BlurView>

        <View style={styles.modalContainer}>
          <View style={[styles.modal, styles.modalDark]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={[styles.iconContainer, styles.iconContainerDark]}>
                  <Ionicons name="time" size={24} color={Theme.accent.primary} />
                </View>
                <Text style={[styles.title, styles.titleDark, { fontWeight: '700', letterSpacing: -0.5 }]}>
                  Напоминания
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={Theme.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Description */}
            <Text style={[styles.description, styles.descriptionDark]}>
              Установите ежедневное напоминание для записи мыслей
            </Text>

            {/* Time Selector */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, styles.sectionTitleDark]}>
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
                      styles.hourButtonDark,
                      selectedHour === hour && styles.hourButtonSelectedDark,
                    ]}
                  >
                    <Text
                      style={[
                        styles.hourText,
                        selectedHour === hour && styles.hourTextSelected,
                        styles.hourTextDark,
                        selectedHour === hour && styles.hourTextSelectedDark,
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
                    colors={Theme.accent.gradient as unknown as [string, string]}
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
    backgroundColor: Theme.background.card,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: Theme.border.primary,
  },
  modalDark: {
    backgroundColor: Theme.background.card,
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
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerDark: {
    backgroundColor: 'rgba(255, 107, 0, 0.2)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.text.primary,
  },
  titleDark: {
    color: Theme.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    color: Theme.text.secondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  descriptionDark: {
    color: Theme.text.secondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.text.secondary,
    marginBottom: 12,
  },
  sectionTitleDark: {
    color: Theme.text.secondary,
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
    borderColor: Theme.border.primary,
    backgroundColor: Theme.background.secondary,
  },
  hourButtonDark: {
    borderColor: Theme.border.primary,
    backgroundColor: Theme.background.primary,
  },
  hourButtonSelected: {
    borderColor: Theme.accent.primary,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
  },
  hourButtonSelectedDark: {
    borderColor: Theme.accent.secondary,
    backgroundColor: 'rgba(255, 107, 0, 0.2)',
  },
  hourText: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.text.secondary,
  },
  hourTextDark: {
    color: Theme.text.secondary,
  },
  hourTextSelected: {
    color: Theme.accent.primary,
  },
  hourTextSelectedDark: {
    color: Theme.accent.secondary,
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
