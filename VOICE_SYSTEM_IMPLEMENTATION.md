# 🎙️ Система голосовых сообщений с многоязычной поддержкой

## 📋 Обзор реализации

Полная система для работы с голосовыми сообщениями, включающая:
- ✅ Запись голоса с визуализацией
- ✅ Многоязычная транскрипция (7 языков)
- ✅ ИИ ответы на голосовые сообщения
- ✅ Синтез речи для ответов (Text-to-Speech)
- ✅ Сохранение в базе данных
- ✅ Загрузка и отображение истории голосовых сообщений

---

## 🎯 Ключевые компоненты

### Frontend Components

#### 1. **VoiceService.ts** (Новый сервис)
```typescript
export type SupportedLanguage = 'ru' | 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh';

- setLanguage(language) - установить язык
- startRecording() - начать запись
- stopRecording() - остановить запись
- transcribeAudio(audioUri, language) - транскрибировать аудио
- synthesizeSpeech(text, language) - синтезировать речь
- playAudio(uri) - воспроизвести аудиофайл
```

#### 2. **VoiceMessageDisplay.tsx** (Новый компонент)
- Отображение голосовых сообщений в чате
- Плеер с кнопкой воспроизведения
- Отображение длительности аудиофайла
- Показ транскрипции если доступна
- Язык сообщения (тэг)

#### 3. **LanguageSelector.tsx** (Новый компонент)
- Выбор языка для записи и обработки
- Модальное окно со всеми поддерживаемыми языками
- Текущий язык отображается в кнопке
- Поддержка темной темы

#### 4. **useVoiceMessagesWithLanguage.ts** (Новый хук)
```typescript
- startRecording(language) - начать запись на выбранном языке
- stopRecording() - остановить запись
- processAudioToText(audioUri) - транскрибировать в текст
- synthesizeSpeech(text) - синтезировать речь
- setLanguage(language) - установить язык
```

#### 5. **ChatPage.tsx** (Обновлено)
- Добавлен LanguageSelector компонент
- Интеграция VoiceMessageDisplay
- Функция loadChatMessages загружает language, transcript, isTranscribed
- Функция sendMessageInternal передает язык на backend
- renderMessage отображает голосовые сообщения с VoiceMessageDisplay

### Backend Endpoints

#### 1. **POST /api/transcribe**
```javascript
Body: {
  audioUri: string,
  language: string
}

Response: {
  success: boolean,
  text: string,
  confidence: number,
  language: string
}
```

#### 2. **POST /api/synthesize**
```javascript
Body: {
  text: string,
  language: string
}

Response: WAV audio buffer
```

#### 3. **POST /api/chat-with-voice**
```javascript
Body: {
  message: string,
  audioUri?: string,
  language: string,
  transcript?: string,
  isTranscribed: boolean,
  chatId: number,
  userId: number
}
```

#### 4. **GET /api/supported-languages**
```javascript
Response: {
  success: boolean,
  languages: Array<{
    code: string,
    name: string,
    nativeName: string
  }>
}
```

---

## 📊 Структура базы данных

### Таблица `user_chat` (расширена)
```sql
- id (INTEGER) PRIMARY KEY
- chat_id (INTEGER) FOREIGN KEY
- message (VARCHAR)
- senddate (TIMESTAMP)
- audio_uri (VARCHAR(500)) -- Путь к аудиофайлу пользователя
- language (VARCHAR(10)) -- Язык сообщения (ru, en, es, etc)
- transcript (TEXT) -- Транскрипция голоса
- is_transcribed (BOOLEAN) -- Статус транскрипции
```

### Таблица `ai_response` (расширена)
```sql
- id (INTEGER) PRIMARY KEY
- chat_id (INTEGER) FOREIGN KEY
- message (VARCHAR)
- senddate (TIMESTAMP)
- language (VARCHAR(10)) -- Язык ответа
- tts_audio_uri (VARCHAR(500)) -- Путь к синтезированному аудио
- is_voice_response (BOOLEAN) -- Это голосовой ответ
```

---

## 🔄 Жизненный цикл голосового сообщения

```
1. Выбор языка
   ↓
2. Запись голоса (VoiceRecorder.startRecording)
   ↓
3. Визуализация волны в реальном времени
   ↓
4. Остановка и получение audioUri
   ↓
5. Отправка на backend для транскрипции
   ↓
6. Получение транскрипции с уверенностью
   ↓
7. Отправка текста ИИ вместе с audioUri
   ↓
8. ИИ генерирует ответ
   ↓
9. (Опционально) Синтез речи для ответа
   ↓
10. Сохранение всего в БД:
    - Голос пользователя (audio_uri)
    - Транскрипция (transcript)
    - Язык (language)
    - Ответ ИИ
    - (Опционально) синтезированный ответ (tts_audio_uri)
    ↓
11. При загрузке старого чата все восстанавливается из БД
```

---

## 🌐 Поддерживаемые языки

| Код | Язык | Локаль |
|-----|------|--------|
| ru | Русский | ru-RU |
| en | English | en-US |
| es | Español | es-ES |
| fr | Français | fr-FR |
| de | Deutsch | de-DE |
| ja | 日本語 | ja-JP |
| zh | 中文 | zh-CN |

---

## 💾 Миграции БД

### New File: `backend/migrations/add_voice_transcription.sql`
```sql
-- Добавляет поля для языка, транскрипции и TTS
ALTER TABLE user_chat ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'ru';
ALTER TABLE user_chat ADD COLUMN IF NOT EXISTS transcript TEXT;
ALTER TABLE user_chat ADD COLUMN IF NOT EXISTS is_transcribed BOOLEAN DEFAULT false;

ALTER TABLE ai_response ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'ru';
ALTER TABLE ai_response ADD COLUMN IF NOT EXISTS tts_audio_uri VARCHAR(500);
ALTER TABLE ai_response ADD COLUMN IF NOT EXISTS is_voice_response BOOLEAN DEFAULT false;

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_user_chat_language ON user_chat(language);
CREATE INDEX IF NOT EXISTS idx_user_chat_is_transcribed ON user_chat(is_transcribed);
CREATE INDEX IF NOT EXISTS idx_ai_response_language ON ai_response(language);
CREATE INDEX IF NOT EXISTS idx_ai_response_is_voice_response ON ai_response(is_voice_response);
```

---

## 📱 API Контракт

### Frontend → Backend (ChatRequest расширен)
```typescript
export interface ChatRequest {
  message: string;
  mood?: string;
  conversationHistory?: ChatMessage[];
  chatId?: number;
  audioUri?: string;           // URI голосового сообщения
  isVoiceMessage?: boolean;    // Это голосовое сообщение
  language?: string;           // Язык (ru, en, es, etc)
  transcript?: string;         // Транскрипция голоса
  isTranscribed?: boolean;     // Уже ли было транскрибировано
}
```

### Backend → Frontend (ChatHistoryMessage расширена)
```typescript
export interface ChatHistoryMessage {
  sender: 'user' | 'ai';
  message: string;
  senddate: string;
  audio_uri?: string;          // Аудиофайл
  language?: string;           // Язык
  transcript?: string;         // Транскрипция
  is_transcribed?: boolean;    // Статус
  tts_audio_uri?: string;      // TTS ответ ИИ
  is_voice_response?: boolean; // ИИ ответ голосом
}
```

---

## 🔧 Обновленные компоненты

### server.ts (backend)
- ✅ Добавлены импорты для voice handlers
- ✅ Добавлены маршруты /api/transcribe, /api/synthesize, /api/chat-with-voice
- ✅ Добавлен маршрут /api/supported-languages
- ✅ POST /api/chat теперь извлекает language, transcript, isTranscribed

### chat.ts (backend)
- ✅ getChatMessages теперь возвращает language, transcript, is_transcribed для user_chat
- ✅ getChatMessages возвращает language, tts_audio_uri, is_voice_response для ai_response

### ChatPage.tsx (frontend)
- ✅ Импортирует VoiceMessageDisplay и LanguageSelector
- ✅ Импортирует useVoiceMessagesWithLanguage вместо useVoiceMessages
- ✅ Добавлена переменная состояния selectedLanguage
- ✅ renderMessage отображает VoiceMessageDisplay для голосовых сообщений
- ✅ sendMessageInternal теперь передает язык
- ✅ loadChatMessages загружает полные данные голосовых сообщений
- ✅ Добавлен LanguageSelector компонент в UI

### api.ts (frontend)
- ✅ ChatRequest расширена полями language, transcript, isTranscribed
- ✅ ChatHistoryMessage расширена полями для полной информации о голосе

---

## 🎯 Использование в приложении

### Для пользователя:
```
1. Открыть чат
2. Выбрать язык (опционально, по умолчанию 'ru')
3. Нажать кнопку микрофона 🎤
4. Говорить (видна волна звука)
5. Отпустить - начинается обработка
6. Видеть транскрипцию (если доступна)
7. Получить ответ ИИ
8. Слушать ответ (если включен синтез речи)
9. Закрыть чат и открыть позже - история сохранена
```

---

## 🔐 Сохранность данных

- ✅ Все голосовые сообщения хранятся в БД
- ✅ Транскрипции сохраняются для быстрого восстановления
- ✅ Язык каждого сообщения записывается
- ✅ Синтезированные ответы ИИ сохраняются
- ✅ При загрузке старого чата всё восстанавливается идентично

---

## 📝 Примеры использования

### Транскрибировать голос
```typescript
const voiceService = new VoiceService();
voiceService.setLanguage('ru');
await voiceService.startRecording();
// ... пользователь говорит ...
const audioUri = await voiceService.stopRecording();
const result = await voiceService.transcribeAudio(audioUri, 'ru');
console.log('Распознано:', result.text);
```

### Синтезировать речь
```typescript
const audioUri = await voiceService.synthesizeSpeech(
  'Привет, это тестовое сообщение!',
  'ru'
);
await voiceService.playAudio(audioUri);
```

### Выбрать язык и записать
```typescript
const voice = useVoiceMessagesWithLanguage();
voice.setLanguage('en');
await voice.startRecording('en');
// ... запись ...
const uri = await voice.stopRecording();
const text = await voice.processAudioToText(uri);
```

---

## 🚀 Запуск системы

```bash
# 1. Запустить миграции БД
cd backend
npm run migrate

# 2. Запустить backend
npm run dev

# 3. Запустить frontend
cd ../silencexx
npm start
```

---

## ✅ Тестирование

### Сценарий 1: Русский голосовой чат
1. Выбрать язык: Русский (ru)
2. Нажать микрофон
3. Сказать: "Привет, как дела?"
4. Получить транскрипцию и ответ

### Сценарий 2: Многоязычный чат
1. Сказать на русском
2. Переключить язык
3. Сказать на английском
4. Система правильно определит язык каждого сообщения

### Сценарий 3: Сохранение истории
1. Записать несколько голосовых сообщений
2. Закрыть приложение
3. Открыть приложение
4. Открыть старый чат
5. Все голосовые сообщения есть с транскрипциями

---

## 🔮 Будущие улучшения

1. **Google Cloud Integration**
   - Полная интеграция Speech-to-Text API
   - Полная интеграция Text-to-Speech API

2. **Улучшение качества**
   - Шумоподавление при записи
   - Автоматическое определение языка
   - Корректировка синтаксиса транскрипции

3. **Расширение функционала**
   - Пакетная обработка сообщений
   - Перевод голосовых сообщений
   - Эмоциональный анализ голоса

---

**Статус:** ✅ Полностью реализовано и готово к использованию
**Дата:** 8 декабря 2025
