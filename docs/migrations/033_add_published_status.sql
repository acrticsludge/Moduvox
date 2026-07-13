-- docs/migrations/033_add_published_status.sql
-- Add 'published' to presentation status enum

ALTER TABLE presentations
  ALTER COLUMN status TYPE TEXT USING status::TEXT; -- drop check constraint

ALTER TABLE presentations
  ADD CONSTRAINT presentations_status_check
  CHECK (status IN ('draft', 'ready', 'published', 'archived'));

-- Also add 'published' to previous_status
ALTER TABLE presentations
  ALTER COLUMN previous_status TYPE TEXT USING previous_status::TEXT;

ALTER TABLE presentations
  ADD CONSTRAINT presentations_previous_status_check
  CHECK (previous_status IN ('draft', 'ready', 'published'));

-- Update any 'ready' presentations that have audio generated to 'published'
-- (assuming they were ready to be shared)
-- UPDATE presentations SET status = 'published' WHERE status = 'ready' AND audio_version > 0;