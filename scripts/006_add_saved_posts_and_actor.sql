-- Add saved_posts table
CREATE TABLE IF NOT EXISTS saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_posts_user ON saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_post ON saved_posts(post_id);

-- Add actor_id column to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_actor ON notifications(actor_id);
