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
