-- docs/migrations/033_add_published_status_v2.sql
-- Safe migration: adds 'published' status if not already present
-- Run this in Supabase SQL Editor

-- 1. Drop existing constraints if they exist (safe - will error if not exist, so use DO block)
DO $$
BEGIN
  -- Drop status check constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'presentations_status_check'
  ) THEN
    ALTER TABLE presentations DROP CONSTRAINT presentations_status_check;
  END IF;
  
  -- Drop previous_status check constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'presentations_previous_status_check'
  ) THEN
    ALTER TABLE presentations DROP CONSTRAINT presentations_previous_status_check;
  END IF;
END $$;

-- 2. Add new constraints with published status
ALTER TABLE presentations
  ADD CONSTRAINT presentations_status_check
  CHECK (status IN ('draft', 'ready', 'published', 'archived'));

ALTER TABLE presentations
  ADD CONSTRAINT presentations_previous_status_check
  CHECK (previous_status IN ('draft', 'ready', 'published'));

-- 3. Backfill: set status='published' for presentations that have audio generated
-- (optional - only if you want existing 'ready' with audio to become 'published')
-- UPDATE presentations 
-- SET status = 'published' 
-- WHERE status = 'ready' 
--   AND audio_version > 0;

-- 4. Verify
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'presentations'::regclass 
AND contype = 'c';