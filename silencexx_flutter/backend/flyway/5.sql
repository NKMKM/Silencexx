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
