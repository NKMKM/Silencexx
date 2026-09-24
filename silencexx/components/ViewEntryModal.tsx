import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Theme } from '@/constants/theme';

interface ViewEntryModalProps {
  visible: boolean;
  onClose: () => void;
  entry: { id?: number; diary_date?: string; diary_content?: string } | null;
}

export function ViewEntryModal({ visible, onClose, entry }: ViewEntryModalProps) {
  const isDark = true; // Force dark theme

  // Parse mood emoji and text from diary_content
  const parseContent = (content: string | undefined) => {
    if (!content) return { mood: '📝', text: 'Пустая запись' };
    const moodMatch = content.match(/^(.)/);
    const mood = moodMatch ? moodMatch[1] : '📝';
    const text = content.replace(/^.\s*/, '').trim() || 'Пустая запись';
    return { mood, text };
  };

  const { mood, text } = parseContent(entry?.diary_content);

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdropContainer}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.dimOverlay}
        />
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <Animated.View
          entering={FadeIn.duration(250)}
          exiting={FadeOut.duration(200)}
          style={styles.modalContent}
        >
          <LinearGradient
            colors={Theme.gradients.backgroundDeep as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <View
              style={[
                styles.container,
                {
                  backgroundColor: Theme.glass.background,
                  borderColor: Theme.glass.border,
                },
              ]}
            >
              {/* Header */}
              <View
                style={[
                  styles.header,
                  {
                    borderBottomColor: Theme.glass.border,
                  },
                ]}
              >
                <View style={styles.headerContent}>
                  <View style={[styles.moodContainer, { backgroundColor: Theme.glass.backgroundLight }]}>
                    <Text style={styles.moodEmoji}>{mood}</Text>
                  </View>
                  <Text style={[styles.title, { color: Theme.text.primary }]}>Запись</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={26} color={Theme.text.secondary} />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
                <Text style={[styles.dateText, { color: Theme.text.secondary }]}>
                  {entry?.diary_date ? new Date(entry.diary_date).toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }) : ''}
                </Text>

                <View
                  style={[
                    styles.contentCard,
                    {
                      backgroundColor: Theme.background.secondary,
                      borderColor: Theme.glass.border,
                    },
                  ]}
                >
                  <Text style={[styles.contentText, { color: Theme.text.primary }]}>
                    {text}
                  </Text>
                </View>
              </ScrollView>

              {/* Footer Button */}
              <View style={styles.footer}>
                <TouchableOpacity onPress={onClose} style={styles.closeButtonFooter}>
                  <LinearGradient
                    colors={Theme.accent.gradient as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.closeGradient}
                  >
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.closeButtonText}>Готово</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  modalContent: {
    width: '88%',
    maxWidth: 440,
    borderRadius: Theme.radius.pill,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  gradient: {
    borderRadius: Theme.radius.pill,
    overflow: 'hidden',
  },
  container: {
    padding: 24,
    borderWidth: 1,
    borderRadius: Theme.radius.pill,
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  moodContainer: {
    width: 52,
    height: 52,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.glass.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmoji: {
    fontSize: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 6,
    borderRadius: 12,
  },
  body: {
    maxHeight: '100%',
  },
  bodyContent: {
    paddingBottom: 16,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: 0.2,
    textTransform: 'capitalize',
  },
  contentCard: {
    borderWidth: 1,
    borderRadius: Theme.radius.lg,
    padding: 16,
    marginBottom: 12,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
  },
  closeButtonFooter: {
    width: '100%',
  },
  closeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: Theme.radius.pill,
    ...Theme.shadow.glow,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
});
