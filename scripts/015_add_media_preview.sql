-- Add file_name column to messages table for media previews
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS file_name TEXT;

-- This column will store the original filename of uploaded files
-- Useful for displaying readable names in media previews
