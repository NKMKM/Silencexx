import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTheme } from '@/utils/ThemeContext';

interface ViewEntryModalProps {
  visible: boolean;
  onClose: () => void;
  entry: { id?: number; diary_date?: string; diary_content?: string } | null;
}

export function ViewEntryModal({ visible, onClose, entry }: ViewEntryModalProps) {
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';

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
            colors={isDark ? ['#0f172a', '#1e1b4b', '#16213e'] : ['#f8fafc', '#f1f5f9', '#e2e8f0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <View
              style={[
                styles.container,
                {
                  backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.92)',
                  borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.15)',
                },
              ]}
            >
              {/* Header */}
              <View
                style={[
                  styles.header,
                  {
                    borderBottomColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.12)',
                  },
                ]}
              >
                <View style={styles.headerContent}>
                  <View style={styles.moodContainer}>
                    <Text style={styles.moodEmoji}>{mood}</Text>
                  </View>
                  <Text style={[styles.title, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>Запись</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={26} color={isDark ? '#cbd5e1' : '#64748b'} />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
                <Text style={[styles.dateText, { color: isDark ? '#94a3b8' : '#475569' }]}>
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
                      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.5)',
                      borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
                    },
                  ]}
                >
                  <Text style={[styles.contentText, { color: isDark ? '#e2e8f0' : '#1e293b' }]}>
                    {text}
                  </Text>
                </View>
              </ScrollView>

              {/* Footer Button */}
              <View style={styles.footer}>
                <TouchableOpacity onPress={onClose} style={styles.closeButtonFooter}>
                  <LinearGradient
                    colors={isDark ? ['#6366f1', '#a855f7'] : ['#8b5cf6', '#ec4899']}
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
    borderRadius: 28,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  gradient: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  container: {
    padding: 24,
    borderWidth: 1.5,
    borderRadius: 28,
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
    borderRadius: 26,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
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
    borderWidth: 1.5,
    borderRadius: 18,
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
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
});
