# Голосовые сообщения - Быстрый старт

Пошаговое руководство для быстрой интеграции голосовых сообщений в приложение.

## 🚀 За 10 минут

### 1. Проверить зависимости

```bash
npm list expo-av @react-native-async-storage/async-storage
# Должны быть установлены
```

### 2. Импортировать компоненты в ChatScreen

```typescript
// app/chat.tsx
import { VoiceRecordButton } from '@/components/voice/VoiceRecordButton';
import { VoiceMessageBubble } from '@/components/voice/VoiceMessageBubble';
import { useVoiceMessageHistory } from '@/hooks/useVoiceMessageHistory';
```

### 3. Добавить хук для управления голосовыми сообщениями

```typescript
export default function ChatScreen() {
  const { user } = useAuth();
  const { chatId } = useRoute().params;

  const {
    messages,
    sendMessage,
    loadMessages,
    updateMessagePlaybackState,
  } = useVoiceMessageHistory(user?.id);

  // Загрузить сообщения при входе
  useEffect(() => {
    loadMessages(chatId);
  }, [chatId, loadMessages]);

  return (
    // ... компоненты экрана
  );
}
```

### 4. Отобразить голосовые сообщения в истории

```typescript
<FlatList
  data={messages}
  renderItem={({ item }) => {
    // Если это голосовое сообщение
    if (item.sender === 'user' && item.audioUri) {
      return (
        <VoiceMessageBubble
          message={item}
          isUserMessage={item.sender === 'user'}
          onPlaybackStart={(messageId) => {
            updateMessagePlaybackState(messageId, true);
          }}
        />
      );
    }
    // Иначе обычное текстовое сообщение
    return <TextMessageBubble message={item} />;
  }}
  keyExtractor={(item) => item.id || item.audioUri || item.text}
/>
```

### 5. Добавить кнопку записи в input

```typescript
<View style={styles.inputContainer}>
  <TextInput
    style={styles.input}
    placeholder="Type a message..."
    value={messageText}
    onChangeText={setMessageText}
  />

  {/* Голосовая кнопка */}
  <VoiceRecordButton
    onRecordingComplete={async (uri, duration, size) => {
      try {
        await sendMessage(
          chatId,
          uri,
          duration,
          size,
          'audio/mp4',
          mood
        );
      } catch (error) {
        Alert.alert('Error', 'Failed to send voice message');
      }
    }}
    onError={(error) => {
      Alert.alert('Error', error.message);
    }}
  />
</View>
```

## 📋 Checklist для полной интеграции

- [ ] Импортированы все компоненты и хуки
- [ ] Хук `useVoiceMessageHistory` добавлен в ChatScreen
- [ ] Сообщения загружаются при входе в чат
- [ ] `VoiceRecordButton` добавлен в input area
- [ ] `VoiceMessageBubble` добавлен в FlatList
- [ ] Обработка событий onRecordingComplete
- [ ] Обработка ошибок onError
- [ ] Тестирование на iOS и Android

## 🎯 Типичные сценарии использования

### Сценарий 1: Запись и отправка голосового сообщения

```
1. Пользователь нажимает кнопку записи 🎤
2. Появляется UI с контролами:
   - ⏸ Пауза (если записывается)
   - ✓ Отправить
   - ✕ Отменить
3. Пользователь нажимает ✓ для отправки
4. Сообщение загружается на сервер (видно прогресс)
5. Сообщение появляется в чате как голосовое сообщение
```

### Сценарий 2: Воспроизведение голосового сообщения

```
1. Пользователь видит голосовое сообщение в чате
2. Нажимает кнопку Play ▶
3. Появляется прогресс-бар
4. Аудио воспроизводится
5. Нажав паузу ⏸, можно приостановить
6. Клик по прогресс-бару для перемотки
```

### Сценарий 3: Обработка ошибок

```
Типичные ошибки:
- PERMISSION_DENIED: Показать "Разрешите доступ к микрофону в настройках"
- FILE_TOO_LARGE: Показать "Запись слишком длинная (макс 5 минут)"
- NETWORK_ERROR: Показать "Проверьте интернет соединение"
- UPLOAD_FAILED: Предложить "Повторить отправку"
```

## 🔧 Настройка параметров

### Изменить максимальную длительность записи

```typescript
<VoiceRecordButton
  maxDuration={10 * 60 * 1000}  // 10 минут вместо 5
  onRecordingComplete={...}
/>
```

### Изменить качество аудио

```typescript
import { AUDIO_FORMATS } from '@/types/voice';

const { startRecording } = useVoiceRecording();

await startRecording({
  format: AUDIO_FORMATS.HIGH_QUALITY,  // вместо STANDARD
  maxDuration: 5 * 60 * 1000,
});

// Доступные форматы:
// - HIGH_QUALITY: 44100Hz, 128kbps (лучшее качество, больший размер)
// - STANDARD: 32000Hz, 64kbps (оптимальный баланс) - ПО УМОЛЧАНИЮ
// - LOW_QUALITY: 16000Hz, 32kbps (компактный размер, худшее качество)
```

### Включить/отключить кэширование

```typescript
// Кэширование включено (по умолчанию)
const { messages } = useVoiceMessageHistory(userId, enableCache = true);

// Отключить кэширование
const { messages } = useVoiceMessageHistory(userId, enableCache = false);

// Очистить кэш вручную
clearCache();
```

## 🐛 Отладка

### Логирование

```typescript
// В services/audioRecording.ts и audioPlayback.ts уже есть console.log
// Для включения детального логирования в production:

// app/chat.tsx
const { messages, isLoading, error } = useVoiceMessageHistory(userId);

useEffect(() => {
  if (error) {
    console.error('Voice message error:', error);
  }
}, [error]);

useEffect(() => {
  console.log('Voice messages updated:', messages.length);
}, [messages]);
```

### Проверка разрешений

```typescript
import { Audio } from 'expo-av';

async function checkMicrophonePermission() {
  const permission = await Audio.requestPermissionsAsync();
  console.log('Microphone permission:', permission.granted ? 'GRANTED' : 'DENIED');
}
```

### Тестирование на симуляторе/эмуляторе

```bash
# iOS Simulator
xcrun simctl getenv booted SIMULATOR_PRODUCT_NAME
# Микрофон обычно не работает, используйте реальное устройство

# Android Emulator
# Используйте опцию "Use Phone's Microphone" в настройках эмулятора
```

## 📱 Тестирование на реальных устройствах

```bash
# iOS
expo build:ios --auto-submit

# Android
expo build:android --auto-submit

# Или локальное тестирование
expo start --ios
expo start --android
```

## 🔐 Проверка безопасности

- [ ] Все сообщения привязаны к userId (проверить в backend логах)
- [ ] Файлы удаляются после отправки (проверить локальную FS)
- [ ] Кэш не смешивается между пользователями (разные cacheKey)
- [ ] Размер файла валидируется < 50MB
- [ ] MIME type валидируется (только audio/mp4, audio/wav, audio/mpeg)

## 📞 Техническая поддержка

При возникновении проблем:

1. Проверить console.log в Expo Go
2. Проверить логи в backend
3. Убедиться что expo-av установлен: `npm list expo-av`
4. Убедиться что разрешения в app.json (iOS: NSMicrophoneUsageDescription, Android: RECORD_AUDIO)
5. На эмуляторе может не работать микрофон - используйте реальное устройство

## 🎓 Дальнейшее развитие

После базовой интеграции можно добавить:

- [ ] Транскрибирование голосовых сообщений (whisper API)
- [ ] Text-to-speech для AI ответов
- [ ] Визуализация волны аудио
- [ ] Фильтры и эффекты обработки голоса
- [ ] Поддержка видеосообщений
- [ ] Компрессия аудио перед отправкой

## ✅ Готово!

Голосовая система полностью интегрирована. Приложение готово для записи, отправки и воспроизведения голосовых сообщений!
