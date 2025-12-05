-- Create storage buckets for the Instagram clone app
-- This script creates all necessary storage buckets and their access policies

-- Create avatars bucket for profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create posts bucket for post images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'posts',
  'posts',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Create stories bucket for story media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stories',
  'stories',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Create messages bucket for message attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'messages',
  'messages',
  true,
  20971520, -- 20MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'application/pdf', 'audio/mpeg', 'audio/wav']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies for posts bucket
CREATE POLICY "Anyone can view posts"
ON storage.objects FOR SELECT
USING (bucket_id = 'posts');

CREATE POLICY "Authenticated users can upload posts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'posts');

CREATE POLICY "Users can update their own post files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'posts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own post files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'posts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies for stories bucket
CREATE POLICY "Anyone can view stories"
ON storage.objects FOR SELECT
USING (bucket_id = 'stories');

CREATE POLICY "Authenticated users can upload stories"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'stories');

CREATE POLICY "Users can update their own story files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own story files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies for messages bucket
CREATE POLICY "Anyone can view message attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'messages');

CREATE POLICY "Authenticated users can upload message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'messages');

CREATE POLICY "Users can update their own message files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'messages' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own message files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'messages' AND (storage.foldername(name))[1] = auth.uid()::text);
