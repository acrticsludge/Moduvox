-- Create viewers table for email-gated tracking
CREATE TABLE IF NOT EXISTS viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  viewer_email TEXT NOT NULL,
  viewer_name TEXT NOT NULL,
  session_token UUID DEFAULT gen_random_uuid(),
  email_verified BOOLEAN DEFAULT false,
  consent_granted BOOLEAN DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  viewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER DEFAULT 0,
  progress_pct NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_viewers_presentation_id ON viewers(presentation_id);
CREATE INDEX IF NOT EXISTS idx_viewers_session_token ON viewers(session_token);
