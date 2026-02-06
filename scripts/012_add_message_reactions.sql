-- Add reactions column to messages table if it doesn't exist
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}'::jsonb;

-- Create index on reactions for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_reactions ON messages USING gin(reactions);

-- Add comment to explain the reactions structure
COMMENT ON COLUMN messages.reactions IS 'JSON object mapping emoji to array of user IDs who reacted with that emoji. Example: {"👍": ["user_id_1", "user_id_2"], "❤️": ["user_id_1"]}';
