-- Fresh local database ONLY. Execute with psql --single-transaction -v ON_ERROR_STOP=1.
-- No account, chat, journal or other user content is seeded.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f')) THEN
    RAISE EXCEPTION 'Refusing bootstrap: public schema is not empty';
  END IF;
END $$;


-- Source: flyway/1.sql
-- TABLES
CREATE TABLE user_description (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64),
    surname VARCHAR(64),
    phone VARCHAR(64),
    avatar VARCHAR(64),
    email VARCHAR(64),
    registration TIMESTAMP
);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    role VARCHAR(64),
    till TIMESTAMP,
    autorefresh BOOLEAN
);

CREATE TABLE session (
    id SERIAL PRIMARY KEY,
    session_ip VARCHAR,
    session_key VARCHAR,
    device_type VARCHAR
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    user_desc_id INT,
    user_role INT,
    session_id INT,
    FOREIGN KEY (user_desc_id) REFERENCES user_description(id),
    FOREIGN KEY (user_role) REFERENCES roles(id),
    FOREIGN KEY (session_id) REFERENCES session(id)
);

CREATE TABLE language (
    id SERIAL PRIMARY KEY,
    language_id INT UNIQUE,
    language_name VARCHAR(64)
);

CREATE TABLE user_default_settings (
    id SERIAL PRIMARY KEY,
    language_id INT,
    FOREIGN KEY (language_id) REFERENCES language(language_id)
);

CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    user_id INT,
    theme INT,
    language_id INT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (language_id) REFERENCES language(language_id)
);

CREATE TABLE chat_id (
    id SERIAL PRIMARY KEY,
    user_id INT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE user_chat (
    id SERIAL PRIMARY KEY,
    chat_id INT,
    message VARCHAR,
    senddate TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chat_id(id)
);

CREATE TABLE ai_response (
    id SERIAL PRIMARY KEY,
    chat_id INT,
    message VARCHAR,
    senddate TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chat_id(id)
);

CREATE TABLE diary (
    id SERIAL PRIMARY KEY,
    user_id INT,
    diary_date TIMESTAMP,
    diary_content VARCHAR,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert default language
INSERT INTO language (language_id, language_name) VALUES (1, 'English');
INSERT INTO language (language_id, language_name) VALUES (2, 'Russian');

-- Insert default settings template
INSERT INTO user_default_settings (language_id) VALUES (1);



-- Source: flyway/2.sql
-- Migration 2: Add password column to session table
-- This allows storing hashed passwords for email/password authentication

ALTER TABLE session 
ADD COLUMN password VARCHAR(255);

-- Add comment for clarity
COMMENT ON COLUMN session.password IS 'Bcrypt hashed password for email/password authentication';


-- Source: flyway/3.sql
-- Migration 3: Fix sessions to support multiple devices per user
-- This migration changes the relationship between users and sessions
-- from one-to-one to one-to-many

-- Add user_id to session table
ALTER TABLE session
ADD COLUMN user_id INT;

-- Add foreign key constraint
ALTER TABLE session
ADD CONSTRAINT fk_session_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add created_at timestamp
ALTER TABLE session
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add index for faster lookups
CREATE INDEX idx_session_user_id ON session(user_id);

-- Comment
COMMENT ON COLUMN session.user_id IS 'Reference to the user who owns this session';
COMMENT ON COLUMN session.created_at IS 'When the session was created';


-- Source: flyway/4.sql
-- Migration 4: Add fields to session table for better tracking
-- Add last_active timestamp
ALTER TABLE session 
ADD COLUMN last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add created_at if not exists
ALTER TABLE session 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add user_id if not exists  
ALTER TABLE session 
ADD COLUMN IF NOT EXISTS user_id INT;

-- Add index
CREATE INDEX IF NOT EXISTS idx_session_user_id ON session(user_id);
CREATE INDEX IF NOT EXISTS idx_session_last_active ON session(last_active);

COMMENT ON COLUMN session.last_active IS 'Last time user was active with this session';
COMMENT ON COLUMN session.created_at IS 'When session was created';


-- Source: flyway/5.sql
-- Миграция 5: Обновление существующих сессий для заполнения user_id

-- Обновляем все сессии где user_id NULL, используя данные из таблицы users
UPDATE session s
SET user_id = u.id
FROM users u
WHERE s.id = u.session_id AND s.user_id IS NULL;

-- Обновляем last_active для всех сессий где оно NULL
UPDATE session
SET last_active = created_at
WHERE last_active IS NULL;

-- Индекс для быстрого поиска сессий по user_id (если еще не создан)
CREATE INDEX IF NOT EXISTS idx_session_user_id ON session(user_id);


-- Source: flyway/6.sql
-- Миграция 6: Добавление флага is_active для мягкого удаления сессий

-- Добавляем колонку is_active (по умолчанию true)
ALTER TABLE session ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Помечаем все существующие сессии как активные
UPDATE session SET is_active = true WHERE is_active IS NULL;

-- Индекс для быстрого поиска активных сессий
CREATE INDEX IF NOT EXISTS idx_session_is_active ON session(is_active);
CREATE INDEX IF NOT EXISTS idx_session_user_id_active ON session(user_id, is_active);


-- Source: migrations/add_chat_improvements.sql
-- Add chat improvements for multi-user isolation and mood tracking
-- Migration: add_chat_improvements.sql

-- Add user_id to user_chat for strict isolation
ALTER TABLE user_chat ADD COLUMN user_id INT;
ALTER TABLE user_chat ADD CONSTRAINT fk_user_chat_user FOREIGN KEY (user_id) REFERENCES users(id);

-- Add user_id to ai_response for strict isolation  
ALTER TABLE ai_response ADD COLUMN user_id INT;
ALTER TABLE ai_response ADD CONSTRAINT fk_ai_response_user FOREIGN KEY (user_id) REFERENCES users(id);

-- Add mood and is_first_message to chat_id
ALTER TABLE chat_id ADD COLUMN mood VARCHAR(50);
ALTER TABLE chat_id ADD COLUMN is_first_message BOOLEAN DEFAULT true;
ALTER TABLE chat_id ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE chat_id ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE chat_id ADD COLUMN is_temporary BOOLEAN DEFAULT false;

-- Add mood to user_chat for per-message tracking
ALTER TABLE user_chat ADD COLUMN mood VARCHAR(50);

-- Add mood to ai_response for per-message tracking
ALTER TABLE ai_response ADD COLUMN mood VARCHAR(50);
ALTER TABLE ai_response ADD COLUMN is_voice_response BOOLEAN DEFAULT false;
ALTER TABLE ai_response ADD COLUMN tts_audio_uri VARCHAR;

-- Create indices for performance and isolation
CREATE INDEX idx_user_chat_user_id ON user_chat(user_id);
CREATE INDEX idx_user_chat_chat_id_user_id ON user_chat(chat_id, user_id);
CREATE INDEX idx_ai_response_user_id ON ai_response(user_id);
CREATE INDEX idx_ai_response_chat_id_user_id ON ai_response(chat_id, user_id);
CREATE INDEX idx_chat_id_user_id ON chat_id(user_id);
CREATE INDEX idx_chat_id_created_at ON chat_id(created_at DESC);

-- Add constraint to ensure chat belongs to user
ALTER TABLE user_chat ADD CONSTRAINT check_user_chat_isolation 
  CHECK (user_id IS NOT NULL);

ALTER TABLE ai_response ADD CONSTRAINT check_ai_response_isolation 
  CHECK (user_id IS NOT NULL);

-- Add mood validation (enum-like)
ALTER TABLE user_chat ADD CONSTRAINT check_mood_valid 
  CHECK (mood IS NULL OR mood IN ('Happy', 'Neutral', 'Sad', 'Anxious', 'Angry', 'Low', 'Stressed'));

ALTER TABLE ai_response ADD CONSTRAINT check_ai_mood_valid 
  CHECK (mood IS NULL OR mood IN ('Happy', 'Neutral', 'Sad', 'Anxious', 'Angry', 'Low', 'Stressed'));

ALTER TABLE chat_id ADD CONSTRAINT check_chat_mood_valid 
  CHECK (mood IS NULL OR mood IN ('Happy', 'Neutral', 'Sad', 'Anxious', 'Angry', 'Low', 'Stressed'));


-- Source: migrations/fix_schema.sql
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


-- Source: migrations/add_subscriptions.sql
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


-- Source: migrations/fix_subscription_tiers.sql
-- Добавляем недостающие колонки в subscription_tiers
-- Дата: 2026-02-03

-- Добавляем колонку price_monthly
ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS price_monthly DECIMAL(10, 2) DEFAULT 0;

-- Добавляем колонку description
ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS description TEXT;

-- Обновляем цены для тарифов
UPDATE subscription_tiers SET price_monthly = 0, description = 'Бесплатный тариф с ограниченным доступом' WHERE slug = 'free';
UPDATE subscription_tiers SET price_monthly = 299, description = 'Расширенный доступ к чату и голосовым сообщениям' WHERE slug = 'plus';
UPDATE subscription_tiers SET price_monthly = 599, description = 'Полный доступ ко всем функциям без ограничений' WHERE slug = 'pro';

-- Анализ таблицы
ANALYZE subscription_tiers;

SELECT 'subscription_tiers price_monthly column added successfully!' as status;


-- Source: migrations/fix_password_security.sql
-- Move passwords from session to user_credentials table
-- This is a critical security fix: passwords should NOT be in session table

-- Create proper credentials table
CREATE TABLE IF NOT EXISTS user_credentials (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Check if password column exists in session before trying to migrate
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='session' AND column_name='password'
  ) THEN
    -- Migrate existing passwords from session to user_credentials
    INSERT INTO user_credentials (user_id, password_hash, created_at)
    SELECT u.id, s.password, s.created_at
    FROM users u
    JOIN session s ON u.session_id = s.id
    WHERE s.password IS NOT NULL
    ON CONFLICT (user_id) DO NOTHING;

    -- Drop password column from session table
    ALTER TABLE session DROP COLUMN password;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON user_credentials(user_id);

-- Add comments
COMMENT ON TABLE user_credentials IS 'Stores bcrypt hashed passwords for users - passwords MUST NOT be in session table';
COMMENT ON COLUMN user_credentials.password_hash IS 'Bcrypt hashed password ($2b$10$ format)';
COMMENT ON COLUMN user_credentials.user_id IS 'Reference to user';


-- Source: migrations/add_profile_features.sql
-- Migration: Add profile features (email change, password reset tokens, avatar)

-- Table for email change requests with 14-day cooldown
CREATE TABLE IF NOT EXISTS email_change_requests (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    new_email VARCHAR(128) NOT NULL,
    verification_token VARCHAR(128) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table for password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(128) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add last_email_change to user_description to track 14-day cooldown
ALTER TABLE user_description 
ADD COLUMN IF NOT EXISTS last_email_change TIMESTAMP;

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_email_change_token ON email_change_requests(verification_token);
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_change_user ON email_change_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);


-- Source: migrations/add_temporary_chats.sql
-- Добавление поддержки временных чатов
-- Дата: 2025-11-20

-- Добавляем колонку is_temporary в таблицу chat_id
ALTER TABLE chat_id ADD COLUMN IF NOT EXISTS is_temporary BOOLEAN DEFAULT false;

-- Обновляем существующие записи
UPDATE chat_id SET is_temporary = false WHERE is_temporary IS NULL;

-- Добавляем индекс для быстрой фильтрации
CREATE INDEX IF NOT EXISTS idx_chat_id_user_temporary ON chat_id(user_id, is_temporary);

-- Анализ таблицы
ANALYZE chat_id;

SELECT 'Temporary chats support added successfully!' as status;


-- Source: migrations/add_inbox.sql
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


-- Source: migrations/add_receive_cooldown.sql
-- Add last_message_received_at to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_message_received_at TIMESTAMP;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_last_message_received ON users(last_message_received_at);


-- Source: migrations/add_voice_messages.sql
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


-- Source: migrations/add_voice_transcription.sql
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


-- Source: migrations/add_daily_tasks_fix.sql
-- Миграция для ежедневных заданий, стриков и исправления mood
-- Дата: 2026-01-08

-- 1. Создаем таблицу daily_tasks
CREATE TABLE IF NOT EXISTS daily_tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    theme VARCHAR(100),
    status VARCHAR(20) DEFAULT 'locked', -- 'locked', 'opened', 'completed'
    expires_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_date ON daily_tasks(user_id, created_at);

-- 2. Создаем таблицу user_streaks
CREATE TABLE IF NOT EXISTS user_streaks (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Добавляем колонку mood в chat таблицы, если её нет
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_chat' AND column_name = 'mood') THEN
        ALTER TABLE user_chat ADD COLUMN mood VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_response' AND column_name = 'mood') THEN
        ALTER TABLE ai_response ADD COLUMN mood VARCHAR(50);
    END IF;
END $$;

-- 4. Обновляем индексы
CREATE INDEX IF NOT EXISTS idx_user_chat_mood ON user_chat(mood);
CREATE INDEX IF NOT EXISTS idx_ai_response_mood ON ai_response(mood);

SELECT 'Daily tasks and mood columns added successfully' as status;


-- Source: migrations/add_panic_mode.sql
-- Migration: Add panic mode tables
-- Purpose: Track panic mode sessions and user responses

CREATE TABLE IF NOT EXISTS panic_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'active', -- active, completed, abandoned
  anxiety_level_start INTEGER,
  anxiety_level_end INTEGER,
  scary_thought TEXT,
  completed_steps INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS panic_session_responses (
  id SERIAL PRIMARY KEY,
  panic_session_id INTEGER NOT NULL REFERENCES panic_sessions(id) ON DELETE CASCADE,
  step_number INTEGER,
  step_type VARCHAR(50), -- breathing, grounding_5_4_3_2_1, anxiety_talk, etc.
  user_input TEXT,
  ai_response TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_panic_sessions_user_id ON panic_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_panic_sessions_status ON panic_sessions(status);
CREATE INDEX IF NOT EXISTS idx_panic_session_responses_panic_session_id ON panic_session_responses(panic_session_id);


-- Source: migrations/add_payment_transactions.sql
-- Migration: Add payment_transactions table
-- Purpose: Track all payment attempts and completions

CREATE TABLE IF NOT EXISTS payment_transactions (
  id SERIAL PRIMARY KEY,
  transaction_id VARCHAR(100) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier_slug VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'RUB',
  payment_method VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_id ON payment_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);


-- Source: migrations/update_voice_architecture.sql
-- Migration to unified messages table for voice architecture
-- Date: 2026-01-08

-- Drop table (for development iteration)
-- Existing data is never dropped by this bootstrap.

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- User requested UUID PK
    chat_id INTEGER NOT NULL, -- Matched to existing chat_id table
    user_id INTEGER NOT NULL, -- Matched to existing users table
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant')),
    type VARCHAR(50) NOT NULL DEFAULT 'text',
    text TEXT,
    audio_url TEXT,
    status VARCHAR(50) DEFAULT 'ready',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add Foreign Keys
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_messages_user') THEN
        ALTER TABLE messages ADD CONSTRAINT fk_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_messages_chat') THEN
        ALTER TABLE messages ADD CONSTRAINT fk_messages_chat FOREIGN KEY (chat_id) REFERENCES chat_id(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Analyze
ANALYZE messages;

SELECT 'Messages table created successfully with INT Foreign Keys' as status;


-- Source: migrations/add_indexes.sql
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


-- Source: migrations/audit_performance_indexes.sql
-- Apply separately, outside a transaction. No live database was changed during audit.
-- Inspect existing equivalent indexes first; IF NOT EXISTS checks names only.
CREATE INDEX IF NOT EXISTS audit_diary_user_date ON diary(user_id, diary_date DESC);
CREATE INDEX IF NOT EXISTS audit_email_lower ON user_description(LOWER(email));
CREATE INDEX IF NOT EXISTS audit_daily_tasks_user_created ON daily_tasks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_messages_owner_audio ON messages(user_id, audio_url);
-- Existing migrations/add_indexes.sql already supplies (chat_id, senddate DESC)
-- for user_chat and ai_response; those support the new LATERAL list query.

-- Supports modern chat history and last-message lookup as messages grows.
CREATE INDEX IF NOT EXISTS audit_messages_chat_owner_created ON messages(chat_id, user_id, created_at DESC);


-- The legacy add_tier_id.sql seeds conflicting slugs. Use existing canonical tiers.
ALTER TABLE user_subscriptions ADD COLUMN tier_id INTEGER REFERENCES subscription_tiers(id);
UPDATE user_subscriptions SET tier_id=(SELECT id FROM subscription_tiers WHERE slug='free');
CREATE INDEX idx_user_subscriptions_tier_id ON user_subscriptions(tier_id);


-- Runtime schema: src/aiUsage.ts
CREATE TABLE IF NOT EXISTS ai_usage (
    id UUID PRIMARY KEY, user_id INTEGER, feature TEXT NOT NULL, model TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    input_tokens BIGINT, output_tokens BIGINT, cached_input_tokens BIGINT,
    reasoning_tokens BIGINT, served_output_tokens BIGINT, estimated_cost_usd NUMERIC(20,10),
    input_price NUMERIC(14,6) NOT NULL, cached_input_price NUMERIC(14,6) NOT NULL,
    output_price NUMERIC(14,6) NOT NULL, provider_request_id TEXT, latency_ms INTEGER, error_code TEXT
  ); CREATE INDEX IF NOT EXISTS ai_usage_user_date ON ai_usage(user_id, created_at);
     CREATE INDEX IF NOT EXISTS ai_usage_date ON ai_usage(created_at);;


-- Runtime schema: src/dailyWish.ts
CREATE TABLE IF NOT EXISTS daily_wishes (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      language VARCHAR(2) NOT NULL, day DATE NOT NULL, wish TEXT NOT NULL,
      PRIMARY KEY (user_id, language, day)
    );
