-- ============================================================================
-- CloudMind Chat System - SQL примеры для проверки изоляции и лимитов
-- ============================================================================

-- ============================================================================
-- 1. ПРОВЕРКА ИЗОЛЯЦИИ ЧАТОВ
-- ============================================================================

-- Получить все чаты пользователя 3 с их сообщениями
SELECT 
  c.id as chat_id,
  c.user_id,
  c.is_first_message,
  COUNT(DISTINCT uc.id) as user_messages,
  COUNT(DISTINCT ar.id) as ai_responses
FROM chat_id c
LEFT JOIN user_chat uc ON c.id = uc.chat_id AND c.user_id = uc.user_id
LEFT JOIN ai_response ar ON c.id = ar.chat_id AND c.user_id = ar.user_id
WHERE c.user_id = 3
GROUP BY c.id, c.user_id, c.is_first_message
ORDER BY c.created_at DESC;

-- Получить все сообщения из конкретного чата (с двойной проверкой)
SELECT 
  'user' as sender,
  uc.user_id,
  uc.message,
  uc.senddate,
  uc.mood,
  uc.language
FROM user_chat uc
WHERE uc.chat_id = 5 AND uc.user_id = 3
UNION ALL
SELECT 
  'ai' as sender,
  ar.user_id,
  ar.message,
  ar.senddate,
  ar.mood,
  ar.language
FROM ai_response ar
WHERE ar.chat_id = 5 AND ar.user_id = 3
ORDER BY senddate ASC;

-- Проверить что нет "утечек" данных (сообщения от другого пользователя в чате пользователя 3)
SELECT 
  c.id as chat_id,
  'user_chat' as table_name,
  uc.user_id,
  COUNT(*) as message_count
FROM chat_id c
LEFT JOIN user_chat uc ON c.id = uc.chat_id
WHERE c.user_id = 3 AND uc.user_id IS NOT NULL AND uc.user_id != 3
UNION ALL
SELECT 
  c.id as chat_id,
  'ai_response' as table_name,
  ar.user_id,
  COUNT(*) as message_count
FROM chat_id c
LEFT JOIN ai_response ar ON c.id = ar.chat_id
WHERE c.user_id = 3 AND ar.user_id IS NOT NULL AND ar.user_id != 3
GROUP BY c.id, ar.user_id;
-- Результат должен быть пустым!

-- ============================================================================
-- 2. ПРОВЕРКА НОВЫХ ЧАТОВ И is_first_message
-- ============================================================================

-- Получить все новые чаты (где is_first_message = true)
SELECT 
  id,
  user_id,
  is_first_message,
  mood,
  created_at,
  updated_at
FROM chat_id
WHERE is_first_message = true
ORDER BY created_at DESC
LIMIT 10;

-- Получить историю изменения флага first_message для чата 5
SELECT 
  id,
  is_first_message,
  updated_at,
  'Флаг переключен' as status
FROM chat_id
WHERE id = 5;

-- Проверить чаты, которые только что созданы (менее 1 минуты назад)
SELECT 
  id,
  user_id,
  is_first_message,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) as age_seconds
FROM chat_id
WHERE created_at > NOW() - INTERVAL '1 minute'
ORDER BY created_at DESC;

-- ============================================================================
-- 3. ПРОВЕРКА MOOD ВАЛИДАЦИИ
-- ============================================================================

-- Получить все сообщения с mood
SELECT 
  'user_chat' as table_name,
  user_id,
  chat_id,
  message,
  mood,
  senddate
FROM user_chat
WHERE mood IS NOT NULL
ORDER BY senddate DESC
LIMIT 20
UNION ALL
SELECT 
  'ai_response' as table_name,
  user_id,
  chat_id,
  message,
  mood,
  senddate
FROM ai_response
WHERE mood IS NOT NULL
ORDER BY senddate DESC
LIMIT 20;

-- Статистика по mood (какие настроения есть в системе)
SELECT 
  'user_chat' as table_name,
  mood,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM user_chat WHERE mood IS NOT NULL), 2) as percentage
FROM user_chat
WHERE mood IS NOT NULL
GROUP BY mood
UNION ALL
SELECT 
  'ai_response' as table_name,
  mood,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM ai_response WHERE mood IS NOT NULL), 2) as percentage
FROM ai_response
WHERE mood IS NOT NULL
GROUP BY mood
ORDER BY table_name, count DESC;

-- Проверить некорректные mood значения (должно быть пусто)
SELECT *
FROM user_chat
WHERE mood IS NOT NULL 
  AND mood NOT IN ('Happy', 'Neutral', 'Sad', 'Anxious', 'Angry', 'Low', 'Stressed');

-- ============================================================================
-- 4. ПРОВЕРКА ЛИМИТОВ И ПОДПИСОК
-- ============================================================================

-- Получить информацию о лимитах пользователя на сегодня
SELECT 
  dl.user_id,
  dl.reset_date,
  dl.chat_requests_used,
  st.daily_chat_limit,
  (st.daily_chat_limit - dl.chat_requests_used) as remaining_chat_requests,
  dl.voice_messages_used,
  st.daily_voice_limit,
  (st.daily_voice_limit - dl.voice_messages_used) as remaining_voice,
  dl.mood_analyses_used,
  st.daily_mood_analysis_limit,
  (st.daily_mood_analysis_limit - dl.mood_analyses_used) as remaining_mood,
  dl.journal_entries_used,
  st.daily_journal_limit,
  (st.daily_journal_limit - dl.journal_entries_used) as remaining_journal
FROM daily_limits dl
JOIN user_subscriptions us ON dl.user_id = us.user_id
JOIN subscription_tiers st ON us.tier_id = st.id
WHERE dl.reset_date = CURRENT_DATE
ORDER BY dl.user_id;

-- Получить информацию о подписке пользователя 3
SELECT 
  u.id as user_id,
  st.name as subscription_tier,
  st.slug,
  st.daily_chat_limit,
  st.daily_voice_limit,
  st.daily_mood_analysis_limit,
  st.daily_journal_limit,
  st.priority_level,
  us.expires_at,
  CASE 
    WHEN us.expires_at > NOW() THEN 'ACTIVE'
    ELSE 'EXPIRED'
  END as status
FROM users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id
LEFT JOIN subscription_tiers st ON us.tier_id = st.id
WHERE u.id = 3;

-- Получить статистику использования лимитов за день
SELECT 
  dl.user_id,
  u.id,
  ud.name as user_name,
  st.name as subscription_tier,
  dl.chat_requests_used,
  st.daily_chat_limit,
  ROUND(100.0 * dl.chat_requests_used / st.daily_chat_limit, 1) as chat_usage_percent,
  dl.voice_messages_used,
  st.daily_voice_limit,
  ROUND(100.0 * dl.voice_messages_used / st.daily_voice_limit, 1) as voice_usage_percent
FROM daily_limits dl
JOIN users u ON dl.user_id = u.id
LEFT JOIN user_description ud ON u.user_desc_id = ud.id
LEFT JOIN user_subscriptions us ON u.id = us.user_id
LEFT JOIN subscription_tiers st ON us.tier_id = st.id
WHERE dl.reset_date = CURRENT_DATE
ORDER BY dl.chat_requests_used DESC;

-- ============================================================================
-- 5. ПРОВЕРКА КОЛИЧЕСТВА СООБЩЕНИЙ ПО ЧАТАМ
-- ============================================================================

-- Получить распределение сообщений по чатам
SELECT 
  c.id as chat_id,
  c.user_id,
  COUNT(DISTINCT uc.id) as user_messages,
  COUNT(DISTINCT ar.id) as ai_responses,
  COUNT(DISTINCT uc.id) + COUNT(DISTINCT ar.id) as total_messages,
  c.is_first_message,
  c.created_at,
  MAX(COALESCE(uc.senddate, ar.senddate)) as last_message_date
FROM chat_id c
LEFT JOIN user_chat uc ON c.id = uc.chat_id
LEFT JOIN ai_response ar ON c.id = ar.chat_id
GROUP BY c.id, c.user_id, c.is_first_message, c.created_at
ORDER BY total_messages DESC;

-- Получить чаты с аномальным количеством сообщений (более 1000)
SELECT 
  c.id as chat_id,
  c.user_id,
  COUNT(DISTINCT uc.id) + COUNT(DISTINCT ar.id) as total_messages,
  c.created_at,
  c.updated_at,
  EXTRACT(EPOCH FROM (c.updated_at - c.created_at)) / 3600 as hours_active
FROM chat_id c
LEFT JOIN user_chat uc ON c.id = uc.chat_id
LEFT JOIN ai_response ar ON c.id = ar.chat_id
GROUP BY c.id, c.user_id, c.created_at, c.updated_at
HAVING COUNT(DISTINCT uc.id) + COUNT(DISTINCT ar.id) > 1000
ORDER BY total_messages DESC;

-- ============================================================================
-- 6. ПРОВЕРКА ИНДЕКСОВ И ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================================================

-- Проверить наличие индексов для изоляции
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('user_chat', 'ai_response', 'chat_id')
  AND (indexdef LIKE '%user_id%' OR indexdef LIKE '%chat_id%')
ORDER BY tablename, indexname;

-- Получить размер таблиц
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE tablename IN ('user_chat', 'ai_response', 'chat_id', 'daily_limits')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- 7. ПРОВЕРКА ЦЕЛОСТНОСТИ ДАННЫХ
-- ============================================================================

-- Проверить что все сообщения привязаны к существующему чату
SELECT 
  'user_chat' as table_name,
  COUNT(*) as orphaned_messages
FROM user_chat uc
WHERE NOT EXISTS (SELECT 1 FROM chat_id c WHERE c.id = uc.chat_id)
UNION ALL
SELECT 
  'ai_response' as table_name,
  COUNT(*) as orphaned_messages
FROM ai_response ar
WHERE NOT EXISTS (SELECT 1 FROM chat_id c WHERE c.id = ar.chat_id);

-- Проверить что user_id консистентен (сообщение user_chat.user_id == chat_id.user_id)
SELECT 
  'user_chat inconsistency' as issue,
  COUNT(*) as count
FROM user_chat uc
WHERE uc.user_id != (SELECT user_id FROM chat_id WHERE id = uc.chat_id)
UNION ALL
SELECT 
  'ai_response inconsistency' as issue,
  COUNT(*) as count
FROM ai_response ar
WHERE ar.user_id != (SELECT user_id FROM chat_id WHERE id = ar.chat_id);
-- Результат должен быть пустым!

-- ============================================================================
-- 8. ОЧИСТКА ДАННЫХ (ОСТОРОЖНО!)
-- ============================================================================

-- Удалить все чаты пользователя 3
-- DELETE FROM user_chat WHERE user_id = 3;
-- DELETE FROM ai_response WHERE user_id = 3;
-- DELETE FROM chat_id WHERE user_id = 3;

-- Удалить пустые чаты
-- DELETE FROM chat_id 
-- WHERE id NOT IN (
--   SELECT DISTINCT chat_id FROM user_chat 
--   UNION 
--   SELECT DISTINCT chat_id FROM ai_response
-- );

-- ============================================================================
-- 9. ПОЛЕЗНЫЕ ПРЕДСТАВЛЕНИЯ (VIEWS)
-- ============================================================================

-- Создать представление для просмотра всех чатов с информацией
CREATE OR REPLACE VIEW v_chat_summary AS
SELECT 
  c.id as chat_id,
  c.user_id,
  c.is_first_message,
  c.created_at,
  c.updated_at,
  COUNT(DISTINCT CASE WHEN uc.id IS NOT NULL THEN uc.id END) as user_messages,
  COUNT(DISTINCT CASE WHEN ar.id IS NOT NULL THEN ar.id END) as ai_responses,
  MAX(COALESCE(uc.senddate, ar.senddate)) as last_message_at
FROM chat_id c
LEFT JOIN user_chat uc ON c.id = uc.chat_id
LEFT JOIN ai_response ar ON c.id = ar.chat_id
GROUP BY c.id, c.user_id, c.is_first_message, c.created_at, c.updated_at;

-- Использование представления
-- SELECT * FROM v_chat_summary WHERE user_id = 3 ORDER BY last_message_at DESC;
