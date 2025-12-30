# Реализация голосовых сообщений для Expo/React Native

Полная система для записи, отправки, хранения и воспроизведения голосовых сообщений в приложении CloudMind.

## 📋 Содержание

1. [Требования](#требования)
2. [Архитектура](#архитектура)
3. [Компоненты системы](#компоненты-системы)
4. [Использование](#использование)
5. [API интеграция](#api-интеграция)
6. [Ошибки и обработка](#ошибки-и-обработка)
7. [Безопасность и изоляция](#безопасность-и-изоляция)
8. [Тестирование](#тестирование)
9. [Развертывание](#развертывание)

## 🎯 Требования

### 7.1 Запись аудио (Audio Recording)
- ✅ Стабильная реализация записи с использованием `expo-av`
- ✅ Обработка разрешений на запись микрофона (iOS/Android)
- ✅ Поддержка pause/resume/cancel операций
- ✅ Правильная очистка ресурсов
- ✅ Отслеживание длительности в реальном времени

### 7.2 Формат и качество (Format & Quality)
- ✅ Явное указание формата файла (MP4/WAV)
- ✅ Конфигурируемая sample rate (44100/32000/16000 Hz)
- ✅ Конфигурируемый bitrate (128/64/32 kbps)
- ✅ Единообразный формат на iOS/Android

### 7.3 Отправка голосовых сообщений (Voice Message Sending)
- ✅ Привязка к userId + chatId
- ✅ Тип сообщения: `type: "voice"`
- ✅ Метаданные: duration, size, mimeType
- ✅ Защита от cross-chat contamination

### 7.4 Обработка аудио (Audio Processing)
- ✅ Отсутствие потери или корруптации данных
- ✅ Предотвращение дублирующихся отправок
- ✅ Обработка ошибок сети
- ✅ Безопасный retry механизм

### 7.5 Воспроизведение (Playback)
- ✅ Правильное воспроизведение аудио
- ✅ Управление: play/pause/stop
- ✅ Единственное воспроизведение одновременно
- ✅ Очистка ресурсов при размонтировании

### 7.6 Синхронизация с чатом (Chat Synchronization)
- ✅ Голосовые сообщения в единой истории
- ✅ Правильная сортировка по timestamp
- ✅ Отсутствие дублирования при перезагрузке
- ✅ Правильная загрузка голосовых ассетов

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    React Components                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐│
│  │ VoiceRecordBtn   │  │ VoiceMessageBbl  │  │ChatScreen ││
│  └────────┬─────────┘  └────────┬─────────┘  └─────┬─────┘│
└───────────┼────────────────────┼──────────────────┼───────┘
            │                    │                  │
┌───────────┼────────────────────┼──────────────────┼───────────┐
│           │    React Hooks     │                  │           │
│  ┌────────▼──────────────────▼─────────────────▼────────┐  │
│  │ useVoiceRecording │ useVoicePlayback │ useVoiceMsg  │  │
│  │ (recording state) │ (playback state) │ (history)   │  │
│  └────────┬──────────────────┬─────────────────┬───────┘  │
└───────────┼──────────────────┼─────────────────┼──────────┘
            │                  │                 │
┌───────────┼──────────────────┼─────────────────┼──────────────┐
│  Services Layer               │                 │              │
│  ┌────────▼──────┐  ┌────────▼──────┐  ┌───────▼────────────┐│
│  │ AudioRecording │  │ AudioPlayback │  │   voiceApi         ││
│  │ - Recording    │  │ - Playback    │  │   - Send           ││
│  │ - Pause/Resume │  │ - Play/Stop   │  │   - Load           ││
│  │ - File I/O     │  │ - Seek/Rate   │  │   - Delete         ││
│  └────────┬───────┘  └────────┬──────┘  └───────┬────────────┘│
└───────────┼──────────────────┼─────────────────┼──────────────┘
            │                  │                 │
┌───────────┼──────────────────┼─────────────────┼──────────────┐
│  expo-av Library             │                 │              │
│  - Audio.Recording           │                 │              │
│  - Audio.Sound              │                 │              │
└───────────┼──────────────────┼─────────────────┼──────────────┘
            │                  │                 │
┌───────────┼──────────────────┼─────────────────┼──────────────┐
│  Native Audio Subsystem (iOS/Android)                        │
│  - Microphone → WAV/MP4  │  MP4 → Speaker                   │
└──────────────────────────────────────────────────────────────┘
```

## 📦 Компоненты системы

### 1. Types (`silencexx/types/voice.ts`)

Полные TypeScript интерфейсы для всей системы голосовых сообщений:

```typescript
// Основные типы
export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopped' | 'error';
export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';

export interface AudioFormat {
  mimeType: 'audio/mp4' | 'audio/wav' | 'audio/mpeg';
  fileExtension: 'm4a' | 'wav' | 'mp3';
  sampleRate: number;
  bitrate: number;
  channels: 1 | 2;
}

export interface VoiceMessage {
  id?: string;
  userId: number;
  chatId: number;
  audioUri: string;
  duration: number;
  size: number;
  mimeType: string;
  transcript?: string;
  isTranscribed: boolean;
  createdAt: string;
  isLocal?: boolean;
  uploadProgress?: number;
}

// Константы и форматы
export const AUDIO_FORMATS = {
  HIGH_QUALITY: { sampleRate: 44100, bitrate: 128, ... },
  STANDARD: { sampleRate: 32000, bitrate: 64, ... },
  LOW_QUALITY: { sampleRate: 16000, bitrate: 32, ... },
};

export const VOICE_CONSTRAINTS = {
  MAX_RECORDING_DURATION: 5 * 60 * 1000,  // 5 minutes
  MIN_RECORDING_DURATION: 1000,            // 1 second
  MAX_FILE_SIZE: 50 * 1024 * 1024,        // 50 MB
  UPLOAD_TIMEOUT: 30000,                   // 30 seconds
};
```

### 2. Services

#### AudioRecordingManager (`silencexx/services/audioRecording.ts`)

Управляет записью аудио с полной поддержкой состояний:

```typescript
const manager = getRecordingManager();

// Запустить запись
await manager.startRecording({
  format: AUDIO_FORMATS.STANDARD,
  maxDuration: 5 * 60 * 1000,
  onProgress: (duration) => console.log(`Recording: ${duration}ms`),
  onError: (error) => console.error(error),
});

// Управление записью
await manager.pauseRecording();
await manager.resumeRecording();

// Остановить и получить результат
const result = await manager.stopRecording();
// { uri: 'file://...', duration: 5000, size: 45000, ... }

// Отменить и удалить файл
await manager.cancelRecording();
```

**Особенности:**
- Автоматическая очистка ресурсов
- Управление режимом аудио iOS/Android
- Отслеживание прогресса в реальном времени
- Проверка разрешений на микрофон
- Валидация минимальной длительности (1 сек)
- Валидация максимального размера (50 MB)

#### AudioPlaybackManager (`silencexx/services/audioPlayback.ts`)

Управляет воспроизведением аудио с полным управлением:

```typescript
const playback = getPlaybackManager();

// Загрузить и начать воспроизведение
await playback.playAudio('file://...', {
  rate: 1.0,
  onProgress: (current, total) => {
    console.log(`${current}/${total}ms`);
  },
  onFinish: () => console.log('Finished'),
  onError: (err) => console.error(err),
});

// Управление воспроизведением
await playback.pause();
await playback.resume();
await playback.stop();

// Расширенные функции
await playback.seekTo(2500);  // Перемотать на 2.5 сек
await playback.setRate(1.5);   // Установить скорость 1.5x
await playback.setVolume(0.8); // Установить громкость 80%

// Получить состояние
const state = playback.getState();
const progress = playback.getProgress(); // 0-1
```

**Особенности:**
- Синглтон для гарантии единственного воспроизведения
- Отслеживание прогресса с configurable interval
- Поддержка переменной скорости (0.5x - 2x)
- Управление громкостью
- Автоматические callback'и на события
- Правильное восстановление режима аудио

### 3. React Hooks

#### useVoiceRecording (`silencexx/hooks/useVoiceRecording.ts`)

```typescript
const {
  // Состояние
  status,              // 'idle' | 'recording' | 'paused' | 'stopped' | 'error'
  duration,           // в миллисекундах
  isRecording,        // boolean
  isPaused,          // boolean
  error,             // Error | null

  // Функции
  startRecording,
  pauseRecording,
  resumeRecording,
  stopRecording,
  cancelRecording,

  // Утилиты
  recordingState,
  reset,
} = useVoiceRecording(autoCleanup = true);
```

#### useVoicePlayback (`silencexx/hooks/useVoicePlayback.ts`)

```typescript
const {
  // Состояние
  status,            // 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error'
  currentTime,       // в миллисекундах
  duration,          // в миллисекундах
  progress,          // 0-1
  isPlaying,         // boolean
  isPaused,         // boolean
  error,            // Error | null

  // Функции
  playAudio,
  pause,
  resume,
  stop,
  seekTo,
  setRate,
  setVolume,

  // Утилиты
  playbackState,
  reset,
} = useVoicePlayback(autoCleanup = true);
```

#### useVoiceMessageHistory (`silencexx/hooks/useVoiceMessageHistory.ts`)

```typescript
const {
  // Состояние
  messages,               // VoiceMessageDisplayed[]
  isLoading,             // boolean
  error,                // Error | null
  hasMore,              // boolean

  // Функции
  loadMessages,         // Загрузить из сервера или кэша
  sendMessage,         // Отправить голосовое сообщение
  deleteMessage,       // Удалить сообщение
  updateMessagePlaybackState, // Обновить state воспроизведения
  addLocalMessage,     // Добавить локальное сообщение

  // Утилиты
  getTotalDuration,
  getCacheKey,
  clearCache,
} = useVoiceMessageHistory(userId, enableCache = true);
```

### 4. React Components

#### VoiceRecordButton (`silencexx/components/voice/VoiceRecordButton.tsx`)

Кнопка для запуска/остановки записи:

```typescript
<VoiceRecordButton
  onRecordingComplete={(uri, duration, size) => {
    // Отправить на сервер
  }}
  onError={(error) => {
    // Показать ошибку
  }}
  disabled={false}
  maxDuration={5 * 60 * 1000}
/>
```

**Функциональность:**
- Красный кнопка для начала записи
- UI для управления: pause/resume/send/cancel
- Отслеживание длительности в реальном времени
- Визуальный индикатор записи (пульсирующий красный кружок)
- Ограничение максимального времени
- Обработка ошибок

#### VoiceMessageBubble (`silencexx/components/voice/VoiceMessageBubble.tsx`)

Отображение голосового сообщения в чате:

```typescript
<VoiceMessageBubble
  message={voiceMessage}
  isUserMessage={true}
  onPlaybackStart={(messageId) => {
    // Обновить состояние других сообщений
  }}
  onPlaybackStop={(messageId) => {
    // Очистить состояние
  }}
/>
```

**Функциональность:**
- Play/pause кнопка
- Прогресс-бар с возможностью перемотки
- Отображение текущего времени и общей длительности
- Выполнение метаданных (прогресс загрузки)
- Разные стили для пользовательских и AI сообщений

## 💬 Использование

### Простая интеграция в ChatScreen

```typescript
// app/chat.tsx (или похожее место)
import { VoiceRecordButton } from '@/components/voice/VoiceRecordButton';
import { VoiceMessageBubble } from '@/components/voice/VoiceMessageBubble';
import { useVoiceMessageHistory } from '@/hooks/useVoiceMessageHistory';
import { useAuth } from '@/hooks/useAuthCheck';

export default function ChatScreen() {
  const { user } = useAuth();
  const { chatId } = useRoute().params;
  const { messages, sendMessage, loadMessages, updateMessagePlaybackState } = 
    useVoiceMessageHistory(user?.id);

  // Загрузить сообщения при входе
  useEffect(() => {
    loadMessages(chatId);
  }, [chatId]);

  // Отправить голосовое сообщение
  const handleVoiceRecordingComplete = async (uri, duration, size) => {
    try {
      await sendMessage(chatId, uri, duration, size, 'audio/mp4', mood);
    } catch (error) {
      console.error('Failed to send voice message:', error);
      Alert.alert('Error', 'Failed to send voice message');
    }
  };

  return (
    <View style={styles.container}>
      {/* История сообщений */}
      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <VoiceMessageBubble
            message={item}
            isUserMessage={item.sender === 'user'}
            onPlaybackStart={(messageId) => {
              updateMessagePlaybackState(messageId, true);
            }}
            onPlaybackStop={(messageId) => {
              updateMessagePlaybackState(messageId, false);
            }}
          />
        )}
        keyExtractor={(item) => item.id || item.audioUri}
      />

      {/* Кнопка для записи */}
      <VoiceRecordButton
        onRecordingComplete={handleVoiceRecordingComplete}
        onError={(error) => {
          Alert.alert('Error', error.message);
        }}
      />
    </View>
  );
}
```

## 🔌 API интеграция

### Backend endpoints

```typescript
// Отправить голосовое сообщение
POST /api/voice-messages
{
  chatId: number,
  duration: number,     // milliseconds
  size: number,         // bytes
  mimeType: string,     // 'audio/mp4'
  mood?: string,
  transcript?: string,
  audio: File           // multipart form data
}
Response: {
  success: boolean,
  message: VoiceMessage,  // Со временем создания с сервера
  error?: string
}

// Загрузить голосовые сообщения чата
GET /api/voice-messages?chatId=1&limit=50&offset=0
Response: {
  success: boolean,
  messages: VoiceMessage[],
  total: number,
  error?: string
}

// Получить голосовое сообщение
GET /api/voice-messages/:messageId
Response: Audio file (blob)

// Удалить голосовое сообщение
DELETE /api/voice-messages/:messageId
Response: { success: boolean }

// Получить метаданные
GET /api/voice-messages/:messageId/metadata
Response: VoiceMessage

// Транскрибировать голосовое сообщение
POST /api/voice-messages/:messageId/transcribe
Response: { success: boolean, transcript: string }
```

### Frontend API usage

```typescript
import { voiceApi } from '@/services/api';

// Отправить голосовое сообщение
const response = await voiceApi.sendVoiceMessage(
  chatId,
  audioUri,
  duration,
  size,
  'audio/mp4',
  mood,
  transcript
);

// Загрузить сообщения
const result = await voiceApi.getVoiceMessages(chatId, 50, 0);
console.log(result.messages);  // VoiceMessage[]

// Скачать/воспроизвести сообщение
const audioBlob = await voiceApi.downloadVoiceMessage(messageId);

// Удалить сообщение
await voiceApi.deleteVoiceMessage(messageId);

// Получить метаданные
const metadata = await voiceApi.getVoiceMessageMetadata(messageId);

// Транскрибировать
const transcript = await voiceApi.transcribeVoiceMessage(messageId);
```

## 🛡️ Ошибки и обработка

### Типы ошибок

```typescript
export const VOICE_ERROR_CODES = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',        // Нет разрешения на микрофон
  RECORDING_FAILED: 'RECORDING_FAILED',          // Ошибка записи
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',              // > 50 MB
  INVALID_FORMAT: 'INVALID_FORMAT',              // Неверный формат файла
  PLAYBACK_FAILED: 'PLAYBACK_FAILED',            // Ошибка воспроизведения
  UPLOAD_FAILED: 'UPLOAD_FAILED',                // Ошибка загрузки
  NETWORK_ERROR: 'NETWORK_ERROR',                // Ошибка сети
  TIMEOUT: 'TIMEOUT',                            // Timeout (30 сек)
  DEVICE_NOT_SUPPORTED: 'DEVICE_NOT_SUPPORTED',  // Устройство не поддерживает
  UNKNOWN: 'UNKNOWN',                            // Неизвестная ошибка
};
```

### Обработка ошибок в компонентах

```typescript
const { startRecording, error } = useVoiceRecording();

try {
  await startRecording({ format: AUDIO_FORMATS.STANDARD });
} catch (err) {
  if (err instanceof VoiceError) {
    switch (err.code) {
      case VOICE_ERROR_CODES.PERMISSION_DENIED:
        Alert.alert(
          'Permission Required',
          'Please grant microphone permission in settings'
        );
        break;
      case VOICE_ERROR_CODES.FILE_TOO_LARGE:
        Alert.alert('File Too Large', 'Recording exceeds 50 MB limit');
        break;
      default:
        Alert.alert('Error', err.message);
    }
  }
}
```

## 🔒 Безопасность и изоляция

### Multi-user Isolation

```typescript
// Все запросы привязаны к userId из токена (backend validation)

// Frontend side: useVoiceMessageHistory требует userId
const { messages } = useVoiceMessageHistory(userId, enableCache);

// Backend side (expected):
// GET /api/voice-messages
// Проверяет: chatId принадлежит userId, audioUri не содержит path traversal

// История кэшируется по ключу:
const cacheKey = `voice_messages_${userId}_${chatId}`;
// Это предотвращает смешивание данных между пользователями
```

### File Security

```typescript
// 1. Валидация размера
if (size > VOICE_CONSTRAINTS.MAX_FILE_SIZE) {
  throw new VoiceError(VOICE_ERROR_CODES.FILE_TOO_LARGE, '...');
}

// 2. Валидация MIME type
if (!VOICE_CONSTRAINTS.ALLOWED_MIME_TYPES.includes(mimeType)) {
  throw new VoiceError(VOICE_ERROR_CODES.INVALID_FORMAT, '...');
}

// 3. Валидация длительности
if (duration > MAX_RECORDING_DURATION) {
  await cancelRecording(); // Auto-stop
}

// 4. Очистка локальных файлов
await FileSystem.deleteAsync(recordingUri); // После отправки
```

## 🧪 Тестирование

### Unit Tests

```typescript
// __tests__/services/audioRecording.test.ts
import { AudioRecordingManager } from '@/services/audioRecording';

describe('AudioRecordingManager', () => {
  let manager: AudioRecordingManager;

  beforeEach(() => {
    manager = new AudioRecordingManager();
  });

  it('should start and stop recording', async () => {
    await manager.startRecording({
      format: AUDIO_FORMATS.STANDARD,
      maxDuration: 10000,
    });

    expect(manager.isRecording()).toBe(true);

    const result = await manager.stopRecording();
    expect(result.uri).toBeDefined();
    expect(result.duration).toBeGreaterThan(0);
    expect(result.size).toBeGreaterThan(0);
  });

  it('should handle pause and resume', async () => {
    await manager.startRecording({ format: AUDIO_FORMATS.STANDARD, maxDuration: 10000 });
    await manager.pauseRecording();

    expect(manager.isPaused()).toBe(true);

    await manager.resumeRecording();
    expect(manager.isRecording()).toBe(true);
  });

  it('should validate minimum duration', async () => {
    await manager.startRecording({ format: AUDIO_FORMATS.STANDARD, maxDuration: 10000 });

    // Stop immediately
    await wait(100);

    expect(() => manager.stopRecording()).rejects.toThrow(VoiceError);
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/voiceMessages.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ChatScreen } from '@/app/chat';

describe('Voice Messages Integration', () => {
  it('should record and send voice message', async () => {
    const { getByTestId } = render(<ChatScreen />);

    // Start recording
    const recordButton = getByTestId('voice-record-button');
    fireEvent.press(recordButton);

    // Wait for recording to start
    await waitFor(() => {
      expect(screen.getByText(/Recording/)).toBeTruthy();
    });

    // Stop recording
    const stopButton = getByTestId('voice-stop-button');
    fireEvent.press(stopButton);

    // Wait for message to appear
    await waitFor(() => {
      expect(screen.getByTestId('voice-message-bubble')).toBeTruthy();
    });
  });

  it('should play voice message', async () => {
    // ... setup with recorded message

    const playButton = getByTestId('voice-play-button');
    fireEvent.press(playButton);

    await waitFor(() => {
      expect(screen.getByText(/⏸/)).toBeTruthy(); // Pause button visible
    });
  });
});
```

## 🚀 Развертывание

### Requirements

- Expo SDK >= 50.0.0 (для поддержки expo-av)
- Node.js >= 16
- npm >= 8 или yarn >= 1.22

### Installation

```bash
# Установить зависимости (уже в package.json)
npm install expo-av
npm install @react-native-async-storage/async-storage

# Проверить установку
npm list expo-av

# Build для тестирования
expo build:ios
expo build:android
```

### Configuration

1. **app.json**: Убедитесь что есть разрешения

```json
{
  "expo": {
    "plugins": [
      [
        "expo-av",
        {
          "microphonePermission": "Allow CloudMind to access your microphone."
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSMicrophoneUsageDescription": "CloudMind needs microphone access to record voice messages"
      }
    },
    "android": {
      "permissions": [
        "android.permission.RECORD_AUDIO",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

2. **eas.json**: Для EAS Build

```json
{
  "build": {
    "production": {
      "env": {
        "API_URL": "https://your-api.com"
      }
    }
  }
}
```

### Deployment Steps

```bash
# 1. Build для iOS
eas build --platform ios --auto-submit

# 2. Build для Android
eas build --platform android --auto-submit

# 3. Проверить логи после публикации
eas build:list
```

## 📊 Мониторинг

### Metrics to Track

```typescript
// В backend логах
- "voice_recording_started" - { userId, chatId, format }
- "voice_recording_stopped" - { userId, chatId, duration, size }
- "voice_message_sent" - { userId, chatId, messageId, size, uploadTime }
- "voice_message_played" - { userId, messageId, duration }
- "voice_error" - { userId, errorCode, errorMessage }

// В frontend (через async-storage)
- Recording success rate
- Upload success rate
- Average upload time
- Playback error rate
```

### Performance

```
Typical timings:
- Start recording: 100-300ms
- Stop recording: 50-100ms
- Send message (1MB): 2-5 seconds (depends on network)
- Start playback: 200-500ms (initial buffer)
- Seek operation: 50-100ms
```

## 📝 Лицензия и авторство

Разработано для проекта CloudMind.
Использует `expo-av` для работы с аудио на React Native.

## 🔗 Полезные ссылки

- [expo-av documentation](https://docs.expo.dev/versions/latest/sdk/av/)
- [React Native Audio Guide](https://reactnative.dev/docs/permissions)
- [File System API (expo-file-system)](https://docs.expo.dev/versions/latest/sdk/filesystem/)
- [React Native Permissions](https://github.com/react-native-camera/react-native-permissions)
