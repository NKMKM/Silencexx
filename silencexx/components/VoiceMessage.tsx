import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Text,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Theme } from '@/constants/theme';

interface VoiceMessageProps {
  audioUrl: string;
  duration: number;
  isUser: boolean;
}

export function VoiceMessage({ audioUrl, duration, isUser }: VoiceMessageProps) {
  const isDark = true; // Force dark theme
  
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const loadAndPlaySound = async () => {
    try {
      setIsLoading(true);

      if (isPlaying && sound) {
        await sound.pauseAsync();
        setIsPlaying(false);
        return;
      }

      if (!sound) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        setSound(newSound);
        setIsPlaying(true);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setCurrentTime(status.positionMillis);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    }
  };

  const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  return (
    <Animated.View
      entering={FadeIn}
      style={[
        styles.container,
        {
          backgroundColor: isUser
            ? 'rgba(255, 107, 0, 0.2)'
            : Theme.background.card,
        },
      ]}
    >
      <TouchableOpacity
        onPress={loadAndPlaySound}
        disabled={isLoading}
        style={[
          styles.playButton,
          {
            backgroundColor: isUser
              ? Theme.accent.primary
              : 'rgba(148, 163, 184, 0.3)',
          },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={isUser ? '#fff' : Theme.text.secondary} />
        ) : (
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={16}
            color={isUser ? '#fff' : Theme.text.secondary}
          />
        )}
      </TouchableOpacity>

      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            {
              backgroundColor: isUser
                ? 'rgba(255, 107, 0, 0.3)'
                : 'rgba(148, 163, 184, 0.2)',
            },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress}%`,
                backgroundColor: isUser
                  ? Theme.accent.primary
                  : Theme.text.secondary,
              },
            ]}
          />
        </View>
      </View>

      <Text
        style={[
          styles.duration,
          {
            color: isUser
              ? Theme.text.secondary
              : Theme.text.secondary,
          },
        ]}
      >
        {formatTime(currentTime)} / {formatTime(duration)}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    maxWidth: '85%',
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  progressContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  progressBar: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  duration: {
    fontSize: 11,
    fontWeight: '500',
    minWidth: 45,
    textAlign: 'right',
  },
});
