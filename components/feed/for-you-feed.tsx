"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Post, Profile } from "@/lib/types"
import { PostCard } from "./post-card"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ForYouFeedProps {
  userId: string
}

interface EnrichedPost extends Post {
  reshared_by?: Profile
  is_saved?: boolean
  similarity_score?: number
}

export function ForYouFeed({ userId }: ForYouFeedProps) {
  const [posts, setPosts] = useState<EnrichedPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchForYouPosts = useCallback(async () => {
    try {
      const supabase = createClient()

      // Get user's interactions
      const { data: userInteractions } = await supabase
        .from("user_interactions")
        .select("post_id, interaction_type")
        .eq("user_id", userId)
        .in("interaction_type", ["like", "share", "save"])

      const likedPostIds = userInteractions
        ?.filter((i: { interaction_type: string }) => i.interaction_type === "like")
        .map((i: { post_id: string }) => i.post_id) || []

      // Get posts from users that current user interacted with
      const { data: interactedUsers } = await supabase
        .from("posts")
        .select("user_id")
        .in("id", likedPostIds)
        .limit(100)

      const interactedUserIds = [...new Set(interactedUsers?.map((p: { user_id: string }) => p.user_id) || [])]

      // Get saved post IDs
      const { data: savedPostIds } = await supabase
        .from("saved_posts")
        .select("post_id")
        .eq("user_id", userId)

      const savedIds = new Set(savedPostIds?.map((s: { post_id: string }) => s.post_id) || [])

      // Fetch recommended posts - if user has interactions, use them; otherwise get all posts
      let recommendedPosts
      if (interactedUserIds.length > 0) {
        const { data } = await supabase
          .from("posts")
          .select(`
            *,
            profiles (*),
            post_likes (id, user_id),
            comments (id),
            post_shares (id),
            post_reactions (id, emoji),
            post_media (*)
          `)
          .in("user_id", interactedUserIds)
          .neq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50)
        recommendedPosts = data
      } else {
        // If no interactions, show recent posts from other users
        const { data } = await supabase
          .from("posts")
          .select(`
            *,
            profiles (*),
            post_likes (id, user_id),
            comments (id),
            post_shares (id),
            post_reactions (id, emoji),
            post_media (*)
          `)
          .neq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50)
        recommendedPosts = data
      }

      if (recommendedPosts && recommendedPosts.length > 0) {
        const enrichedPosts = recommendedPosts
          .filter((post: any) => !likedPostIds.includes(post.id))
          .map((post: any) => ({
            ...post,
            likes_count: post.post_likes?.length || 0,
            comments_count: post.comments?.length || 0,
            shares_count: post.post_shares?.length || 0,
            reactions_count: post.post_reactions?.length || 0,
            is_liked: post.post_likes?.some((like: { user_id: string }) => like.user_id === userId) || false,
            is_saved: savedIds.has(post.id),
          }))
          .sort((a: any, b: any) => {
            // Sort by engagement score
            const scoreA = a.likes_count + a.comments_count * 2 + a.reactions_count
            const scoreB = b.likes_count + b.comments_count * 2 + b.reactions_count
            return scoreB - scoreA
          })

        setPosts(enrichedPosts)
      }
      setError(null)
    } catch (err) {
      console.error("Error fetching For You feed:", err)
      setError("Failed to load personalized feed")
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchForYouPosts()
  }, [fetchForYouPosts])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Personalizing your feed...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Button onClick={fetchForYouPosts}>Try Again</Button>
        </div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">
          No personalized recommendations yet. Like and interact with more posts to get better suggestions!
        </p>
        <Button onClick={fetchForYouPosts} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Feed
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
        {posts.map((post, index) => (
          <div key={`${post.id}-${index}`} className="pt-4 first:pt-0">
            <PostCard post={post} currentUserId={userId} onUpdate={fetchForYouPosts} />
          </div>
        ))}
      </div>
    </div>
  )
}
