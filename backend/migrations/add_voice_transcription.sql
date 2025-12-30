-- Миграция для поддержки голосовых сообщений с транскрипцией и языками
-- Дата: 2025-12-08

-- Добавляем поле language в таблицу user_chat для сохранения языка сообщения
ALTER TABLE user_chat ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'ru';

-- Добавляем поле transcript в таблицу user_chat для сохранения транскрипции голоса
ALTER TABLE user_chat ADD COLUMN IF NOT EXISTS transcript TEXT;

-- Добавляем поле is_transcribed в таблицу user_chat для отслеживания статуса транскрипции
ALTER TABLE user_chat ADD COLUMN IF NOT EXISTS is_transcribed BOOLEAN DEFAULT false;

-- Добавляем поле language в таблицу ai_response для сохранения языка ответа
ALTER TABLE ai_response ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'ru';

-- Добавляем поле tts_audio_uri в таблицу ai_response для сохранения аудио синтеза речи
ALTER TABLE ai_response ADD COLUMN IF NOT EXISTS tts_audio_uri VARCHAR(500);

-- Добавляем поле is_voice_response в таблицу ai_response для отслеживания голосовых ответов
ALTER TABLE ai_response ADD COLUMN IF NOT EXISTS is_voice_response BOOLEAN DEFAULT false;

-- Добавляем индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_user_chat_language ON user_chat(language);
CREATE INDEX IF NOT EXISTS idx_user_chat_is_transcribed ON user_chat(is_transcribed);
CREATE INDEX IF NOT EXISTS idx_ai_response_language ON ai_response(language);
CREATE INDEX IF NOT EXISTS idx_ai_response_is_voice_response ON ai_response(is_voice_response);

-- Анализ таблиц
ANALYZE user_chat;
ANALYZE ai_response;

SELECT 'Voice messages with transcription support added successfully!' as status;
