-- 022_create_waitlist_table.sql
-- Captures user interest in paid tiers when free tier limits are hit

CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  interest TEXT NOT NULL CHECK (interest IN ('pro', 'team', 'both')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Only admins (service_role) can manage the waitlist
CREATE POLICY "Admins can manage waitlist" ON waitlist
  FOR ALL USING (auth.role() = 'service_role');
