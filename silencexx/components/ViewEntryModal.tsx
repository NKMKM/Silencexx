import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated from 'react-native-reanimated';

interface ViewEntryModalProps {
  visible: boolean;
  onClose: () => void;
  entry: { id?: number; diary_date?: string; diary_content?: string } | null;
}

export function ViewEntryModal({ visible, onClose, entry }: ViewEntryModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <Animated.View style={styles.modalContent}>
          <TouchableOpacity activeOpacity={1}>
            <BlurView intensity={90} tint="dark" style={styles.container}>
              <View style={styles.header}>
                <Text style={styles.title}>Запись</Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 40 }}>
                <Text style={styles.dateText}>{entry?.diary_date ? entry.diary_date.split('T')[0] : ''}</Text>
                <Text style={styles.contentText}>{entry?.diary_content || 'Пустая запись'}</Text>
              </ScrollView>
            </BlurView>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '80%',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f1f5f9',
  },
  body: {
    maxHeight: '100%'
  },
  dateText: {
    color: '#94a3b8',
    marginBottom: 12,
  },
  contentText: {
    color: '#e2e8f0',
    fontSize: 16,
    lineHeight: 22,
  },
});
