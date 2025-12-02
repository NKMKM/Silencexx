declare module 'react-native-voice' {
  type SpeechResultsEvent = { value?: string[] };
  type SpeechErrorEvent = { error?: any };

  interface VoiceModule {
    start(locale?: string): Promise<void>;
    stop(): Promise<void>;
    destroy(): void;
    onSpeechResults?: (event: SpeechResultsEvent) => void;
    onSpeechEnd?: () => void;
    onSpeechError?: (event: SpeechErrorEvent) => void;
  }

  const Voice: VoiceModule;
  export default Voice;
}
