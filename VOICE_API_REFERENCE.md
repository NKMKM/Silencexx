# Voice Messaging System - API Reference & Index

Полный справочник по API всех компонентов системы голосовых сообщений.

## 📑 Содержание

- [Types & Interfaces](#types--interfaces)
- [Services](#services)
- [React Hooks](#react-hooks)
- [React Components](#react-components)
- [API Endpoints](#api-endpoints)
- [Constants](#constants)
- [Error Handling](#error-handling)

---

## Types & Interfaces

### Location: `silencexx/types/voice.ts`

#### RecordingStatus
```typescript
type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopped' | 'error';
```

#### PlaybackStatus
```typescript
type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';
```

#### AudioFormat
```typescript
interface AudioFormat {
  mimeType: 'audio/mp4' | 'audio/wav' | 'audio/mpeg';
  fileExtension: 'm4a' | 'wav' | 'mp3';
  sampleRate: number;        // Hz (44100, 32000, 16000)
  bitrate: number;           // kbps (128, 64, 32)
  channels: 1 | 2;           // Mono or Stereo
}
```

#### RecordingConfig
```typescript
interface RecordingConfig {
  format: AudioFormat;
  maxDuration: number;       // milliseconds
  onProgress?: (duration: number) => void;
  onError?: (error: Error) => void;
}
```

#### RecordingResult
```typescript
interface RecordingResult {
  uri: string;               // file path
  duration: number;          // milliseconds
  size: number;              // bytes
  mimeType: string;
  sampleRate: number;
  channels: number;
  bitrate: number;
}
```

#### VoiceMessage
```typescript
interface VoiceMessage {
  id?: string;
  userId: number;
  chatId: number;
  audioUri: string;          // local or remote URI
  duration: number;          // milliseconds
  size: number;              // bytes
  mimeType: string;
  transcript?: string;
  isTranscribed: boolean;
  createdAt: string;         // ISO 8601
  isLocal?: boolean;
  uploadProgress?: number;   // 0-100
}
```

#### VoiceMessageDisplayed (extends VoiceMessage)
```typescript
interface VoiceMessageDisplayed extends VoiceMessage {
  isPlaying?: boolean;
  isPaused?: boolean;
  currentTime?: number;
  sender: 'user' | 'ai';
}
```

#### PlaybackConfig
```typescript
interface PlaybackConfig {
  rate?: number;             // 0.5, 1, 1.5, 2
  progressUpdateInterval?: number;  // milliseconds
  onProgress?: (current: number, total: number) => void;
  onFinish?: () => void;
  onError?: (error: Error) => void;
}
```

#### RecordingState
```typescript
interface RecordingState {
  status: RecordingStatus;
  duration: number;
  isRecording: boolean;
  isPaused: boolean;
  error?: Error | null;
}
```

#### PlaybackState
```typescript
interface PlaybackState {
  status: PlaybackStatus;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  isPaused: boolean;
  progress: number;          // 0-1
  error?: Error | null;
}
```

---

## Services

### AudioRecordingManager

**Location**: `silencexx/services/audioRecording.ts`

#### Methods

```typescript
// Initialization
constructor()

// Lifecycle
async startRecording(config: RecordingConfig): Promise<void>
async pauseRecording(): Promise<void>
async resumeRecording(): Promise<void>
async stopRecording(): Promise<RecordingResult>
async cancelRecording(): Promise<void>

// State
getState(): RecordingState
getDuration(): number
getStatus(): RecordingStatus
isRecording(): boolean
isPaused(): boolean

// Cleanup
async destroy(): Promise<void>
```

#### Example
```typescript
import { getRecordingManager } from '@/services/audioRecording';

const manager = getRecordingManager();
await manager.startRecording({
  format: AUDIO_FORMATS.STANDARD,
  maxDuration: 5 * 60 * 1000,
  onProgress: (duration) => console.log(duration),
});
```

---

### AudioPlaybackManager

**Location**: `silencexx/services/audioPlayback.ts`

#### Methods

```typescript
// Lifecycle
async playAudio(uri: string, config?: PlaybackConfig): Promise<void>
async pause(): Promise<void>
async resume(): Promise<void>
async stop(): Promise<void>

// Control
async seekTo(timeMs: number): Promise<void>
async setRate(rate: number): Promise<void>
async setVolume(volume: number): Promise<void>

// State
getState(): PlaybackState
getCurrentTime(): number
getDuration(): number
getStatus(): PlaybackStatus
getProgress(): number         // 0-1
isPlaying(): boolean
isPaused(): boolean

// Cleanup
async destroy(): Promise<void>
```

#### Example
```typescript
import { getPlaybackManager } from '@/services/audioPlayback';

const playback = getPlaybackManager();
await playback.playAudio(audioUri, {
  rate: 1.0,
  onProgress: (current, total) => console.log(`${current}/${total}`),
});
```

---

### voiceApi

**Location**: `silencexx/services/api.ts`

#### Methods

```typescript
// Send
async sendVoiceMessage(
  chatId: number,
  audioUri: string,
  duration: number,
  size: number,
  mimeType: string,
  mood?: string,
  transcript?: string
): Promise<SendVoiceMessageResponse>

// Load
async getVoiceMessages(
  chatId: number,
  limit?: number,
  offset?: number
): Promise<LoadVoiceMessagesResponse>

// Download
async downloadVoiceMessage(messageId: string): Promise<Blob>

// Delete
async deleteVoiceMessage(messageId: string): Promise<DeleteResponse>

// Metadata
async getVoiceMessageMetadata(messageId: string): Promise<VoiceMessage>

// Transcribe
async transcribeVoiceMessage(messageId: string): Promise<TranscribeResponse>

// TTS
async synthesizeSpeech(
  text: string,
  language?: string
): Promise<SynthesizeResponse>
```

#### Example
```typescript
import { voiceApi } from '@/services/api';

const response = await voiceApi.sendVoiceMessage(
  chatId,
  audioUri,
  duration,
  size,
  'audio/mp4'
);

const messages = await voiceApi.getVoiceMessages(chatId, 50, 0);
```

---

## React Hooks

### useVoiceRecording

**Location**: `silencexx/hooks/useVoiceRecording.ts`

#### Return Values

```typescript
{
  // State
  status: RecordingStatus;
  duration: number;
  isRecording: boolean;
  isPaused: boolean;
  error: Error | null;

  // Functions
  startRecording: (config?: Partial<RecordingConfig>) => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  stopRecording: () => Promise<RecordingResult | null>;
  cancelRecording: () => Promise<void>;

  // Utils
  recordingState: RecordingState;
  reset: () => void;
}
```

#### Example
```typescript
import { useVoiceRecording } from '@/hooks/useVoiceRecording';

const {
  startRecording,
  stopRecording,
  duration,
  isRecording,
  error,
} = useVoiceRecording();

// Start recording
await startRecording();

// Get result
const result = await stopRecording();
// { uri: 'file://...', duration: 5000, size: 45000 }
```

---

### useVoicePlayback

**Location**: `silencexx/hooks/useVoicePlayback.ts`

#### Return Values

```typescript
{
  // State
  status: PlaybackStatus;
  currentTime: number;
  duration: number;
  progress: number;          // 0-1
  isPlaying: boolean;
  isPaused: boolean;
  error: Error | null;

  // Functions
  playAudio: (uri: string, config?: PlaybackConfig) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (timeMs: number) => Promise<void>;
  setRate: (rate: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;

  // Utils
  playbackState: PlaybackState;
  reset: () => void;
}
```

#### Example
```typescript
import { useVoicePlayback } from '@/hooks/useVoicePlayback';

const {
  playAudio,
  pause,
  resume,
  seekTo,
  currentTime,
  duration,
  progress,
} = useVoicePlayback();

// Play audio
await playAudio(audioUri);

// Control
await pause();
await resume();
await seekTo(2500);  // 2.5 seconds
```

---

### useVoiceMessageHistory

**Location**: `silencexx/hooks/useVoiceMessageHistory.ts`

#### Return Values

```typescript
{
  // State
  messages: VoiceMessageDisplayed[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;

  // Functions
  loadMessages: (chatId: number, limit?: number, offset?: number) => Promise<void>;
  sendMessage: (
    chatId: number,
    audioUri: string,
    duration: number,
    size: number,
    mimeType: string,
    mood?: string
  ) => Promise<VoiceMessage | null>;
  deleteMessage: (messageId: string) => Promise<void>;
  updateMessagePlaybackState: (messageId: string, isPlaying: boolean, currentTime?: number) => void;
  addLocalMessage: (message: VoiceMessage) => void;

  // Utils
  getTotalDuration: () => number;
  getCacheKey: (chatId: number) => string;
  clearCache: () => Promise<void>;
}
```

#### Example
```typescript
import { useVoiceMessageHistory } from '@/hooks/useVoiceMessageHistory';

const {
  messages,
  loadMessages,
  sendMessage,
  updateMessagePlaybackState,
} = useVoiceMessageHistory(userId);

// Load on chat enter
useEffect(() => {
  loadMessages(chatId);
}, [chatId]);

// Send voice message
await sendMessage(chatId, audioUri, duration, size, 'audio/mp4', mood);

// Update playback state
updateMessagePlaybackState(messageId, true, 0);
```

---

## React Components

### VoiceRecordButton

**Location**: `silencexx/components/voice/VoiceRecordButton.tsx`

#### Props

```typescript
interface VoiceRecordButtonProps {
  onRecordingComplete: (recordingUri: string, duration: number, size: number) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  maxDuration?: number;      // milliseconds, default: 5 * 60 * 1000
}
```

#### Usage

```typescript
import { VoiceRecordButton } from '@/components/voice/VoiceRecordButton';

<VoiceRecordButton
  onRecordingComplete={(uri, duration, size) => {
    // Send to server
  }}
  onError={(error) => {
    Alert.alert('Error', error.message);
  }}
  maxDuration={5 * 60 * 1000}
/>
```

#### Features

- 🎤 Red record button
- ⏱️ Recording timer
- ⏸️ Pause button
- ✅ Send button
- ❌ Cancel button
- 📊 Upload progress
- 🎯 Auto-stop at max duration

---

### VoiceMessageBubble

**Location**: `silencexx/components/voice/VoiceMessageBubble.tsx`

#### Props

```typescript
interface VoiceMessageBubbleProps {
  message: VoiceMessageDisplayed;
  isUserMessage: boolean;
  onPlaybackStart?: (messageId: string) => void;
  onPlaybackStop?: (messageId: string) => void;
}
```

#### Usage

```typescript
import { VoiceMessageBubble } from '@/components/voice/VoiceMessageBubble';

<VoiceMessageBubble
  message={voiceMessage}
  isUserMessage={message.sender === 'user'}
  onPlaybackStart={(messageId) => {
    updateMessagePlaybackState(messageId, true);
  }}
/>
```

#### Features

- ▶️ Play/Pause button
- 📊 Progress bar with seek
- ⏱️ Time display (MM:SS)
- 📈 Upload progress indicator
- 🎨 Different styles for user vs AI

---

## API Endpoints

### Backend Voice API

**Base URL**: `/api`

#### POST /voice-messages

Send a voice message.

```typescript
// Request
POST /api/voice-messages
Content-Type: multipart/form-data
Authorization: Bearer <token>

{
  chatId: number,
  duration: number,        // milliseconds
  size: number,            // bytes
  mimeType: string,        // 'audio/mp4'
  mood?: string,
  transcript?: string,
  audio: File
}

// Response
{
  success: boolean,
  message: VoiceMessage,
  error?: string
}
```

#### GET /voice-messages

Get messages from a chat.

```typescript
// Request
GET /api/voice-messages?chatId=1&limit=50&offset=0
Authorization: Bearer <token>

// Response
{
  success: boolean,
  messages: VoiceMessage[],
  total: number,
  error?: string
}
```

#### GET /voice-messages/:messageId

Download audio file.

```typescript
// Request
GET /api/voice-messages/1
Authorization: Bearer <token>

// Response
Audio file (blob)
```

#### DELETE /voice-messages/:messageId

Delete a message.

```typescript
// Request
DELETE /api/voice-messages/1
Authorization: Bearer <token>

// Response
{ success: boolean }
```

#### GET /voice-messages/:messageId/metadata

Get message metadata.

```typescript
// Request
GET /api/voice-messages/1/metadata
Authorization: Bearer <token>

// Response
{
  success: boolean,
  metadata: VoiceMessage
}
```

#### POST /voice-messages/:messageId/transcribe

Transcribe message (requires Whisper API or similar).

```typescript
// Request
POST /api/voice-messages/1/transcribe
Authorization: Bearer <token>

// Response
{
  success: boolean,
  transcript: string,
  cached: boolean
}
```

---

## Constants

### Location: `silencexx/types/voice.ts`

#### AUDIO_FORMATS

```typescript
export const AUDIO_FORMATS = {
  HIGH_QUALITY: {
    mimeType: 'audio/mp4',
    fileExtension: 'm4a',
    sampleRate: 44100,
    bitrate: 128,
    channels: 1,
  },
  STANDARD: {
    mimeType: 'audio/mp4',
    fileExtension: 'm4a',
    sampleRate: 32000,
    bitrate: 64,
    channels: 1,
  },
  LOW_QUALITY: {
    mimeType: 'audio/mp4',
    fileExtension: 'm4a',
    sampleRate: 16000,
    bitrate: 32,
    channels: 1,
  },
  WAV: {
    mimeType: 'audio/wav',
    fileExtension: 'wav',
    sampleRate: 44100,
    bitrate: 0,
    channels: 1,
  },
};
```

#### VOICE_CONSTRAINTS

```typescript
export const VOICE_CONSTRAINTS = {
  MAX_RECORDING_DURATION: 5 * 60 * 1000,       // 5 minutes
  MIN_RECORDING_DURATION: 1000,                // 1 second
  MAX_FILE_SIZE: 50 * 1024 * 1024,            // 50 MB
  MIN_FILE_SIZE: 1024,                         // 1 KB
  ALLOWED_MIME_TYPES: ['audio/mp4', 'audio/wav', 'audio/mpeg'],
  UPLOAD_CHUNK_SIZE: 1024 * 1024,             // 1 MB
  UPLOAD_TIMEOUT: 30000,                       // 30 seconds
  PLAYBACK_BUFFER_TIME: 500,                  // milliseconds
};
```

#### VOICE_MESSAGES_I18N

```typescript
export const VOICE_MESSAGES_I18N = {
  ru: {
    recordingStarted: 'Запись началась',
    recordingStopped: 'Запись остановлена',
    // ... 20+ messages
  },
  en: {
    recordingStarted: 'Recording started',
    recordingStopped: 'Recording stopped',
    // ... 20+ messages
  },
};
```

---

## Error Handling

### VoiceError

```typescript
class VoiceError extends Error {
  constructor(
    code: string,
    message: string,
    details?: any
  )
}
```

### Error Codes

```typescript
export const VOICE_ERROR_CODES = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RECORDING_FAILED: 'RECORDING_FAILED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FORMAT: 'INVALID_FORMAT',
  PLAYBACK_FAILED: 'PLAYBACK_FAILED',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  DEVICE_NOT_SUPPORTED: 'DEVICE_NOT_SUPPORTED',
  UNKNOWN: 'UNKNOWN',
};
```

### Error Handling Example

```typescript
try {
  await startRecording({ format: AUDIO_FORMATS.STANDARD });
} catch (err) {
  if (err instanceof VoiceError) {
    switch (err.code) {
      case VOICE_ERROR_CODES.PERMISSION_DENIED:
        Alert.alert('Permission', 'Grant microphone access');
        break;
      case VOICE_ERROR_CODES.FILE_TOO_LARGE:
        Alert.alert('Error', 'File exceeds 50MB limit');
        break;
      default:
        Alert.alert('Error', err.message);
    }
  }
}
```

---

**Version**: 1.0.0
**Status**: ✅ Complete Reference
**Last Updated**: 2024
