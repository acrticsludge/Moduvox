-- Add audio_version column for change detection on the view page
ALTER TABLE presentations ADD COLUMN IF NOT EXISTS audio_version INTEGER NOT NULL DEFAULT 0;

-- RPC: atomically increment a presentation's audio_version
CREATE OR REPLACE FUNCTION increment_audio_version(p_presentation_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE presentations
  SET audio_version = audio_version + 1
  WHERE id = p_presentation_id;
END;
$$ LANGUAGE plpgsql;
