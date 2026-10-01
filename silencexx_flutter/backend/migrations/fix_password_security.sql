-- Move passwords from session to user_credentials table
-- This is a critical security fix: passwords should NOT be in session table

-- Create proper credentials table
CREATE TABLE IF NOT EXISTS user_credentials (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Check if password column exists in session before trying to migrate
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='session' AND column_name='password'
  ) THEN
    -- Migrate existing passwords from session to user_credentials
    INSERT INTO user_credentials (user_id, password_hash, created_at)
    SELECT u.id, s.password, s.created_at
    FROM users u
    JOIN session s ON u.session_id = s.id
    WHERE s.password IS NOT NULL
    ON CONFLICT (user_id) DO NOTHING;

    -- Drop password column from session table
    ALTER TABLE session DROP COLUMN password;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON user_credentials(user_id);

-- Add comments
COMMENT ON TABLE user_credentials IS 'Stores bcrypt hashed passwords for users - passwords MUST NOT be in session table';
COMMENT ON COLUMN user_credentials.password_hash IS 'Bcrypt hashed password ($2b$10$ format)';
COMMENT ON COLUMN user_credentials.user_id IS 'Reference to user';
