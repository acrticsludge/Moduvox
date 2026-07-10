-- Legal compliance columns for users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tos_version TEXT DEFAULT '1.0';
ALTER TABLE users ADD COLUMN IF NOT EXISTS cookies_accepted_at TIMESTAMPTZ;
