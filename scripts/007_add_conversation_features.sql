-- Add is_hidden column to conversation_participants
ALTER TABLE conversation_participants
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Add theme and video_url columns to posts
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS theme TEXT,
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add typing_at column to conversation_participants for typing indicators
ALTER TABLE conversation_participants
ADD COLUMN IF NOT EXISTS typing_at TIMESTAMPTZ;

-- Add disappearing_messages settings to conversations
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS disappearing_messages BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS disappearing_duration INTEGER DEFAULT 86400; -- 24 hours in seconds

-- Add expires_at to messages for disappearing messages
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
