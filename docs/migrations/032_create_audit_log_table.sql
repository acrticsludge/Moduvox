-- docs/migrations/032_create_audit_log_table.sql
-- Create audit_log table for immutable event stream

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  slide_number INTEGER, -- NULL = presentation-level event
  action TEXT NOT NULL CHECK (action IN (
    'narration_generated', 'narration_edited', 'audio_generated', 'audio_regenerated',
    'voice_changed', 'voice_settings_changed',
    'submitted_for_review', 'approved', 'rejected', 'published', 'unpublished',
    'archived', 'slide_reordered', 'slide_added', 'slide_removed', 'pptx_reuploaded'
  )),
  actor_user_id UUID REFERENCES auth.users(id),
  actor_role TEXT CHECK (actor_role IN ('owner', 'collaborator', 'viewer', 'system')),
  previous_state JSONB,
  new_state JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_presentation_time
  ON audit_log (presentation_id, created_at DESC);

CREATE INDEX idx_audit_log_actor_time
  ON audit_log (actor_user_id, created_at DESC);

CREATE INDEX idx_audit_log_action_time
  ON audit_log (action, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read audit log"
  ON audit_log FOR SELECT
  USING (auth.uid() = (
    SELECT user_id FROM presentations WHERE id = audit_log.presentation_id
  ));

CREATE POLICY "System can insert audit log"
  ON audit_log FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = (
    SELECT user_id FROM presentations WHERE id = audit_log.presentation_id
  ));