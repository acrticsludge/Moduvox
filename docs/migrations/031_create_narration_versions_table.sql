-- docs/migrations/031_create_narration_versions_table.sql
-- Create narration_versions table for slide-level narration versioning with approval workflow

CREATE TABLE narration_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  slide_number INTEGER NOT NULL CHECK (slide_number > 0),
  content_hash CHAR(64) NOT NULL,  -- SHA-256 hex of narration_text
  narration_text TEXT NOT NULL,
  voice_id UUID REFERENCES voices(id) ON DELETE SET NULL,
  voice_type TEXT CHECK (voice_type IN ('preset', 'cloned')),
  voice_name TEXT,
  control_instruction TEXT,
  ultimate_mode BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'published')),
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  UNIQUE (presentation_id, slide_number, generated_at)
);

CREATE INDEX idx_narration_versions_presentation_slide
  ON narration_versions (presentation_id, slide_number, generated_at DESC);

CREATE INDEX idx_narration_versions_status
  ON narration_versions (status, generated_at DESC);

ALTER TABLE narration_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can CRUD narration versions"
  ON narration_versions
  USING (auth.uid() = (
    SELECT user_id FROM presentations WHERE id = narration_versions.presentation_id
  ))
  WITH CHECK (auth.uid() = (
    SELECT user_id FROM presentations WHERE id = narration_versions.presentation_id
  ));

-- Viewers can only read published versions via RPC/join
CREATE POLICY "Service role can read all for viewer joins"
  ON narration_versions FOR SELECT
  USING (auth.role() = 'service_role');