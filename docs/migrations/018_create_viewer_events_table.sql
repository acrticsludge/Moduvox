-- Create viewer_events table for tracking
CREATE TABLE IF NOT EXISTS viewer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES viewers(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('opened', 'slide_viewed', 'completed', 'closed')),
  slide_number INTEGER,
  progress_pct NUMERIC(5,2),
  time_spent_seconds INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_viewer_events_presentation ON viewer_events(presentation_id);
CREATE INDEX IF NOT EXISTS idx_viewer_events_viewer ON viewer_events(viewer_id);
