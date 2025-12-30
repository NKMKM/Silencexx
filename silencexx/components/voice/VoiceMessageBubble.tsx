/**
 * React Component для воспроизведения голосовых сообщений
 * silencexx/components/voice/VoiceMessageBubble.tsx
 *
 * Отображает голосовое сообщение с кнопками play/pause и прогресс-баром
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useVoicePlayback } from '../../hooks/useVoicePlayback';
import { VoiceMessageDisplayed } from '../../types/voice';

interface VoiceMessageBubbleProps {
  message: VoiceMessageDisplayed;
  isUserMessage: boolean;
  onPlaybackStart?: (messageId: string) => void;
  onPlaybackStop?: (messageId: string) => void;
}

/**
 * Компонент для отображения голосового сообщения
 */
export const VoiceMessageBubble: React.FC<VoiceMessageBubbleProps> = ({
  message,
  isUserMessage,
  onPlaybackStart,
  onPlaybackStop,
}) => {
  const { playAudio, pause, resume, stop, seekTo, currentTime, duration, isPlaying, isPaused, status } = useVoicePlayback();
  const [localIsPlaying, setLocalIsPlaying] = useState(false);

  /**
   * Форматировать время в MM:SS
   */
  const formatTime = (ms: number): string => {
    if (!ms || ms <= 0) return '0:00';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  /**
   * Получить прогресс (0-100)
   */
  const getProgress = (): number => {
    if (duration === 0) return 0;
    return Math.round((currentTime / duration) * 100);
  };

  /**
   * Обработать нажатие на кнопку play/pause
   */
  const handlePlayPause = useCallback(async () => {
    try {
      if (isPlaying) {
        await pause();
        setLocalIsPlaying(false);
      } else if (isPaused) {
        await resume();
        setLocalIsPlaying(true);
      } else {
        await playAudio(message.audioUri);
        setLocalIsPlaying(true);
        onPlaybackStart?.(message.id || '');
      }
    } catch (error) {
      console.error('Playback error:', error);
      setLocalIsPlaying(false);
    }
  }, [isPlaying, isPaused, message, playAudio, pause, resume, onPlaybackStart]);

  /**
   * Обработить нажатие на прогресс-бар для перемотки
   */
  const handleProgressPress = useCallback(
    (event: any) => {
      const { width } = event.nativeEvent.layout;
      const { locationX } = event.nativeEvent;
      const percentage = locationX / width;
      const newTime = percentage * duration;
      seekTo(newTime);
    },
    [duration, seekTo]
  );

  /**
   * Остановить воспроизведение при размонтировании
   */
  useEffect(() => {
    return () => {
      if (isPlaying) {
        stop().catch(error => console.warn('Error stopping playback:', error));
      }
    };
  }, [isPlaying, stop]);

  const bubbleStyle = isUserMessage ? styles.userBubble : styles.aiBubble;
  const textColor = isUserMessage ? 'white' : '#333';
  const progress = getProgress();
  const displayTime = currentTime > 0 ? currentTime : message.duration;
  const displayDuration = message.duration;

  return (
    <View style={[styles.container, bubbleStyle]}>
      {/* Кнопка play/pause */}
      <TouchableOpacity
        style={styles.playButton}
        onPress={handlePlayPause}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : isPlaying ? (
          <Text style={[styles.buttonText, { color: textColor }]}>⏸</Text>
        ) : (
          <Text style={[styles.buttonText, { color: textColor }]}>▶</Text>
        )}
      </TouchableOpacity>

      {/* Информация о сообщении */}
      <View style={styles.messageInfo}>
        {/* Прогресс-бар */}
        <TouchableOpacity
          style={styles.progressContainer}
          onLayout={(event) => {
            // Слушатель для позволения кликать по баруцах
          }}
          onPress={handleProgressPress}
          disabled={duration === 0}
        >
          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                  backgroundColor: isUserMessage ? '#ffffff' : '#4a90e2',
                },
              ]}
            />
          </View>
        </TouchableOpacity>

        {/* Время */}
        <Text style={[styles.timeText, { color: textColor }]}>
          {formatTime(displayTime)} / {formatTime(displayDuration)}
        </Text>
      </View>

      {/* Метаданные */}
      {message.uploadProgress !== undefined && message.uploadProgress < 100 && (
        <Text style={[styles.uploadText, { color: textColor }]}>
          {message.uploadProgress}%
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginVertical: 4,
    maxWidth: '85%',
  },
  userBubble: {
    backgroundColor: '#4a90e2',
    alignSelf: 'flex-end',
    marginRight: 8,
  },
  aiBubble: {
    backgroundColor: '#e8e8e8',
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  messageInfo: {
    flex: 1,
  },
  progressContainer: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  uploadText: {
    fontSize: 10,
    marginLeft: 8,
  },
});
