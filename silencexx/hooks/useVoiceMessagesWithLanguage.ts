import { useState, useRef, useCallback } from 'react';
import { voiceService, SupportedLanguage } from '../services/VoiceService';

interface VoiceMessageState {
  isRecording: boolean;
  isProcessing: boolean;
  recordingDuration: number;
  audioLevel: number;
  audioUri: string | null;
  transcript: string | null;
  language: SupportedLanguage;
  error: string | null;
}

export const useVoiceMessagesWithLanguage = () => {
  const [state, setState] = useState<VoiceMessageState>({
    isRecording: false,
    isProcessing: false,
    recordingDuration: 0,
    audioLevel: 0,
    audioUri: null,
    transcript: null,
    language: 'ru',
    error: null,
  });

  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async (language: SupportedLanguage = 'ru') => {
    try {
      console.log('[useVoiceMessagesWithLanguage] Starting recording in', language);
      setState((prev) => ({ ...prev, isRecording: true, error: null }));
      voiceService.setLanguage(language);
      startTimeRef.current = Date.now();

      const onAudioLevel = (level: number) => {
        setState((prev) => ({ ...prev, audioLevel: level }));
      };

      await voiceService.startRecording(onAudioLevel);

      // Запустить таймер длительности
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setState((prev) => ({ ...prev, recordingDuration: elapsed }));
      }, 100);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Recording error';
      console.error('[useVoiceMessagesWithLanguage] Recording error:', error);
      setState((prev) => ({
        ...prev,
        isRecording: false,
        error: errorMessage,
      }));
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      console.log('[useVoiceMessagesWithLanguage] Stopping recording');
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }

      const uri = await voiceService.stopRecording();
      setState((prev) => ({
        ...prev,
        isRecording: false,
        audioUri: uri,
        recordingDuration: 0,
      }));

      return uri;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Stop recording error';
      console.error('[useVoiceMessagesWithLanguage] Stop recording error:', error);
      setState((prev) => ({
        ...prev,
        isRecording: false,
        error: errorMessage,
      }));
      return null;
    }
  }, []);

  const processAudioToText = useCallback(
    async (audioUri: string | null): Promise<string | null> => {
      if (!audioUri) return null;

      try {
        console.log('[useVoiceMessagesWithLanguage] Processing audio to text');
        setState((prev) => ({ ...prev, isProcessing: true, error: null }));

        const result = await voiceService.transcribeAudio(audioUri, state.language);

        setState((prev) => ({
          ...prev,
          transcript: result.text,
          isProcessing: false,
        }));

        return result.text;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Transcription error';
        console.error('[useVoiceMessagesWithLanguage] Transcription error:', error);
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error: errorMessage,
        }));
        return null;
      }
    },
    [state.language]
  );

  const synthesizeSpeech = useCallback(
    async (text: string): Promise<string | null> => {
      try {
        console.log('[useVoiceMessagesWithLanguage] Synthesizing speech');
        const audioUri = await voiceService.synthesizeSpeech(text, state.language);
        return audioUri;
      } catch (error) {
        console.error('[useVoiceMessagesWithLanguage] TTS error:', error);
        return null;
      }
    },
    [state.language]
  );

  const setLanguage = useCallback((language: SupportedLanguage) => {
    setState((prev) => ({ ...prev, language }));
    voiceService.setLanguage(language);
  }, []);

  const clearState = useCallback(() => {
    setState({
      isRecording: false,
      isProcessing: false,
      recordingDuration: 0,
      audioLevel: 0,
      audioUri: null,
      transcript: null,
      language: 'ru',
      error: null,
    });
  }, []);

  const cleanup = useCallback(async () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    await voiceService.cleanup();
    clearState();
  }, [clearState]);

  return {
    ...state,
    startRecording,
    stopRecording,
    processAudioToText,
    synthesizeSpeech,
    setLanguage,
    cleanup,
    clearState,
  };
};
