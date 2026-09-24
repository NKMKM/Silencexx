-- Migration: Add panic mode tables
-- Purpose: Track panic mode sessions and user responses

CREATE TABLE IF NOT EXISTS panic_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'active', -- active, completed, abandoned
  anxiety_level_start INTEGER,
  anxiety_level_end INTEGER,
  scary_thought TEXT,
  completed_steps INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS panic_session_responses (
  id SERIAL PRIMARY KEY,
  panic_session_id INTEGER NOT NULL REFERENCES panic_sessions(id) ON DELETE CASCADE,
  step_number INTEGER,
  step_type VARCHAR(50), -- breathing, grounding_5_4_3_2_1, anxiety_talk, etc.
  user_input TEXT,
  ai_response TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_panic_sessions_user_id ON panic_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_panic_sessions_status ON panic_sessions(status);
CREATE INDEX IF NOT EXISTS idx_panic_session_responses_panic_session_id ON panic_session_responses(panic_session_id);
