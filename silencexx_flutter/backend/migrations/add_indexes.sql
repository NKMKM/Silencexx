-- Миграция для оптимизации запросов
-- Дата: 2025-11-20

-- Индексы для user_chat
CREATE INDEX IF NOT EXISTS idx_user_chat_chat_id ON user_chat(chat_id);
CREATE INDEX IF NOT EXISTS idx_user_chat_senddate ON user_chat(senddate DESC);
CREATE INDEX IF NOT EXISTS idx_user_chat_chat_senddate ON user_chat(chat_id, senddate DESC);

-- Индексы для ai_response
CREATE INDEX IF NOT EXISTS idx_ai_response_chat_id ON ai_response(chat_id);
CREATE INDEX IF NOT EXISTS idx_ai_response_senddate ON ai_response(senddate DESC);
CREATE INDEX IF NOT EXISTS idx_ai_response_chat_senddate ON ai_response(chat_id, senddate DESC);

-- Индекс для chat_id
CREATE INDEX IF NOT EXISTS idx_chat_id_user_id ON chat_id(user_id);

-- Индексы для session (только существующие колонки)
CREATE INDEX IF NOT EXISTS idx_session_user_id ON session(user_id);
CREATE INDEX IF NOT EXISTS idx_session_is_active ON session(is_active);

-- Анализ таблиц для обновления статистики
ANALYZE user_chat;
ANALYZE ai_response;
ANALYZE chat_id;
ANALYZE session;

-- Вывод информации
SELECT 'Indexes created successfully!' as status;
