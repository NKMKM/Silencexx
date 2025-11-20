-- Миграция 6: Добавление флага is_active для мягкого удаления сессий

-- Добавляем колонку is_active (по умолчанию true)
ALTER TABLE session ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Помечаем все существующие сессии как активные
UPDATE session SET is_active = true WHERE is_active IS NULL;

-- Индекс для быстрого поиска активных сессий
CREATE INDEX IF NOT EXISTS idx_session_is_active ON session(is_active);
CREATE INDEX IF NOT EXISTS idx_session_user_id_active ON session(user_id, is_active);
