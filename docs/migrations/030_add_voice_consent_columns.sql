-- docs/migrations/030_add_voice_consent_columns.sql
-- Add voice clone consent tracking columns

ALTER TABLE voices
  ADD COLUMN IF NOT EXISTS consent_granted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_ip TEXT,
  ADD COLUMN IF NOT EXISTS consent_user_agent TEXT;

-- Backfill existing cloned voices (grandfathered - they were created before consent tracking)
UPDATE voices
SET consent_granted = true,
    consent_timestamp = created_at
WHERE type = 'cloned' AND consent_granted = false;

-- Add comments for documentation
COMMENT ON COLUMN voices.consent_granted IS 'Whether user explicitly consented to voice cloning';
COMMENT ON COLUMN voices.consent_timestamp IS 'When consent was granted';
COMMENT ON COLUMN voices.consent_ip IS 'IP address of user who granted consent';
COMMENT ON COLUMN voices.consent_user_agent IS 'User agent of user who granted consent';