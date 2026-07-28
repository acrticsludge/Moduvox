-- Add viewer_tracking_enabled column to presentations table
-- When enabled (default), viewer actions are tracked (opened, progress, completed, closed)
-- When disabled, no tracking events are recorded
ALTER TABLE presentations ADD COLUMN IF NOT EXISTS viewer_tracking_enabled BOOLEAN DEFAULT true;

-- Update existing rows to have tracking enabled
UPDATE presentations SET viewer_tracking_enabled = true WHERE viewer_tracking_enabled IS NULL;
