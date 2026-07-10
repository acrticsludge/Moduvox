-- Performance indexes identified by codebase audit

-- voices.user_id is queried with .eq() on every voice list/fetch — no index existed
CREATE INDEX IF NOT EXISTS idx_voices_user_id ON voices(user_id);

-- viewers.ip_address is queried with .eq() in gate route for rate limiting
CREATE INDEX IF NOT EXISTS idx_viewers_ip_address ON viewers(ip_address);

-- viewers.verification_sent_at is queried with .gte() for daily email cap
CREATE INDEX IF NOT EXISTS idx_viewers_verification_sent_at ON viewers(verification_sent_at);

-- viewer_events.presentation_id + created_at composite for rate limiting
-- The track route queries .eq("presentation_id") + .gte("created_at") together
CREATE INDEX IF NOT EXISTS idx_viewer_events_presentation_created
  ON viewer_events(presentation_id, created_at);
