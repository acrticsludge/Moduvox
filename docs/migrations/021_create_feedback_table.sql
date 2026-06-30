-- Create feedback table for public submissions
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('bug_report', 'feature_request', 'general')),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  message TEXT NOT NULL,
  can_contact BOOLEAN DEFAULT false,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_ip ON feedback(ip_address, created_at);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert feedback"
ON feedback FOR INSERT
WITH CHECK (true);

CREATE POLICY "Owner can read feedback"
ON feedback FOR SELECT
USING (auth.uid() IN (SELECT id FROM auth.users LIMIT 1));
