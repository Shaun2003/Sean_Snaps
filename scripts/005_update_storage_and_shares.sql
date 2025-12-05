-- Increase avatar bucket size limit to 10MB and add is_reshare column to post_shares
UPDATE storage.buckets 
SET file_size_limit = 10485760 
WHERE id = 'avatars';

-- Add is_reshare column to post_shares if not exists
ALTER TABLE post_shares ADD COLUMN IF NOT EXISTS is_reshare BOOLEAN DEFAULT FALSE;

-- Add website column to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website TEXT;
