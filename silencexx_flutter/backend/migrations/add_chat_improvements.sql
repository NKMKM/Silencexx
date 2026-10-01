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
