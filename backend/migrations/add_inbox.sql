-- Миграция для функционала анонимных пожеланий (Inbox)
-- Дата: 2025-11-22

-- Создаём таблицу для анонимных сообщений
CREATE TABLE IF NOT EXISTS anonymous_messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Добавляем поля в таблицу users для отслеживания ограничений
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_message_sent_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_received_message BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_anonymous_messages_receiver ON anonymous_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_messages_sender ON anonymous_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_messages_sent_at ON anonymous_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_last_message_sent ON users(last_message_sent_at);
CREATE INDEX IF NOT EXISTS idx_users_has_received ON users(has_received_message);

-- Анализ таблиц
ANALYZE anonymous_messages;
ANALYZE users;

SELECT 'Inbox feature tables created successfully!' as status;
