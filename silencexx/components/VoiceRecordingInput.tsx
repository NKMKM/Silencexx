import React, { useState, useRef, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/theme';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { VoiceWaveform } from './VoiceWaveform';

interface VoiceRecordingInputProps {
  // Voice recording props
  onRecordingStart: () => void;
  onTranscribe: () => void; // Расшифровать и вставить в текст
  onSendVoice: () => void; // Отправить голосовым
  isRecording: boolean;
  isProcessing: boolean;
  recordingDuration: number;
  audioLevel: number;
  isDark: boolean;
  
  // Text input props
  message: string;
  onMessageChange: (text: string) => void;
  onSendMessage: () => void;
  isLoading: boolean;
}

function VoiceRecordingInputComponent({
  onRecordingStart,
  onTranscribe,
  onSendVoice,
  isRecording,
  isProcessing,
  recordingDuration,
  audioLevel,
  isDark,
  message,
  onMessageChange,
  onSendMessage,
  isLoading,
}: VoiceRecordingInputProps) {
  const scaleAnim = useSharedValue(1);
  const inputRef = useRef<TextInput>(null);
  const hasText = message.trim().length > 0;

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const animatedMicStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const handleMicPress = () => {
    console.log('[VoiceRecordingInput] Mic pressed, isRecording:', isRecording, 'isProcessing:', isProcessing);
    if (isRecording || isProcessing) {
      console.log('[VoiceRecordingInput] Ignoring mic press - already recording or processing');
      return; // Игнорируем если уже записываем или обрабатываем
    }
    console.log('[VoiceRecordingInput] Starting recording...');
    scaleAnim.value = withSpring(0.9);
    setTimeout(() => {
      scaleAnim.value = withSpring(1);
    }, 150);
    onRecordingStart();
  };

  const handleTranscribePress = () => {
    if (!isRecording) {
      console.warn('[VoiceRecordingInput] Transcribe: Not recording, blocking call');
      return;
    }
    console.log('[VoiceRecordingInput] Transcribe button pressed - calling onTranscribe');
    onTranscribe();
  };

  const handleSendVoicePress = () => {
    if (!isRecording) {
      console.warn('[VoiceRecordingInput] Send voice: Not recording, blocking call');
      return;
    }
    console.log('[VoiceRecordingInput] Send voice button pressed - calling onSendVoice');
    onSendVoice();
  };

  const handleSendMessagePress = () => {
    if (!hasText) {
      console.warn('[VoiceRecordingInput] Send message: No text, blocking call');
      return;
    }
    console.log('[VoiceRecordingInput] Send message button pressed - calling onSendMessage');
    onSendMessage();
  };

  // Если идёт запись - показываем волны и кнопки
  if (isRecording) {
    console.log('[VoiceRecordingInput] Rendering recording UI');
    return (
      <View
        style={[
          styles.recordingContainer,
          {
            backgroundColor: isDark
              ? 'rgba(30, 41, 59, 0.95)'
              : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(226, 232, 240, 0.5)',
          },
        ]}
      >
        {/* Кнопка расшифровки (слева) */}
        <TouchableOpacity
          onPress={handleTranscribePress}
          disabled={isProcessing}
          style={[
            styles.actionButton,
            {
              backgroundColor: Theme.accent.primary,
              opacity: isProcessing ? 0.5 : 1,
            },
          ]}
        >
          <Ionicons name="text" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Waveform и таймер */}
        <View style={styles.waveformContainer}>
          <VoiceWaveform
            isRecording={isRecording}
            audioLevel={audioLevel}
            isDark={isDark}
          />
          <Text
            style={[
              styles.durationText,
              { color: isDark ? '#dc2626' : '#ef4444' },
            ]}
          >
            {formatDuration(recordingDuration)}
          </Text>
        </View>

        {/* Кнопка отправки голосовым (справа) */}
        <TouchableOpacity
          onPress={handleSendVoicePress}
          disabled={isProcessing}
          style={[
            styles.actionButton,
            {
              backgroundColor: isDark ? '#dc2626' : '#ef4444',
              opacity: isProcessing ? 0.5 : 1,
            },
          ]}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  // Обычный режим - текстовый инпут + кнопка микрофона
  console.log('[VoiceRecordingInput] Rendering normal UI, hasText:', hasText, 'messageLength:', message.length);
  
  return (
    <View
      style={[
        styles.inputContainer,
        {
          backgroundColor: isDark
            ? 'rgba(30, 41, 59, 0.95)'
            : 'rgba(255, 255, 255, 0.95)',
          borderColor: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(226, 232, 240, 0.5)',
        },
      ]}
    >
      {/* Текстовый инпут */}
      <TextInput
        ref={inputRef}
        value={message}
        onChangeText={onMessageChange}
        placeholder="Напиши сообщение..."
        placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
        multiline
        maxLength={1000}
        style={[
          styles.textInput,
          {
            color: isDark ? '#e2e8f0' : '#1e293b',
          },
        ]}
      />

      {/* Кнопка отправки текста или микрофон */}
      {hasText ? (
        <TouchableOpacity
          onPress={handleSendMessagePress}
          disabled={isLoading}
          style={[
            styles.sendButton,
            {
              backgroundColor: Theme.accent.primary,
              opacity: isLoading ? 0.5 : 1,
            },
          ]}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      ) : (
        <Animated.View style={animatedMicStyle}>
          <TouchableOpacity
            onPress={handleMicPress}
            disabled={isProcessing || isRecording}
            activeOpacity={0.7}
            style={[
              styles.micButton,
              {
                backgroundColor: Theme.accent.primary,
                opacity: (isProcessing || isRecording) ? 0.5 : 1,
              },
            ]}
          >
            <Ionicons name="mic" size={20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 100,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    minHeight: 64,
  },
  waveformContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
});

export const VoiceRecordingInput = React.memo(VoiceRecordingInputComponent, (prevProps, nextProps) => {
  // Custom comparison: only re-render if these change:
  return (
    prevProps.isRecording === nextProps.isRecording &&
    prevProps.isProcessing === nextProps.isProcessing &&
    prevProps.recordingDuration === nextProps.recordingDuration &&
    prevProps.audioLevel === nextProps.audioLevel &&
    prevProps.message === nextProps.message &&
    prevProps.isDark === nextProps.isDark &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.onRecordingStart === nextProps.onRecordingStart &&
    prevProps.onTranscribe === nextProps.onTranscribe &&
    prevProps.onSendVoice === nextProps.onSendVoice &&
    prevProps.onMessageChange === nextProps.onMessageChange &&
    prevProps.onSendMessage === nextProps.onSendMessage
  );
});

