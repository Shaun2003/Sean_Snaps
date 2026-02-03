/*
MIGRATION: Fix comment_reactions table to support emoji reactions
This script fixes the comment_reactions table schema to match post_reactions,
changing from reaction_type (like, love, laugh, care, finger) to emoji (❤️, 😂, etc.)

IMPORTANT: This migration will:
1. Drop the existing comment_reactions table (CASCADE deletes all data)
2. Create a new comment_reactions table with emoji column
3. Set up proper RLS policies
4. Create indexes for performance

Execute this in Supabase SQL Editor before using the app.
*/

-- First, check if the table has the old schema and backup data if needed
-- This is informational only, comment out if you want to preserve existing data

-- Drop the old comment_reactions table and recreate it with emoji column
DROP TABLE IF EXISTS comment_reactions CASCADE;

-- Recreate comment_reactions table with emoji column like post_reactions
-- Schema matches post_reactions for consistency:
-- id, table_id (post/comment), user_id, emoji, created_at, with unique constraint
CREATE TABLE IF NOT EXISTS comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id, emoji)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON comment_reactions(user_id);

-- Enable RLS
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comment_reactions
-- Allow users to read all reactions (public read)
CREATE POLICY "Allow read comment reactions"
  ON comment_reactions FOR SELECT
  USING (true);

-- Allow users to insert their own reactions
CREATE POLICY "Allow insert own comment reactions"
  ON comment_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own reactions  
CREATE POLICY "Allow delete own comment reactions"
  ON comment_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Optional: Allow update of reactions (in case needed later)
CREATE POLICY "Allow update own comment reactions"
  ON comment_reactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
