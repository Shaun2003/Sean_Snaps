-- Add voice_notes bucket for storing voice message recordings
-- This will create the bucket if it doesn't exist, or update MIME types if it does
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice_notes',
  'voice_notes',
  true,
  10485760, -- 10MB limit
  ARRAY['audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg']
)
ON CONFLICT (id) DO UPDATE SET 
  allowed_mime_types = ARRAY['audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg'];

-- Storage policies for voice_notes bucket
CREATE POLICY "Anyone can view voice notes"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice_notes');

CREATE POLICY "Authenticated users can upload voice notes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'voice_notes');

CREATE POLICY "Users can delete their own voice notes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'voice_notes' AND (storage.foldername(name))[1] = auth.uid()::text);
