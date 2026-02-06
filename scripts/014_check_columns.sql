-- Check if columns exist in conversation_participants table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'conversation_participants' 
ORDER BY ordinal_position;
