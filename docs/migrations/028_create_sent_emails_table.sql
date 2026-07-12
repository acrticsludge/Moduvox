-- Create sent_emails audit log table
-- Tracks every transactional email sent by the system for debugging,
-- abuse detection, and billing reconciliation.

CREATE TABLE sent_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  email_type TEXT NOT NULL CHECK (email_type IN ('welcome', 'magic_link', 'feedback_notification')),
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for looking up by user
CREATE INDEX IF NOT EXISTS idx_sent_emails_user ON sent_emails(user_id, created_at DESC);

-- Index for checking daily caps per email type
CREATE INDEX IF NOT EXISTS idx_sent_emails_type ON sent_emails(email_type, created_at DESC);

-- Index for abuse detection by recipient
CREATE INDEX IF NOT EXISTS idx_sent_emails_recipient ON sent_emails(to_email, created_at DESC);

ALTER TABLE sent_emails ENABLE ROW LEVEL SECURITY;

-- Admin-only access (service role)
CREATE POLICY "Admin full access"
ON sent_emails
FOR ALL
USING (true);
