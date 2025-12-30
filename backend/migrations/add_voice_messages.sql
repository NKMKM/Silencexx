-- Миграция для сохранения голосовых сообщений
-- Дата: 2025-01-15

-- Добавляем поле audio_uri в таблицу user_chat для сохранения ссылок на голосовые сообщения
ALTER TABLE user_chat ADD COLUMN IF NOT EXISTS audio_uri VARCHAR(500);

-- Добавляем поле audio_uri в таблицу ai_response для сохранения ссылок на голосовые ответы AI
ALTER TABLE ai_response ADD COLUMN IF NOT EXISTS audio_uri VARCHAR(500);

-- Создаём индекс для быстрого поиска голосовых сообщений
CREATE INDEX IF NOT EXISTS idx_user_chat_audio_uri ON user_chat(audio_uri);
CREATE INDEX IF NOT EXISTS idx_ai_response_audio_uri ON ai_response(audio_uri);

-- Анализ таблиц
ANALYZE user_chat;
ANALYZE ai_response;

SELECT 'Voice messages columns added successfully!' as status;
