-- EMERGENCY FIX: Disable RLS temporarily to fix 500 errors
-- This allows queries to work while we fix the schema

ALTER TABLE conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;

-- Now add the missing columns if they don't exist
ALTER TABLE conversation_participants
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

ALTER TABLE conversation_participants
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);

-- After this works, we can re-enable RLS with proper policies in a future migration
