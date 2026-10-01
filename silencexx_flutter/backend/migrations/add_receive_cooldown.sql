-- Add last_message_received_at to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_message_received_at TIMESTAMP;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_last_message_received ON users(last_message_received_at);
