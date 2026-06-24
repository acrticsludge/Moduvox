-- docs/migrations/004_voices_table.sql

-- 1. Create voices table
CREATE TABLE voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('preset', 'cloned')),
  clone_mode TEXT CHECK (clone_mode IN ('standard', 'ultimate')),
  sample_path TEXT,
  sample_duration_seconds INTEGER,
  emotion_default TEXT DEFAULT 'calm',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE voices ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies
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

-- 4. Create Storage bucket for voice samples
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-samples', 'voice-samples', false);

-- 5. Storage RLS: users can CRUD their own files
CREATE POLICY "Users can read own voice samples"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'voice-samples' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own voice samples"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'voice-samples' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own voice samples"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'voice-samples' AND auth.uid()::text = (storage.foldername(name))[1]);
