import React, { useState, useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';

interface VoiceButtonProps {
  onRecordingStart: () => void;
  onRecordingStop: () => void;
  isRecording: boolean;
  isProcessing: boolean;
  recordingDuration: number;
  isDark: boolean;
}

export function VoiceButton({
  onRecordingStart,
  onRecordingStop,
  isRecording,
  isProcessing,
  recordingDuration,
  isDark,
}: VoiceButtonProps) {
  const scaleAnim = useSharedValue(1);
  const waveAnim = useSharedValue(0);
  
  const isRecordingRef = useRef(false);

  // Pulse wave animation when recording
  useEffect(() => {
    if (isRecording) {
      waveAnim.value = withRepeat(
        withTiming(1, { duration: 600 }),
        -1,
        true
      );
      isRecordingRef.current = true;
    } else {
      waveAnim.value = withTiming(0, { duration: 300 });
      isRecordingRef.current = false;
    }
  }, [isRecording, waveAnim]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const waveStyle = useAnimatedStyle(() => ({
    opacity: 1 - waveAnim.value,
    transform: [{ scale: 1 + waveAnim.value * 0.3 }],
  }));

  const handlePressIn = () => {
    console.log('[VoiceButton] Press in');
    scaleAnim.value = withSpring(0.9);
    onRecordingStart();
  };

  const handlePressOut = () => {
    console.log('[VoiceButton] Press out');
    scaleAnim.value = withSpring(1);
    onRecordingStop();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const formatted = `${mins}:${secs.toString().padStart(2, '0')}`;
    return formatted;
  };

  return (
    <View style={styles.container}>
      {/* Wave animation when recording */}
      {isRecording && (
        <Animated.View
          style={[
            styles.wavePulse,
            waveStyle,
            {
              borderColor: isDark ? '#dc2626' : '#ef4444',
            },
          ]}
        />
      )}

      {/* Voice button */}
      <Animated.View style={[animatedStyle]}>
        <TouchableOpacity
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isProcessing}
          activeOpacity={0.7}
          style={[
            styles.voiceButton,
            {
              backgroundColor: isRecording
                ? isDark
                  ? '#dc2626'
                  : '#ef4444'
                : isDark
                ? '#6366f1'
                : '#8b5cf6',
              opacity: isProcessing ? 0.6 : 1,
            },
          ]}
        >
          {isProcessing ? (
            <Ionicons
              name="hourglass"
              size={18}
              color="#fff"
            />
          ) : isRecording ? (
            <View
              style={[
                styles.recordingDot,
                { backgroundColor: '#fff' },
              ]}
            />
          ) : (
            <Ionicons name="mic" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Duration display during recording */}
      {isRecording && (
        <View style={styles.durationContainer}>
          <Text
            style={[
              styles.durationText,
              { color: isDark ? '#dc2626' : '#ef4444' },
            ]}
          >
            {formatDuration(recordingDuration)}
          </Text>
        </View>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <Text
          style={[
            styles.processingText,
            { color: isDark ? '#a78bfa' : '#8b5cf6' },
          ]}
        >
          Обработка...
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  voiceButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  wavePulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  durationContainer: {
    alignItems: 'center',
    gap: 2,
  },
  durationText: {
    fontSize: 13,
    fontWeight: '700',
  },
  processingText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
