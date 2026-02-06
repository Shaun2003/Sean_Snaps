-- Add reply functionality to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;

-- Add view once functionality
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS is_view_once BOOLEAN DEFAULT false;

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS is_viewed BOOLEAN DEFAULT false;

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP WITH TIME ZONE;

-- Create index for reply lookups
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON messages(reply_to_id);

-- Create index for view once queries
CREATE INDEX IF NOT EXISTS idx_messages_is_view_once ON messages(is_view_once);
