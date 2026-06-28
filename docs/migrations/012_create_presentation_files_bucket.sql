-- Create presentation-files bucket for storing uploaded PPTX files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('presentation-files', 'presentation-files', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'presentation-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read their own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'presentation-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
