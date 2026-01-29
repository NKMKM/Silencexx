import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

interface AudioPlayerProps {
  audioUri: string;
  isDark: boolean;
}

export function AudioPlayer({ audioUri, isDark }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const scaleAnim = useSharedValue(1);

  useEffect(() => {
    // Get duration of audio using Expo AV
    const getDuration = async () => {
      try {
        console.log('[AudioPlayer] Loading audio duration for:', audioUri);
        
        // Set audio mode for playback
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        
        // Create sound object to get duration
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: false, volume: 1.0 },
          (status) => {
            if (status.isLoaded) {
              const durationSeconds = Math.floor((status.durationMillis || 0) / 1000);
              setDuration(durationSeconds);
              
              // Update current time during playback
              if (status.isPlaying) {
                const currentSeconds = Math.floor((status.positionMillis || 0) / 1000);
                setCurrentTime(currentSeconds);
              }
              
              // Auto-stop when finished
              if (status.didJustFinish) {
                console.log('[AudioPlayer] Playback finished');
                setIsPlaying(false);
                setCurrentTime(0);
                newSound.setPositionAsync(0);
              }
              
              console.log('[AudioPlayer] Audio duration:', durationSeconds, 'seconds');
            }
          }
        );
        
        // Store sound for playback
        setSound(newSound);
        
      } catch (error) {
        console.error('[AudioPlayer] Error getting duration:', error);
        setDuration(0);
      }
    };

    getDuration();
    
    // Cleanup
    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => {});
      }
    };
  }, [audioUri]);

  const handlePlayPress = async () => {
    if (!sound) {
      console.log('[AudioPlayer] Sound not loaded yet');
      return;
    }
    
    try {
      if (isPlaying) {
        // Stop playing
        console.log('[AudioPlayer] Stopping playback');
        await sound.pauseAsync();
        await sound.setPositionAsync(0);
        setIsPlaying(false);
        setCurrentTime(0);
      } else {
        // Ensure audio mode is set for playback
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        
        // Play audio
        console.log('[AudioPlayer] Starting playback');
        scaleAnim.value = withTiming(0.95, { duration: 100 });
        setIsPlaying(true);
        
        // Set volume to maximum
        await sound.setVolumeAsync(1.0);
        await sound.playAsync();
        
        scaleAnim.value = withTiming(1, { duration: 100 });
      }
    } catch (error) {
      console.error('[AudioPlayer] Error during playback:', error);
      setIsPlaying(false);
      scaleAnim.value = withTiming(1, { duration: 100 });
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.6)',
          borderColor: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(200, 213, 230, 0.3)',
        },
      ]}
    >
      {/* Play button */}
      <Animated.View style={[animatedStyle]}>
        <TouchableOpacity
          onPress={handlePlayPress}
          style={[
            styles.playButton,
            {
              backgroundColor: isDark ? '#4f46e5' : '#6366f1',
            },
          ]}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={16}
            color="#fff"
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Waveform or duration display */}
      <View style={styles.timeInfo}>
        <Text
          style={[
            styles.timeText,
            { color: isDark ? '#cbd5e1' : '#64748b' },
          ]}
        >
          {isPlaying ? formatTime(currentTime) : formatTime(duration)}
        </Text>
      </View>

      {/* Waveform bars (decorative) */}
      <View style={styles.waveform}>
        {[...Array(6)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.waveformBar,
              {
                backgroundColor: isDark ? '#a78bfa' : '#8b5cf6',
                height: `${40 + Math.random() * 40}%`,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    minHeight: 44,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  timeInfo: {
    minWidth: 40,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  waveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    height: 30,
  },
  waveformBar: {
    width: 2,
    borderRadius: 2,
  },
});
