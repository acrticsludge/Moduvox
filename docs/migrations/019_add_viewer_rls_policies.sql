-- Enable RLS on viewers and viewer_events
ALTER TABLE viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE viewer_events ENABLE ROW LEVEL SECURITY;

-- Viewers: anyone can insert (public gate endpoint)
CREATE POLICY "Anyone can insert viewers"
ON viewers FOR INSERT
WITH CHECK (true);

-- Viewers: owner can read (viewer dashboard)
CREATE POLICY "Owner can read viewers"
ON viewers FOR SELECT
USING (
  auth.uid() = (SELECT user_id FROM presentations WHERE id = viewers.presentation_id)
);

-- Viewer events: anyone can insert (public tracking endpoint)
CREATE POLICY "Anyone can insert viewer events"
ON viewer_events FOR INSERT
WITH CHECK (true);

-- Viewer events: owner can read (viewer dashboard)
CREATE POLICY "Owner can read viewer events"
ON viewer_events FOR SELECT
USING (
  auth.uid() = (SELECT user_id FROM presentations WHERE id = viewer_events.presentation_id)
);
