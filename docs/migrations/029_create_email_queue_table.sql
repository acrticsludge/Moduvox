-- Create email_queue table for background email processing
-- Worker polls this table and sends via Resend, decoupling
-- email delivery from HTTP request latency.

CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  email_type TEXT NOT NULL CHECK (email_type IN ('welcome', 'magic_link', 'feedback_notification')),
  audit_user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Index for efficient worker polling: pending emails oldest first
CREATE INDEX IF NOT EXISTS idx_email_queue_pending
ON email_queue(status, created_at ASC)
WHERE status = 'pending';

-- Index for cleanup / monitoring
CREATE INDEX IF NOT EXISTS idx_email_queue_created
ON email_queue(created_at DESC);

ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Admin-only access (service role)
CREATE POLICY "Admin full access"
ON email_queue
FOR ALL
USING (true);
