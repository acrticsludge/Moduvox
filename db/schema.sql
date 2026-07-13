-- ============================================================
-- Moduvox — Full Database Schema
-- Generated from migration files in docs/migrations/
-- Run this in your new Supabase project's SQL Editor.
-- ============================================================

-- 1. Users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  gemini_api_key TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Auto-create user row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  color TEXT NOT NULL DEFAULT '#F5F5F5',
  icon TEXT NOT NULL DEFAULT 'FolderKanban',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own projects"
ON projects
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Presentations table
CREATE TABLE IF NOT EXISTS presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'published', 'archived')),
  previous_status TEXT CHECK (previous_status IN ('draft', 'ready', 'published')),
  slide_count INTEGER DEFAULT 0,
  editor_state JSONB DEFAULT '{}'::jsonb,
  share_token UUID DEFAULT gen_random_uuid(),
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  email_gate_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own presentations"
ON presentations
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_presentations_project_id ON presentations(project_id);
CREATE INDEX IF NOT EXISTS idx_presentations_user_id ON presentations(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_presentations_share_token ON presentations(share_token);

-- 4. Voices table
CREATE TABLE voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('preset', 'cloned')),
  preset_id TEXT,
  sample_path TEXT,
  sample_duration_seconds INTEGER,
  preview_audio_path TEXT,
  control_instruction TEXT,
  emotion_default TEXT DEFAULT 'calm',
  is_active BOOLEAN DEFAULT true,
  consent_granted BOOLEAN NOT NULL DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  consent_ip TEXT,
  consent_user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE voices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own voices"
  ON voices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own voices"
  ON voices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voices"
  ON voices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own voices"
  ON voices FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Viewers table
CREATE TABLE IF NOT EXISTS viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  viewer_email TEXT NOT NULL,
  viewer_name TEXT NOT NULL,
  session_token UUID DEFAULT gen_random_uuid(),
  email_verified BOOLEAN DEFAULT false,
  consent_granted BOOLEAN DEFAULT false,
  verification_sent_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  viewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER DEFAULT 0,
  progress_pct NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_viewers_presentation_id ON viewers(presentation_id);
CREATE INDEX IF NOT EXISTS idx_viewers_session_token ON viewers(session_token);
ALTER TABLE viewers ADD CONSTRAINT viewers_presentation_id_email_key UNIQUE (presentation_id, viewer_email);

ALTER TABLE viewers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert viewers"
ON viewers FOR INSERT
WITH CHECK (true);

CREATE POLICY "Owner can read viewers"
ON viewers FOR SELECT
USING (
  auth.uid() = (SELECT user_id FROM presentations WHERE id = viewers.presentation_id)
);

-- 6. Viewer events table
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

ALTER TABLE viewer_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert viewer events"
ON viewer_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Owner can read viewer events"
ON viewer_events FOR SELECT
USING (
  auth.uid() = (SELECT user_id FROM presentations WHERE id = viewer_events.presentation_id)
);

-- 7. Feedback table
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

-- 8. Waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  interest TEXT NOT NULL CHECK (interest IN ('pro', 'team', 'both')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage waitlist" ON waitlist
  FOR ALL USING (auth.role() = 'service_role');

-- 9. Storage bucket for PPTX files (for Supabase Storage — no longer used since R2 migration, kept for reference)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('presentation-files', 'presentation-files', false)
-- ON CONFLICT (id) DO NOTHING;
--
-- CREATE POLICY "Users can upload their own files"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'presentation-files'
--   AND (storage.foldername(name))[1] = auth.uid()::text
-- );
--
-- CREATE POLICY "Users can read their own files"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (
--   bucket_id = 'presentation-files'
--   AND (storage.foldername(name))[1] = auth.uid()::text
-- );

-- ============================================================
-- 10. Narration Versions table
-- ============================================================
CREATE TABLE narration_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  slide_number INTEGER NOT NULL CHECK (slide_number > 0),
  content_hash CHAR(64) NOT NULL,
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

CREATE POLICY "Service role can read all for viewer joins"
  ON narration_versions FOR SELECT
  USING (auth.role() = 'service_role');

-- ============================================================
-- 10. Audit Log table (immutable event stream)
-- ============================================================
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

-- ============================================================
-- Done. 10 tables, RLS enabled on all, auth trigger configured.
-- ============================================================
