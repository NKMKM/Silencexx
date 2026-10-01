-- Миграция для добавления tier_id колонки в user_subscriptions

-- 1. Убедитесь, что subscription_tiers таблица существует с правильной схемой
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50),
  daily_chat_limit INTEGER DEFAULT 50,
  daily_voice_limit INTEGER DEFAULT 10,
  daily_mood_analysis_limit INTEGER DEFAULT 5,
  daily_journal_limit INTEGER DEFAULT 10,
  chat_history_days INTEGER DEFAULT 7,
  has_tts BOOLEAN DEFAULT false,
  has_export BOOLEAN DEFAULT false,
  priority_level INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Вставить стандартные уровни подписки (если их ещё нет)
INSERT INTO subscription_tiers (name, slug, daily_chat_limit, daily_voice_limit, daily_mood_analysis_limit, daily_journal_limit, priority_level)
VALUES 
  ('free', 'free', 50, 10, 5, 10, 0),
  ('pro', 'pro', 200, 50, 20, 50, 1),
  ('premium', 'premium', 1000, 200, 100, 200, 2)
ON CONFLICT (name) DO NOTHING;

-- 3. Добавить tier_id колонку в user_subscriptions (если её ещё нет)
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS tier_id INTEGER DEFAULT 1 REFERENCES subscription_tiers(id);

-- 4. Обновить tier_id на основе subscription_type для пользователей без установленного tier_id
UPDATE user_subscriptions us
SET tier_id = COALESCE(
  (SELECT id FROM subscription_tiers st WHERE st.name = us.subscription_type LIMIT 1),
  1
)
WHERE us.tier_id = 1 AND us.subscription_type != 'free';

-- 5. Убедиться, что все пользователи имеют валидный tier_id
UPDATE user_subscriptions
SET tier_id = 1
WHERE tier_id IS NULL OR tier_id NOT IN (SELECT id FROM subscription_tiers);

-- 6. Создать индекс для оптимизации JOIN операций
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier_id ON user_subscriptions(tier_id);
