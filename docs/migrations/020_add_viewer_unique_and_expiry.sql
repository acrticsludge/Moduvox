-- Add UNIQUE constraint for viewer dedup
ALTER TABLE viewers ADD CONSTRAINT viewers_presentation_id_email_key UNIQUE (presentation_id, viewer_email);

-- Add verification_sent_at column for magic link expiry
ALTER TABLE viewers ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill verification_sent_at for existing rows
UPDATE viewers SET verification_sent_at = created_at WHERE verification_sent_at IS NULL;
