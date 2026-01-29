-- Миграция для исправления subscription логики

-- 1. Создать таблицу subscription_tiers с правильными limit-ами
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  -- free, pro, premium
  daily_message_limit INTEGER DEFAULT 50,
  daily_journal_limit INTEGER DEFAULT 10,
  daily_task_limit INTEGER DEFAULT 1,
  priority_level INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Заполнить таблицу tier-ами
INSERT INTO subscription_tiers (name, daily_message_limit, daily_journal_limit, daily_task_limit, priority_level)
VALUES 
  ('free', 50, 10, 1, 0),
  ('pro', 200, 50, 3, 1),
  ('premium', 1000, 200, 10, 2)
ON CONFLICT (id) DO NOTHING;

-- 3. Добавить tier_id в user_subscriptions (если не существует)
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS tier_id INTEGER DEFAULT 1 REFERENCES subscription_tiers(id);

-- 4. Обновить tier_id на основе subscription_type
UPDATE user_subscriptions SET tier_id = 1 WHERE subscription_type = 'free' AND tier_id IS NULL;
UPDATE user_subscriptions SET tier_id = 2 WHERE subscription_type = 'pro' AND tier_id IS NULL;
UPDATE user_subscriptions SET tier_id = 3 WHERE subscription_type = 'premium' AND tier_id IS NULL;

-- 5. Создать таблицу daily_limits если её нет
CREATE TABLE IF NOT EXISTS daily_limits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reset_date DATE NOT NULL,
  chat_requests_used INTEGER DEFAULT 0,
  journal_entries_used INTEGER DEFAULT 0,
  tasks_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, reset_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_limits_user_date ON daily_limits(user_id, reset_date);
