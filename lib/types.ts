export interface Profile {
  id: string
  username: string | null
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  user_id: string
  content: string | null
  image_url: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
  post_likes?: PostLike[]
  comments?: Comment[]
  post_shares?: PostShare[]
  likes_count?: number
  comments_count?: number
  shares_count?: number
  is_liked?: boolean
}

export interface PostLike {
  id: string
  post_id: string
  user_id: string
  created_at: string
  profiles?: Profile
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  parent_id: string | null
  content: string
  created_at: string
  updated_at: string
  profiles?: Profile
  comment_reactions?: CommentReaction[]
  replies?: Comment[]
}

export interface CommentReaction {
  id: string
  comment_id: string
  user_id: string
  reaction_type: "like" | "love" | "laugh" | "care" | "finger"
  created_at: string
}

export interface PostShare {
  id: string
  post_id: string
  user_id: string
  shared_to_user_id: string | null
  is_reshare: boolean
  created_at: string
  profiles?: Profile
}

export interface Follower {
  id: string
  follower_id: string
  following_id: string
  created_at: string
  follower?: Profile
  following?: Profile
}

export interface Conversation {
  id: string
  name: string | null
  is_group: boolean
  created_at: string
  updated_at: string
  participants?: ConversationParticipant[]
  messages?: Message[]
  unread_count?: number
}

export interface ConversationParticipant {
  id: string
  conversation_id: string
  user_id: string
  joined_at: string
  last_read_at: string
  profiles?: Profile
}

export interface Message {
  id: string
  conversation_id: string
  user_id: string
  content: string | null
  file_url: string | null
  file_type: string | null
  is_edited: boolean
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface CallHistory {
  id: string
  conversation_id: string
  caller_id: string
  call_type: "voice" | "video"
  status: "missed" | "answered" | "declined"
  duration: number
  created_at: string
  caller?: Profile
  conversation?: Conversation
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  content: string | null
  reference_id: string | null
  reference_type: string | null
  is_read: boolean
  created_at: string
}

export interface Story {
  id: string
  user_id: string
  image_url: string | null
  content: string | null
  created_at: string
  expires_at: string
  profiles?: Profile
  story_views?: StoryView[]
  is_viewed?: boolean
}

export interface StoryView {
  id: string
  story_id: string
  user_id: string
  viewed_at: string
}

export interface UserSettings {
  id: string
  theme: "light" | "dark" | "system"
  notifications_enabled: boolean
  message_notifications: boolean
  email_notifications: boolean
  private_account: boolean
  show_activity_status: boolean
  created_at: string
  updated_at: string
}
