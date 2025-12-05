-- Fix user_settings table to have user_id column for querying
-- Add user_id column if it doesn't exist (for backwards compatibility)
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Update user_id to match id for existing rows
UPDATE user_settings SET user_id = id WHERE user_id IS NULL;

-- Add the missing columns that the app expects
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notify_likes BOOLEAN DEFAULT TRUE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notify_comments BOOLEAN DEFAULT TRUE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notify_follows BOOLEAN DEFAULT TRUE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notify_messages BOOLEAN DEFAULT TRUE;

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
