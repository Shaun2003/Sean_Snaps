"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { createNotification } from "@/lib/notifications"
import { Button } from "@/components/ui/button"
import { Settings, Grid3X3, MessageCircle, Lock } from "lucide-react"
import type { Profile, Post } from "@/lib/types"
import { useRouter } from "next/navigation"

interface ProfileViewProps {
  profile: Profile | null
  posts: Post[]
  followersCount: number
  followingCount: number
  isOwnProfile: boolean
  isFollowing?: boolean
  currentUserId?: string
}

export function ProfileView({
  profile,
  posts,
  followersCount,
  followingCount,
  isOwnProfile,
  isFollowing = false,
  currentUserId,
}: ProfileViewProps) {
  const [following, setFollowing] = useState(isFollowing)
  const [followers, setFollowers] = useState(followersCount)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const isPrivateAndNotFollowing = profile?.is_private && !isOwnProfile && !following

  const handleFollow = async () => {
    if (!currentUserId || !profile) return
    setIsLoading(true)
    const supabase = createClient()

    try {
      if (following) {
        await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", profile.id)
        setFollowers((prev) => prev - 1)
      } else {
        await supabase.from("follows").insert({
          follower_id: currentUserId,
          following_id: profile.id,
        })
        setFollowers((prev) => prev + 1)

        // Create notification for followed user
        await createNotification({
          userId: profile.id,
          actorId: currentUserId,
          type: "follow",
        })
      }
      setFollowing(!following)
    } catch (error) {
      console.error("Error following/unfollowing:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMessage = async () => {
    if (!currentUserId || !profile) return
    const supabase = createClient()

    // Check if conversation exists
    const { data: existingConversations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", currentUserId)

    if (existingConversations && existingConversations.length > 0) {
      const conversationIds = existingConversations.map((c) => c.conversation_id)

      const { data: sharedConversation } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", profile.id)
        .in("conversation_id", conversationIds)
        .single()

      if (sharedConversation) {
        router.push(`/messages/${sharedConversation.conversation_id}`)
        return
      }
    }

    // Create new conversation
    const { data: newConversation } = await supabase.from("conversations").insert({}).select().single()

    if (newConversation) {
      await supabase.from("conversation_participants").insert([
        { conversation_id: newConversation.id, user_id: currentUserId },
        { conversation_id: newConversation.id, user_id: profile.id },
      ])
      router.push(`/messages/${newConversation.id}`)
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Profile header */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10 mb-8">
        <div className="shrink-0">
          <div className="h-24 w-24 md:h-36 md:w-36 rounded-full overflow-hidden bg-secondary">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url || "/placeholder.svg"}
                alt={profile.username || "User"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-3xl md:text-4xl font-semibold text-muted-foreground">
                {(profile.username || profile.full_name || "U").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">@{profile.username}</h1>
              {profile.is_private && <Lock className="h-4 w-4 text-muted-foreground" />}
            </div>
            {isOwnProfile ? (
              <div className="flex gap-2">
                <Button asChild variant="secondary" size="sm">
                  <Link href="/profile/edit">Edit Profile</Link>
                </Button>
                <Button asChild variant="ghost" size="icon">
                  <Link href="/settings">
                    <Settings className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleFollow}
                  disabled={isLoading}
                  variant={following ? "secondary" : "default"}
                  size="sm"
                >
                  {following ? "Following" : "Follow"}
                </Button>
                <Button onClick={handleMessage} variant="secondary" size="sm">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-center md:justify-start gap-8 mb-4">
            <div className="text-center">
              <span className="font-semibold">{isPrivateAndNotFollowing ? "-" : posts.length}</span>
              <p className="text-sm text-muted-foreground">posts</p>
            </div>
            <div className="text-center">
              <span className="font-semibold">{followers}</span>
              <p className="text-sm text-muted-foreground">followers</p>
            </div>
            <div className="text-center">
              <span className="font-semibold">{followingCount}</span>
              <p className="text-sm text-muted-foreground">following</p>
            </div>
          </div>

          {profile.full_name && <p className="font-semibold">{profile.full_name}</p>}
          {profile.bio && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>}
        </div>
      </div>

      {/* Posts grid */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-center gap-2 mb-4 text-sm font-medium">
          <Grid3X3 className="h-4 w-4" />
          <span>Posts</span>
        </div>

        {isPrivateAndNotFollowing ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-foreground mb-4">
              <Lock className="h-10 w-10" />
            </div>
            <h2 className="text-xl font-semibold mb-2">This Account is Private</h2>
            <p className="text-muted-foreground">Follow this account to see their photos and videos.</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No posts yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {posts.map((post) => (
              <Link key={post.id} href={`/post/${post.id}`} className="aspect-square bg-secondary overflow-hidden">
                {post.image_url ? (
                  <img
                    src={post.image_url || "/placeholder.svg"}
                    alt={post.caption || "Post"}
                    className="h-full w-full object-cover hover:opacity-90 transition-opacity"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center p-2">
                    <p className="text-xs text-muted-foreground line-clamp-3 text-center">{post.caption}</p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
