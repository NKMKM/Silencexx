import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Text,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Theme } from '@/constants/theme';

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string, duration: number) => Promise<void>;
  disabled?: boolean;
}

export function VoiceRecorder({ onRecordingComplete, disabled = false }: VoiceRecorderProps) {
  const isDark = true; // Force dark theme
  
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingDurationRef = useRef(0);

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      
      if (permission.status !== 'granted') {
        Alert.alert('Permission Denied', 'Microphone access is required to record voice messages.');
        return;
      }

      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      // Create recording
      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      setRecording(recording);
      setIsRecording(true);
      recordingDurationRef.current = 0;

      recordingIntervalRef.current = setInterval(() => {
        recordingDurationRef.current += 1;
        setRecordingTime(recordingDurationRef.current);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Recording Error', 'Could not start recording.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsProcessing(true);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (uri) {
        // Call completion callback
        await onRecordingComplete(uri, recordingDurationRef.current);
      }

      setRecording(null);
      setIsRecording(false);
      setRecordingTime(0);
      recordingDurationRef.current = 0;
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Could not stop recording.');
    } finally {
      setIsProcessing(false);
    }
  };

  const cancelRecording = async () => {
    if (!recording) return;

    try {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      await recording.stopAndUnloadAsync();
      setRecording(null);
      setIsRecording(false);
      setRecordingTime(0);
      recordingDurationRef.current = 0;
    } catch (error) {
      console.error('Error canceling recording:', error);
    }
  };

  if (isRecording) {
    return (
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        style={[
          styles.recordingContainer,
          {
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
            borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)',
          },
        ]}
      >
        <View style={styles.recordingContent}>
          <Animated.View
            style={[
              styles.recordingPulse,
              {
                backgroundColor: '#ef4444',
              },
            ]}
          />
          <Text
            style={[
              styles.recordingTime,
              { color: isDark ? '#fca5a5' : '#f87171' },
            ]}
          >
            Recording: {formatTime(recordingTime)}
          </Text>
        </View>

        <View style={styles.recordingControls}>
          <TouchableOpacity
            onPress={cancelRecording}
            style={[
              styles.recordingButton,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
            ]}
          >
            <Ionicons name="close" size={20} color={isDark ? '#f1f5f9' : '#1e293b'} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={stopRecording}
            disabled={isProcessing}
            style={[
              styles.recordingButton,
              { backgroundColor: '#ef4444' },
            ]}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  return (
    <TouchableOpacity
      onPress={startRecording}
      disabled={disabled}
      style={[
        styles.micButton,
        {
          backgroundColor: disabled
            ? 'rgba(255, 107, 0, 0.05)'
            : 'rgba(255, 107, 0, 0.15)',
          borderColor: disabled
            ? 'rgba(255, 107, 0, 0.1)'
            : 'rgba(255, 107, 0, 0.3)',
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Ionicons
        name="mic"
        size={22}
        color={disabled ? Theme.text.tertiary : Theme.accent.primary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginHorizontal: 12,
  },
  recordingContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordingTime: {
    fontSize: 14,
    fontWeight: '500',
  },
  recordingControls: {
    flexDirection: 'row',
    gap: 8,
  },
  recordingButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
