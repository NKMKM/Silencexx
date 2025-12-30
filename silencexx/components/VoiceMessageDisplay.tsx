import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { voiceService } from '../services/VoiceService';

interface VoiceMessageDisplayProps {
  audioUri?: string;
  transcript?: string;
  isTranscribed?: boolean;
  language?: string;
  isUserMessage?: boolean;
  isDark?: boolean;
  timestamp?: Date;
  onDelete?: () => void;
}

export const VoiceMessageDisplay: React.FC<VoiceMessageDisplayProps> = ({
  audioUri,
  transcript,
  isTranscribed,
  language,
  isUserMessage = true,
  isDark = false,
  timestamp,
  onDelete,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const progressAnim = new Animated.Value(0);

  useEffect(() => {
    if (audioUri) {
      voiceService.getAudioDuration(audioUri).then(setDuration);
    }
  }, [audioUri]);

  // Обновляем прогресс во время воспроизведения
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && duration > 0) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 100;
          if (next >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const handlePlayPress = async () => {
    try {
      if (isPlaying) {
        await voiceService.stopPlayback();
        setIsPlaying(false);
        setCurrentTime(0);
      } else {
        if (!audioUri) return;
        setIsLoading(true);
        await voiceService.playAudio(audioUri);
        setIsPlaying(true);
        setCurrentTime(0);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('[VoiceMessageDisplay] Playback error:', error);
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Цветовая схема в зависимости от автора и темы
  // Для пользовательского сообщения - белый/светлый фон (контраст с синим градиентом)
  const userBubbleColor = '#3b82f6';
  const userBgColor = isDark
    ? 'rgba(255, 255, 255, 0.97)'
    : 'rgba(255, 255, 255, 1)';

  // Для AI сообщения - тёмный/контрастный фон
  const aiBubbleColor = isDark ? '#60a5fa' : '#3b82f6';
  const aiBgColor = isDark
    ? 'rgba(59, 130, 246, 0.12)'
    : 'rgba(59, 130, 246, 0.08)';

  const bubbleColor = isUserMessage ? userBubbleColor : aiBubbleColor;
  const bgColor = isUserMessage ? userBgColor : aiBgColor;
  const textColor = isUserMessage 
    ? '#1f2937'  // Тёмный текст на белом фоне пользователя
    : (isDark ? '#f0f0f0' : '#1f2937');  // Светлый на тёмном, тёмный на светлом для AI
  const mutedTextColor = isUserMessage 
    ? '#6b7280'  // Серый на белом
    : (isDark ? '#a0a0a0' : '#6b7280');

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Компактный плеер с прогресс-баром */}
      {audioUri && (
        <View style={styles.playerSection}>
          {/* Кнопка воспроизведения */}
          <TouchableOpacity
            onPress={handlePlayPress}
            style={styles.playButtonWrapper}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.playButton,
                { backgroundColor: bubbleColor, opacity: isLoading ? 0.6 : 1 },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size={20} />
              ) : isPlaying ? (
                <Ionicons name="pause" size={18} color="#fff" />
              ) : (
                <Ionicons name="play" size={18} color="#fff" />
              )}
            </View>
          </TouchableOpacity>

          {/* Прогресс-бар и время */}
          <View style={styles.progressSection}>
            <View style={[styles.progressBar, { backgroundColor: `${bubbleColor}20` }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: bubbleColor,
                    width: `${progressPercent}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.timeText, { color: mutedTextColor }]}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </Text>
          </View>

          {/* Кнопка удаления и язык */}
          <View style={styles.rightSection}>
            {!isTranscribed && (
              <View style={styles.processingBadge}>
                <ActivityIndicator color={bubbleColor} size={12} />
              </View>
            )}
            {language && (
              <Text
                style={[
                  styles.languageText,
                  { color: bubbleColor, opacity: 0.7 },
                ]}
              >
                {language.toUpperCase()}
              </Text>
            )}
            {onDelete && (
              <TouchableOpacity
                onPress={onDelete}
                style={styles.deleteButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={16} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Расширяемая транскрипция */}
      {transcript && (
        <TouchableOpacity
          onPress={() => setShowTranscript(!showTranscript)}
          style={styles.transcriptToggle}
          activeOpacity={0.6}
        >
          <View style={styles.transcriptHeader}>
            <Text style={[styles.transcriptLabel, { color: textColor }]}>
              📝 Транскрипция
            </Text>
            <Ionicons
              name={showTranscript ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={bubbleColor}
            />
          </View>

          {showTranscript && (
            <View style={styles.transcriptContent}>
              <Text
                style={[styles.transcriptText, { color: textColor }]}
                selectable
              >
                {transcript}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Время сообщения */}
      {timestamp && (
        <Text style={[styles.timestamp, { color: mutedTextColor }]}>
          {timestamp.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 14,
    marginVertical: 8,
    borderLeftWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // Плеер
  playerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },

  playButtonWrapper: {
    marginRight: 0,
  },

  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  progressSection: {
    flex: 1,
    justifyContent: 'center',
  },

  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 5,
  },

  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  timeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 0,
    gap: 8,
  },

  processingBadge: {
    padding: 3,
  },

  languageText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },

  deleteButton: {
    padding: 6,
  },

  // Транскрипция
  transcriptToggle: {
    marginTop: 10,
  },

  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 0,
  },

  transcriptLabel: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  transcriptContent: {
    paddingLeft: 14,
    paddingRight: 10,
    paddingTop: 6,
    paddingBottom: 8,
    borderLeftWidth: 2.5,
    borderLeftColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: 8,
  },

  transcriptText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
  },

  // Время
  timestamp: {
    fontSize: 10,
    marginTop: 8,
    textAlign: 'right',
    fontWeight: '500',
    opacity: 0.6,
  },
});
