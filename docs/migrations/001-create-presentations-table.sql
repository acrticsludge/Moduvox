-- Create presentations table
CREATE TABLE IF NOT EXISTS presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'archived')),
  slide_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;

-- RLS: users can CRUD their own presentations
CREATE POLICY "Users can CRUD own presentations"
ON presentations
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Index for listing presentations by project
CREATE INDEX idx_presentations_project_id ON presentations(project_id);

-- Index for listing presentations by user
CREATE INDEX idx_presentations_user_id ON presentations(user_id);
