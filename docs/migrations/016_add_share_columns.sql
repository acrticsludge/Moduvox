-- Add sharing-related columns to presentations table
ALTER TABLE presentations ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT gen_random_uuid();
ALTER TABLE presentations ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE presentations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE presentations ADD COLUMN IF NOT EXISTS email_gate_enabled BOOLEAN DEFAULT true;

-- Backfill share_token for existing rows that may have gotten NULL
UPDATE presentations SET share_token = gen_random_uuid() WHERE share_token IS NULL;

-- Unique index for fast lookups on share_token
CREATE UNIQUE INDEX IF NOT EXISTS idx_presentations_share_token ON presentations(share_token);
