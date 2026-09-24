-- Migration: Add profile features (email change, password reset tokens, avatar)

-- Table for email change requests with 14-day cooldown
CREATE TABLE IF NOT EXISTS email_change_requests (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    new_email VARCHAR(128) NOT NULL,
    verification_token VARCHAR(128) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table for password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(128) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add last_email_change to user_description to track 14-day cooldown
ALTER TABLE user_description 
ADD COLUMN IF NOT EXISTS last_email_change TIMESTAMP;

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_email_change_token ON email_change_requests(verification_token);
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_change_user ON email_change_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
