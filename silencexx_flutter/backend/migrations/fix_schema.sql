-- Миграция для исправления схемы БД

-- 1. Добавить колонку is_first_message в таблицу chat_id (если её нет)
ALTER TABLE chat_id 
ADD COLUMN IF NOT EXISTS is_first_message BOOLEAN DEFAULT true;

-- 2. Создать таблицу user_subscriptions (если её нет)
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  subscription_type VARCHAR(50) DEFAULT 'free',
  -- free, premium, pro
  status VARCHAR(20) DEFAULT 'active',
  -- active, cancelled, expired
  started_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Создать индексы
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- 4. Добавить default subscription для существующих пользователей
INSERT INTO user_subscriptions (user_id, subscription_type, status)
SELECT id, 'free', 'active'
FROM users
WHERE id NOT IN (SELECT user_id FROM user_subscriptions WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;
