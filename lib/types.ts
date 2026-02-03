export interface Profile {
  id: string
  username: string | null
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  is_private: boolean
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  user_id: string
  image_url: string | null
  caption: string | null
  created_at: string
  profiles?: Profile
  likes?: Like[]
  comments?: Comment[]
  likes_count?: number
  comments_count?: number
  is_liked?: boolean
}

export interface Like {
  id: string
  user_id: string
  post_id: string
  created_at: string
}

export interface Comment {
  id: string
  user_id: string
  post_id: string
  content: string
  created_at: string
  profiles?: Profile
}

export interface Story {
  id: string
  user_id: string
  image_url: string | null
  text_content: string | null
  created_at: string
  expires_at: string
  profiles?: Profile
}

export interface Conversation {
  id: string
  created_at: string
  updated_at: string
  participants?: ConversationParticipant[]
  messages?: Message[]
  other_user?: Profile
  last_message?: Message
}

export interface ConversationParticipant {
  id: string
  conversation_id: string
  user_id: string
  profiles?: Profile
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  read_at: string | null
  profiles?: Profile
}

export interface Follow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  actor_id: string
  type: "like" | "comment" | "follow"
  post_id: string | null
  comment_id: string | null
  message: string | null
  read: boolean
  created_at: string
  actor?: Profile
  post?: Post
}
