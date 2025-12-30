import React from 'react';
import { View, StyleSheet } from 'react-native';

interface VoiceWaveformProps {
  isRecording: boolean;
  audioLevel?: number;
  isDark: boolean;
}

const BAR_COUNT = 20;
const MAX_HEIGHT = 40;
const MIN_HEIGHT = 4;

export function VoiceWaveform({ isRecording, audioLevel = 0, isDark }: VoiceWaveformProps) {
  const normalizedLevel = Math.min(100, Math.max(0, audioLevel)) / 100;

  return (
    <View style={styles.container}>
      {Array.from({ length: BAR_COUNT }).map((_, index) => {
        const randomFactor = 0.7 + Math.random() * 0.3;
        const targetHeight = MIN_HEIGHT + (MAX_HEIGHT - MIN_HEIGHT) * normalizedLevel * randomFactor;
        const barHeight = isRecording ? targetHeight : MIN_HEIGHT;

        return (
          <View
            key={index}
            style={[
              styles.bar,
              {
                height: barHeight,
                backgroundColor: isDark ? '#818cf8' : '#a855f7',
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: MAX_HEIGHT,
    gap: 3,
    paddingHorizontal: 8,
  },
  bar: {
    width: 3,
    borderRadius: 2,
    minHeight: MIN_HEIGHT,
  },
});
