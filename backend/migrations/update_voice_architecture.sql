-- Migration to unified messages table for voice architecture
-- Date: 2026-01-08

-- Drop table (for development iteration)
DROP TABLE IF EXISTS messages CASCADE;

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
