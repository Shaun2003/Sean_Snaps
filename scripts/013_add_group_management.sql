-- Add admin tracking to conversation_participants table
ALTER TABLE conversation_participants
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Add is_hidden column if not exists
ALTER TABLE conversation_participants
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_admin ON conversation_participants(is_admin) WHERE is_admin = TRUE;

-- IMPORTANT: RLS policies should be added AFTER columns exist and app is working
-- For now, we're just adding the columns needed for group management
-- RLS security policies can be added later in a separate migration
