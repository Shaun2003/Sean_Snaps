-- Add is_private column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
