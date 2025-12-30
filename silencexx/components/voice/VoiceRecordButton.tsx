/**
 * React Component для записи голосовых сообщений
 * silencexx/components/voice/VoiceRecordButton.tsx
 *
 * Кнопка для запуска/остановки записи с визуальными индикаторами
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { useVoiceRecording } from '../../hooks/useVoiceRecording';
import { AUDIO_FORMATS } from '../../types/voice';

interface VoiceRecordButtonProps {
  onRecordingComplete: (recordingUri: string, duration: number, size: number) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  maxDuration?: number; // milliseconds
}

/**
 * Компонент для записи голосовых сообщений
 */
export const VoiceRecordButton: React.FC<VoiceRecordButtonProps> = ({
  onRecordingComplete,
  onError,
  disabled = false,
  maxDuration = 5 * 60 * 1000, // 5 minutes default
}) => {
  const { startRecording, pauseRecording, resumeRecording, stopRecording, cancelRecording, duration, isRecording, isPaused, error, reset } =
    useVoiceRecording();

  const [isLongPressActive, setIsLongPressActive] = useState(false);
  const [showRecordingUI, setShowRecordingUI] = useState(false);
  const scaleAnim = new Animated.Value(1);

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
   * Запустить анимацию пульса
   */
  const startPulseAnimation = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim]);

  /**
   * Запустить запись
   */
  const handleStartRecording = useCallback(async () => {
    try {
      setShowRecordingUI(true);
      await startRecording({
        format: AUDIO_FORMATS.STANDARD,
        maxDuration,
      });
      startPulseAnimation();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start recording');
      onError?.(error);
      setShowRecordingUI(false);
    }
  }, [startRecording, maxDuration, onError, startPulseAnimation]);

  /**
   * Остановить запись и отправить
   */
  const handleStopRecording = useCallback(async () => {
    try {
      const result = await stopRecording();
      if (result) {
        setShowRecordingUI(false);
        reset();
        onRecordingComplete(result.uri, result.duration, result.size);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to stop recording');
      onError?.(error);
      setShowRecordingUI(false);
    }
  }, [stopRecording, reset, onRecordingComplete, onError]);

  /**
   * Отменить запись
   */
  const handleCancelRecording = useCallback(async () => {
    try {
      await cancelRecording();
      setShowRecordingUI(false);
      reset();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to cancel recording');
      onError?.(error);
    }
  }, [cancelRecording, reset, onError]);

  /**
   * Приостановить запись
   */
  const handlePauseRecording = useCallback(async () => {
    try {
      await pauseRecording();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to pause recording');
      onError?.(error);
    }
  }, [pauseRecording, onError]);

  /**
   * Возобновить запись
   */
  const handleResumeRecording = useCallback(async () => {
    try {
      await resumeRecording();
      startPulseAnimation();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to resume recording');
      onError?.(error);
    }
  }, [resumeRecording, onError, startPulseAnimation]);

  /**
   * Эффект для отслеживания ошибок
   */
  useEffect(() => {
    if (error) {
      onError?.(error);
      setShowRecordingUI(false);
    }
  }, [error, onError]);

  /**
   * Проверить, достигнут ли лимит времени
   */
  const isMaxDurationReached = duration >= maxDuration;

  if (!showRecordingUI) {
    return (
      <TouchableOpacity
        style={[styles.recordButton, disabled && styles.recordButtonDisabled]}
        onPress={handleStartRecording}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={styles.recordButtonIcon}>🎤</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.recordingContainer}>
      {/* Статус записи */}
      <View style={styles.recordingStatus}>
        <Animated.View
          style={[
            styles.recordingIndicator,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.recordingDot} />
        </Animated.View>
        <Text style={styles.recordingLabel}>
          {isRecording ? 'Recording...' : isPaused ? 'Paused' : 'Recording'}
        </Text>
      </View>

      {/* Время записи */}
      <View style={styles.timeDisplay}>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
        <Text style={styles.maxTimeText}> / {formatTime(maxDuration)}</Text>
        {isMaxDurationReached && <Text style={styles.warningText}> (Max reached)</Text>}
      </View>

      {/* Кнопки управления */}
      <View style={styles.controlButtons}>
        {/* Пауза/Возобновить */}
        {isRecording && (
          <TouchableOpacity style={styles.controlButton} onPress={handlePauseRecording}>
            <Text style={styles.controlButtonIcon}>⏸</Text>
          </TouchableOpacity>
        )}

        {isPaused && (
          <TouchableOpacity style={styles.controlButton} onPress={handleResumeRecording}>
            <Text style={styles.controlButtonIcon}>▶</Text>
          </TouchableOpacity>
        )}

        {/* Отправить */}
        <TouchableOpacity
          style={[styles.controlButton, styles.sendButton]}
          onPress={handleStopRecording}
          disabled={duration < 1000} // Минимум 1 секунда
        >
          <Text style={styles.controlButtonIcon}>✓</Text>
        </TouchableOpacity>

        {/* Отменить */}
        <TouchableOpacity
          style={[styles.controlButton, styles.cancelButton]}
          onPress={handleCancelRecording}
        >
          <Text style={styles.controlButtonIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Сообщение об ошибке */}
      {error && (
        <Text style={styles.errorText}>{error.message}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  recordButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  recordButtonDisabled: {
    backgroundColor: '#bdc3c7',
    opacity: 0.6,
  },
  recordButtonIcon: {
    fontSize: 24,
  },
  recordingContainer: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
    marginVertical: 8,
  },
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordingIndicator: {
    marginRight: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e74c3c',
  },
  recordingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  maxTimeText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  warningText: {
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    backgroundColor: '#27ae60',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  controlButtonIcon: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
