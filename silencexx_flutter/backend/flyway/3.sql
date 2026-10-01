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
