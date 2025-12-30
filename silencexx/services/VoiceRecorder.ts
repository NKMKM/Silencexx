import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export class VoiceRecorder {
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
  private meteringInterval: ReturnType<typeof setInterval> | null = null;
  private audioLevelCallback: ((level: number) => void) | null = null;

  async startRecording(onAudioLevel?: (level: number) => void): Promise<void> {
    try {
      console.log('[VoiceRecorder] Starting recording...');
      
      // Request permissions
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Microphone permission denied');
      }
      console.log('[VoiceRecorder] Permissions granted');

      this.audioLevelCallback = onAudioLevel || null;

      // Setup audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });
      console.log('[VoiceRecorder] Audio mode configured');

      // Create and start recording
      this.recording = new Audio.Recording();
      console.log('[VoiceRecorder] Recording object created, preparing...');
      
      // Use WAV format for better compatibility with Speech API
      await this.recording.prepareToRecordAsync({
        isMeteringEnabled: true,
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
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
      console.log('[VoiceRecorder] Recording prepared, starting...');
      
      console.log('[VoiceRecorder] Before startAsync - this.recording:', !!this.recording);
      try {
        const startResult = await this.recording.startAsync();
        console.log('[VoiceRecorder] startAsync() completed, result:', startResult);
      } catch (startAsyncError) {
        console.error('[VoiceRecorder] startAsync() threw error:', startAsyncError);
        throw startAsyncError;
      }
      console.log('[VoiceRecorder] After startAsync - this.recording:', !!this.recording);

      // Double-check recording object still exists
      if (!this.recording) {
        console.error('[VoiceRecorder] CRITICAL: this.recording is null after startAsync!');
        throw new Error('Recording object was nullified after startAsync');
      }

      // Verify the recording is actually recording
      const statusAfterStart = await this.recording.getStatusAsync();
      console.log('[VoiceRecorder] Status immediately after start:', {
        isRecording: statusAfterStart.isRecording,
        isDoneRecording: statusAfterStart.isDoneRecording,
        durationMillis: statusAfterStart.durationMillis,
      });

      console.log('[VoiceRecorder] Recording started successfully');

      // Start metering (audio level monitoring)
      this.startMetering();
    } catch (error) {
      console.error('[VoiceRecorder] Error starting recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<string | null> {
    try {
      console.log('[VoiceRecorder] stopRecording() called');
      console.log('[VoiceRecorder] this.recording is:', !!this.recording);
      console.trace('[VoiceRecorder] stopRecording() stack trace'); // TRACE to see who calls this
      
      if (!this.recording) {
        console.warn('[VoiceRecorder] No active recording to stop (this.recording is null/false)');
        return null;
      }

      // Check recording status before stopping
      console.log('[VoiceRecorder] Checking recording status before stop...');
      const statusBefore = await this.recording.getStatusAsync();
      console.log('[VoiceRecorder] Status BEFORE stop:', {
        isRecording: statusBefore.isRecording,
        isDoneRecording: statusBefore.isDoneRecording,
        durationMillis: statusBefore.durationMillis,
        canRecord: statusBefore.canRecord,
      });

      if (!statusBefore.isRecording) {
        console.warn('[VoiceRecorder] Recording status shows isRecording=false, but continuing anyway');
      }

      console.log('[VoiceRecorder] Stopping metering...');
      this.stopMetering();
      
      console.log('[VoiceRecorder] Calling stopAndUnloadAsync()...');
      try {
        await this.recording.stopAndUnloadAsync();
        console.log('[VoiceRecorder] stopAndUnloadAsync() completed successfully');
      } catch (stopError) {
        console.error('[VoiceRecorder] Error in stopAndUnloadAsync():', stopError);
        throw stopError;
      }

      console.log('[VoiceRecorder] Getting recording URI...');
      const uri = this.recording.getURI();
      console.log('[VoiceRecorder] Recording URI:', uri);

      if (!uri) {
        console.warn('[VoiceRecorder] Failed to get recording URI after stop');
        this.recording = null;
        return null;
      }

      console.log('[VoiceRecorder] Recording stopped successfully');
      console.log('[VoiceRecorder] Clearing recording reference and callback');
      this.recording = null;
      this.audioLevelCallback = null;

      return uri;
    } catch (error) {
      console.error('[VoiceRecorder] FATAL ERROR in stopRecording():', error);
      this.recording = null;
      return null;
    }
  }

  async cleanup(): Promise<void> {
    try {
      console.log('[VoiceRecorder] cleanup() called, this.recording:', !!this.recording);
      console.trace('[VoiceRecorder] cleanup() stack trace'); // TRACE to see who calls this
      if (this.recording) {
        console.log('[VoiceRecorder] Stopping recording in cleanup...');
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }
      if (this.sound) {
        console.log('[VoiceRecorder] Unloading sound in cleanup...');
        await this.sound.unloadAsync();
        this.sound = null;
      }
      console.log('[VoiceRecorder] cleanup() completed');
    } catch (error) {
      console.error('[VoiceRecorder] Error cleaning up:', error);
    }
  }

  async isRecording(): Promise<boolean> {
    console.log('[VoiceRecorder] isRecording() called, this.recording:', !!this.recording);
    if (!this.recording) {
      console.log('[VoiceRecorder] No recording object');
      return false;
    }
    const status = await this.recording.getStatusAsync();
    console.log('[VoiceRecorder] Recording status:', status.isRecording);
    return status.isRecording;
  }

  async playAudio(uri: string): Promise<void> {
    try {
      // Unload previous sound if exists
      if (this.sound) {
        await this.sound.unloadAsync();
      }

      // Load and play new sound
      this.sound = new Audio.Sound();
      await this.sound.loadAsync({ uri });
      await this.sound.playAsync();
      console.log('[VoiceRecorder] Playing audio from:', uri);
    } catch (error) {
      console.error('[VoiceRecorder] Error playing audio:', error);
      throw error;
    }
  }

  async getAudioDuration(uri: string): Promise<number> {
    try {
      const sound = new Audio.Sound();
      await sound.loadAsync({ uri });
      const status = await sound.getStatusAsync();
      const duration = 'durationMillis' in status ? (status.durationMillis || 0) : 0;
      await sound.unloadAsync();
      return duration;
    } catch (error) {
      console.error('[VoiceRecorder] Error getting audio duration:', error);
      return 0;
    }
  }

  async getRecordingDuration(): Promise<number> {
    try {
      if (!this.recording) {
        return 0;
      }
      const status = await this.recording.getStatusAsync();
      return status.durationMillis || 0;
    } catch (error) {
      console.error('[VoiceRecorder] Error getting duration:', error);
      return 0;
    }
  }

  // Convert audio file to base64 for API transmission
  async convertAudioToBase64(uri: string): Promise<string> {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (error) {
      console.error('[VoiceRecorder] Error converting audio to base64:', error);
      throw error;
    }
  }

  // Start monitoring audio levels during recording
  private startMetering(): void {
    console.log('[VoiceRecorder] startMetering() called');
    if (this.meteringInterval) {
      clearInterval(this.meteringInterval);
    }

    this.meteringInterval = setInterval(async () => {
      if (!this.recording || !this.audioLevelCallback) {
        return;
      }

      try {
        const status = await this.recording.getStatusAsync();
        if (status.isRecording && status.metering !== undefined) {
          // metering is typically in range -160 to 0 dB
          // Normalize to 0-100 scale
          const normalized = Math.max(0, Math.min(100, (status.metering + 160) / 1.6));
          this.audioLevelCallback(normalized);
        }
      } catch (error) {
        console.error('[VoiceRecorder] Error getting metering:', error);
      }
    }, 100); // Update every 100ms
  }

  // Stop monitoring audio levels
  private stopMetering(): void {
    console.log('[VoiceRecorder] stopMetering() called, meteringInterval exists:', !!this.meteringInterval);
    if (this.meteringInterval) {
      clearInterval(this.meteringInterval);
      this.meteringInterval = null;
      console.log('[VoiceRecorder] Metering interval cleared');
    }
  }
}

export const voiceRecorder = new VoiceRecorder();
