import { useState, useCallback, useRef, useEffect } from 'react';
import { voiceRecorder } from '@/services/VoiceRecorder';
import { speechRecognitionService } from '@/services/SpeechRecognition';
import { textToSpeechService } from '@/services/TextToSpeech';

export interface VoiceMessageState {
  isRecording: boolean;
  isProcessing: boolean;
  recordingDuration: number;
  audioLevel: number; // 0-100
  error: string | null;
}

export function useVoiceMessages() {
  const [state, setState] = useState<VoiceMessageState>({
    isRecording: false,
    isProcessing: false,
    recordingDuration: 0,
    audioLevel: 0,
    error: null,
  });

  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingTimeRef = useRef(0);

  // Clean up recording interval on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    console.log('[useVoiceMessages] startRecording called');
    try {
      recordingTimeRef.current = 0;
      setState((prev) => ({
        ...prev,
        isRecording: true,
        error: null,
        recordingDuration: 0,
        audioLevel: 0,
      }));

      // Start recording with audio level callback
      await voiceRecorder.startRecording((level) => {
        setState((prev) => ({
          ...prev,
          audioLevel: level,
        }));
      });

      // Update recording duration every 1 second with simple counter
      recordingIntervalRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setState((prev) => ({
          ...prev,
          recordingDuration: recordingTimeRef.current,
        }));
      }, 1000);
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Failed to start recording';
      console.error('[useVoiceMessages] Error starting recording:', error);
      setState((prev) => ({
        ...prev,
        isRecording: false,
        error: errorMsg,
      }));
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    console.log('[useVoiceMessages] stopRecording called');
    console.trace('[useVoiceMessages] stopRecording stack trace');
    try {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      recordingTimeRef.current = 0;

      const audioUri = await voiceRecorder.stopRecording();

      setState((prev) => ({
        ...prev,
        isRecording: false,
        recordingDuration: 0,
        audioLevel: 0,
      }));

      console.log('[useVoiceMessages] Recording stopped, URI:', audioUri);
      return audioUri;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Failed to stop recording';
      console.error('[useVoiceMessages] Error stopping recording:', error);
      setState((prev) => ({
        ...prev,
        isRecording: false,
        error: errorMsg,
      }));
      return null;
    }
  }, []);

  const processAudioToText = useCallback(
    async (audioUri: string): Promise<string | null> => {
      try {
        setState((prev) => ({
          ...prev,
          isProcessing: true,
          error: null,
        }));

        // Convert audio to base64
        const audioBase64 = await voiceRecorder.convertAudioToBase64(audioUri);

        // Recognize speech (Russian language)
        const result = await speechRecognitionService.recognizeAudio(
          audioBase64,
          'ru-RU'
        );

        if (!result.text) {
          throw new Error('Could not recognize speech');
        }

        setState((prev) => ({
          ...prev,
          isProcessing: false,
        }));

        console.log('[useVoiceMessages] Recognized text:', result.text);
        return result.text;
      } catch (error) {
        const errorMsg =
          error instanceof Error
            ? error.message
            : 'Failed to process audio';
        console.error('[useVoiceMessages] Error processing audio:', error);
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error: errorMsg,
        }));
        return null;
      }
    },
    []
  );

  const speakText = useCallback(
    async (text: string, language: string = 'en') => {
      try {
        setState((prev) => ({
          ...prev,
          error: null,
        }));

        await textToSpeechService.speak(text, {
          language,
          rate: 1.0,
          pitch: 1.0,
        });
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Failed to speak text';
        console.error('[useVoiceMessages] Error speaking text:', error);
        setState((prev) => ({
          ...prev,
          error: errorMsg,
        }));
      }
    },
    []
  );

  const stopSpeaking = useCallback(async () => {
    try {
      await textToSpeechService.stop();
    } catch (error) {
      console.error('[useVoiceMessages] Error stopping speech:', error);
    }
  }, []);

  const cleanup = useCallback(async () => {
    try {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      recordingTimeRef.current = 0;
      await voiceRecorder.cleanup();
      await textToSpeechService.stop();
    } catch (error) {
      console.error('[useVoiceMessages] Error during cleanup:', error);
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    processAudioToText,
    speakText,
    stopSpeaking,
    cleanup,
    clearError,
  };
}
