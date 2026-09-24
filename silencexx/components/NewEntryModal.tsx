import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import { Theme } from '@/constants/theme';

interface NewEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (mood: string, text: string) => void;
}

const moods = [
  { id: 1, emoji: '😊', label: 'Отлично', color: ['#10b981', '#059669'] as const },
  { id: 2, emoji: '😌', label: 'Хорошо', color: ['#3b82f6', '#2563eb'] as const },
  { id: 3, emoji: '😐', label: 'Нормально', color: ['#f59e0b', '#d97706'] as const },
  { id: 4, emoji: '😔', label: 'Грустно', color: ['#A855F7', '#C084FC'] as const },
  { id: 5, emoji: '😰', label: 'Тревожно', color: ['#ef4444', '#dc2626'] as const },
];

export function NewEntryModal({ visible, onClose, onSave }: NewEntryModalProps) {
  const isDark = true; // Force dark theme
  const [selectedMood, setSelectedMood] = useState(moods[0]);
  const [entryText, setEntryText] = useState('');

  const handleSave = () => {
    if (entryText.trim()) {
      onSave(selectedMood.emoji, entryText);
      setEntryText('');
      setSelectedMood(moods[0]);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        >
          <Animated.View
            entering={SlideInUp.springify()}
            style={styles.modalContent}
          >
            <TouchableOpacity activeOpacity={1}>
              <LinearGradient
                colors={Theme.gradients.backgroundDeep as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientContainer}
              >
                <View
                  style={[
                    styles.blurContainer,
                    {
                      backgroundColor: Theme.glass.background,
                    },
                  ]}
                >
                  {/* Header */}
                  <View style={[styles.header, { borderBottomColor: Theme.glass.border }]}>
                    <View style={styles.headerLeft}>
                      <LinearGradient
                        colors={Theme.accent.gradient as any}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.headerIcon}
                      >
                        <Ionicons name="create-outline" size={22} color="#fff" />
                      </LinearGradient>
                      <Text style={[styles.headerTitle, { color: Theme.text.primary }]}>Новая запись</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                      <Ionicons name="close" size={24} color={Theme.text.secondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Mood Selection */}
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: Theme.text.primary }]}>Как вы себя чувствуете?</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.moodList}
                    >
                      {moods.map((mood) => (
                        <TouchableOpacity
                          key={mood.id}
                          onPress={() => setSelectedMood(mood)}
                          style={styles.moodItem}
                        >
                          <LinearGradient
                            colors={mood.color}
                            style={[
                              styles.moodButton,
                              selectedMood.id === mood.id && styles.moodButtonSelected,
                            ]}
                          >
                            <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                          </LinearGradient>
                          <Text
                            style={[
                              styles.moodLabel,
                              { color: Theme.text.secondary },
                              selectedMood.id === mood.id && { color: Theme.text.primary, fontWeight: '700' },
                            ]}
                          >
                            {mood.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Text Input */}
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: Theme.text.primary }]}>Что у вас на душе?</Text>
                    <TextInput
                      value={entryText}
                      onChangeText={setEntryText}
                      placeholder="Напишите о своих мыслях и чувствах..."
                      placeholderTextColor={Theme.text.muted}
                      multiline
                      maxLength={1000}
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: Theme.background.secondary,
                          borderColor: Theme.glass.border,
                          color: Theme.text.primary,
                        },
                      ]}
                    />
                    <Text style={[styles.charCount, { color: Theme.text.tertiary }]}>
                      {entryText.length} / 1000
                    </Text>
                  </View>

                  {/* Buttons */}
                  <View style={styles.buttonsContainer}>
                    <TouchableOpacity
                      onPress={onClose}
                      style={[
                        styles.cancelButton,
                        {
                          backgroundColor: Theme.glass.background,
                        },
                      ]}
                    >
                      <Text style={[styles.cancelButtonText, { color: Theme.accent.primary }]}>Отмена</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSave}
                      disabled={!entryText.trim()}
                    >
                      <LinearGradient
                        colors={
                          entryText.trim()
                            ? Theme.accent.gradient as any
                            : [Theme.text.tertiary, Theme.text.tertiary]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.saveButton}
                      >
                        <Ionicons name="checkmark" size={20} color="#fff" />
                        <Text style={styles.saveButtonText}>Сохранить</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '90%',
  },
  gradientContainer: {
    borderTopLeftRadius: Theme.radius.pill,
    borderTopRightRadius: Theme.radius.pill,
    overflow: 'hidden',
    paddingBottom: 20,
  },
  blurContainer: {
    borderTopLeftRadius: Theme.radius.pill,
    borderTopRightRadius: Theme.radius.pill,
    overflow: 'hidden',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: Theme.radius.organic,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.glow,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 4,
    borderRadius: 12,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  moodList: {
    gap: 16,
  },
  moodItem: {
    alignItems: 'center',
    gap: 8,
  },
  moodButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  moodButtonSelected: {
    transform: [{ scale: 1.15 }],
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  moodEmoji: {
    fontSize: 36,
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: Theme.radius.organic,
    padding: 16,
    fontSize: 15,
    minHeight: 150,
    maxHeight: 250,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
    fontWeight: '500',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: Theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.glass.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: Theme.radius.pill,
    ...Theme.shadows.glow,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
