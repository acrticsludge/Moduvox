-- Add gemini_api_key column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS gemini_api_key TEXT DEFAULT NULL;
