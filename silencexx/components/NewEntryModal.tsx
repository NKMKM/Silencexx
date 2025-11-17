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
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

interface NewEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (mood: string, text: string) => void;
}

const moods = [
  { id: 1, emoji: '😊', label: 'Отлично', color: ['#10b981', '#059669'] as const },
  { id: 2, emoji: '😌', label: 'Хорошо', color: ['#3b82f6', '#2563eb'] as const },
  { id: 3, emoji: '😐', label: 'Нормально', color: ['#f59e0b', '#d97706'] as const },
  { id: 4, emoji: '😔', label: 'Грустно', color: ['#8b5cf6', '#7c3aed'] as const },
  { id: 5, emoji: '😰', label: 'Тревожно', color: ['#ef4444', '#dc2626'] as const },
];

export function NewEntryModal({ visible, onClose, onSave }: NewEntryModalProps) {
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
            entering={FadeInDown.springify()}
            style={styles.modalContent}
          >
            <TouchableOpacity activeOpacity={1}>
              <BlurView intensity={95} tint="light" style={styles.blurContainer}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.headerLeft}>
                    <Ionicons name="create-outline" size={24} color="#8b5cf6" />
                    <Text style={styles.headerTitle}>Новая запись</Text>
                  </View>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {/* Mood Selection */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Как вы себя чувствуете?</Text>
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
                            selectedMood.id === mood.id && styles.moodLabelSelected,
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
                  <Text style={styles.sectionTitle}>Что у вас на душе?</Text>
                  <TextInput
                    value={entryText}
                    onChangeText={setEntryText}
                    placeholder="Напишите о своих мыслях и чувствах..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    maxLength={1000}
                    style={styles.textInput}
                  />
                  <Text style={styles.charCount}>{entryText.length} / 1000</Text>
                </View>

                {/* Buttons */}
                <View style={styles.buttonsContainer}>
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.cancelButton}
                  >
                    <Text style={styles.cancelButtonText}>Отмена</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSave}
                    disabled={!entryText.trim()}
                  >
                    <LinearGradient
                      colors={
                        entryText.trim()
                          ? ['#3b82f6', '#8b5cf6']
                          : ['#cbd5e1', '#94a3b8']
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
              </BlurView>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '90%',
  },
  blurContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.5)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 16,
  },
  moodList: {
    gap: 16,
  },
  moodItem: {
    alignItems: 'center',
    gap: 8,
  },
  moodButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  moodButtonSelected: {
    transform: [{ scale: 1.1 }],
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  moodEmoji: {
    fontSize: 32,
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  moodLabelSelected: {
    color: '#1e293b',
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.5)',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: '#1e293b',
    minHeight: 150,
    maxHeight: 250,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 8,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(226, 232, 240, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
