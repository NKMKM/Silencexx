-- Migration 2: Add password column to session table
-- This allows storing hashed passwords for email/password authentication

ALTER TABLE session 
ADD COLUMN password VARCHAR(255);

-- Add comment for clarity
COMMENT ON COLUMN session.password IS 'Bcrypt hashed password for email/password authentication';
