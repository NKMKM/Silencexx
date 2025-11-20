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
