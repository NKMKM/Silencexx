-- Apply separately, outside a transaction. No live database was changed during audit.
-- Inspect existing equivalent indexes first; IF NOT EXISTS checks names only.
CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_diary_user_date ON diary(user_id, diary_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_email_lower ON user_description(LOWER(email));
CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_daily_tasks_user_created ON daily_tasks(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_messages_owner_audio ON messages(user_id, audio_url);
-- Existing migrations/add_indexes.sql already supplies (chat_id, senddate DESC)
-- for user_chat and ai_response; those support the new LATERAL list query.

-- Supports modern chat history and last-message lookup as messages grows.
CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_messages_chat_owner_created ON messages(chat_id, user_id, created_at DESC);
