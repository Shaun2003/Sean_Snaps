-- Fix RLS policies for calls and call_signals to enable proper 2-user interactions

-- First, drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view their own calls" ON calls;
DROP POLICY IF EXISTS "Users can create calls" ON calls;
DROP POLICY IF EXISTS "Users can update their calls" ON calls;
DROP POLICY IF EXISTS "Users can view their own signals" ON call_signals;
DROP POLICY IF EXISTS "Users can create signals" ON call_signals;

-- Ensure RLS is enabled
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY;

-- ===== CALLS TABLE POLICIES =====

-- Allow users to view calls where they are either initiator or recipient
CREATE POLICY "Users can view their own calls"
  ON calls FOR SELECT
  USING (auth.uid() = initiator_id OR auth.uid() = recipient_id);

-- Allow users to create calls (as initiator)
CREATE POLICY "Users can create calls"
  ON calls FOR INSERT
  WITH CHECK (auth.uid() = initiator_id);

-- Allow users to update calls they're involved in (both initiator and recipient can update status)
CREATE POLICY "Users can update calls they are involved in"
  ON calls FOR UPDATE
  USING (auth.uid() = initiator_id OR auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = initiator_id OR auth.uid() = recipient_id);

-- ===== CALL_SIGNALS TABLE POLICIES =====

-- Allow users to view signals where they are either sender or receiver
CREATE POLICY "Users can view call signals"
  ON call_signals FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Allow users to insert signals (they are the sender)
CREATE POLICY "Users can create call signals"
  ON call_signals FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

-- Grant access to calls and call_signals for authenticated users
GRANT SELECT, INSERT, UPDATE ON calls TO authenticated;
GRANT SELECT, INSERT ON call_signals TO authenticated;

-- Add notification table for call status updates
CREATE TABLE IF NOT EXISTS call_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('incoming_call', 'call_accepted', 'call_declined', 'call_ended')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(call_id, user_id, notification_type)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_call_notifications_user_id ON call_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_call_notifications_call_id ON call_notifications(call_id);
CREATE INDEX IF NOT EXISTS idx_call_notifications_is_read ON call_notifications(is_read);

-- RLS for call_notifications
ALTER TABLE call_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON call_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON call_notifications FOR INSERT
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON call_notifications TO authenticated;

-- Create a function to notify both users when a call is created
CREATE OR REPLACE FUNCTION notify_call_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify recipient about incoming call
  IF NEW.status IN ('initiating', 'ringing') THEN
    INSERT INTO call_notifications (call_id, user_id, notification_type)
    VALUES (NEW.id, NEW.recipient_id, 'incoming_call')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Notify initiator when call is accepted
  IF NEW.status = 'connected' AND OLD.status IN ('initiating', 'ringing') THEN
    INSERT INTO call_notifications (call_id, user_id, notification_type)
    VALUES (NEW.id, NEW.initiator_id, 'call_accepted')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Notify both users when call ends
  IF NEW.status = 'ended' THEN
    INSERT INTO call_notifications (call_id, user_id, notification_type)
    VALUES (NEW.id, NEW.initiator_id, 'call_ended'), (NEW.id, NEW.recipient_id, 'call_ended')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS call_status_notify_trigger ON calls;

CREATE TRIGGER call_status_notify_trigger
AFTER INSERT OR UPDATE ON calls
FOR EACH ROW
EXECUTE FUNCTION notify_call_status();
