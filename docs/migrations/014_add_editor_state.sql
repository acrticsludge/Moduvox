-- Add editor_state JSONB column to presentations table
ALTER TABLE presentations ADD COLUMN IF NOT EXISTS editor_state JSONB DEFAULT '{}'::jsonb;
