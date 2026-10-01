-- Миграция для системы подписок (Subscription Tiers)
-- Дата: 2025-12-25

-- Создаём таблицу для типов подписок
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  daily_chat_limit INTEGER NOT NULL,
  daily_voice_limit INTEGER NOT NULL,
  daily_mood_analysis_limit INTEGER NOT NULL,
  daily_journal_limit INTEGER NOT NULL,
  chat_history_days INTEGER NOT NULL,
  has_tts BOOLEAN DEFAULT false,
  has_export BOOLEAN DEFAULT false,
  priority_level INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Добавляем поля в таблицу users для отслеживания подписок и лимитов
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier_id INTEGER REFERENCES subscription_tiers(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_limits_reset TIMESTAMP DEFAULT NOW();

-- Таблица для отслеживания использования лимитов за день
CREATE TABLE IF NOT EXISTS daily_limits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reset_date DATE NOT NULL,
  chat_requests_used INTEGER DEFAULT 0,
  voice_messages_used INTEGER DEFAULT 0,
  mood_analysis_used INTEGER DEFAULT 0,
  journal_entries_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, reset_date)
);

-- Таблица для истории подписок
CREATE TABLE IF NOT EXISTS subscription_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier_id INTEGER REFERENCES subscription_tiers(id),
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  payment_id VARCHAR(255),
  amount DECIMAL(10, 2),
  currency VARCHAR(3),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Создаём индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_expires ON users(subscription_expires_at);
CREATE INDEX IF NOT EXISTS idx_daily_limits_user_date ON daily_limits(user_id, reset_date);
CREATE INDEX IF NOT EXISTS idx_subscription_history_user ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_status ON subscription_history(status);

-- Вставляем стандартные тарифы
INSERT INTO subscription_tiers (name, slug, daily_chat_limit, daily_voice_limit, daily_mood_analysis_limit, daily_journal_limit, chat_history_days, has_tts, has_export, priority_level)
VALUES 
  ('Free', 'free', 5, 1, 3, 1, 30, false, false, 1),
  ('Plus', 'plus', 50, 999, 999, 999, 180, true, true, 2),
  ('Professional', 'pro', 200, 999, 999, 999, 999, true, true, 3)
ON CONFLICT (slug) DO NOTHING;

-- Обновляем существующих пользователей на Free тариф если у них нет подписки
UPDATE users 
SET subscription_tier_id = (SELECT id FROM subscription_tiers WHERE slug = 'free')
WHERE subscription_tier_id IS NULL;

-- Анализ таблиц
ANALYZE subscription_tiers;
ANALYZE daily_limits;
ANALYZE subscription_history;

SELECT 'Subscription system tables created successfully!' as status;
