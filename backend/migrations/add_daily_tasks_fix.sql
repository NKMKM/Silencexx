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
