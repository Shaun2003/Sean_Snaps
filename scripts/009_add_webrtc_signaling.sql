-- WebRTC signaling table for call offer/answer exchange
CREATE TABLE IF NOT EXISTS call_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL,
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate')),
  signal_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Call information table
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video')),
  status TEXT NOT NULL DEFAULT 'initiating' CHECK (status IN ('initiating', 'ringing', 'connected', 'ended')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_call_signals_call_id ON call_signals(call_id);
CREATE INDEX IF NOT EXISTS idx_call_signals_to_user_id ON call_signals(to_user_id);
CREATE INDEX IF NOT EXISTS idx_calls_conversation_id ON calls(conversation_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);

-- RLS policies for call_signals
ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own signals"
  ON call_signals FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create signals"
  ON call_signals FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

-- RLS policies for calls
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calls"
  ON calls FOR SELECT
  USING (auth.uid() = initiator_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create calls"
  ON calls FOR INSERT
  WITH CHECK (auth.uid() = initiator_id);

CREATE POLICY "Users can update their own calls"
  ON calls FOR UPDATE
  USING (auth.uid() = initiator_id OR auth.uid() = recipient_id);
