"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Post, Profile } from "@/lib/types"
import { PostCard } from "./post-card"
import { PostDetailDialog } from "@/components/explore/post-detail-dialog"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FeedContentProps {
  userId: string
}

interface EnrichedPost extends Post {
  reshared_by?: Profile
  original_post?: Post & { profiles: Profile }
  is_saved?: boolean
}

export function FeedContent({ userId }: FeedContentProps) {
  const [posts, setPosts] = useState<EnrichedPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPost, setSelectedPost] = useState<EnrichedPost | null>(null)

  const fetchPosts = useCallback(async () => {
    try {
      const supabase = createClient()

      const { data: following, error: followingError } = await supabase
        .from("followers")
        .select("following_id")
        .eq("follower_id", userId)

      if (followingError) {
        console.log("[v0] Error fetching following:", followingError)
      }

      const followingIds = following?.map((f: any) => f.following_id) || []
      const allowedUserIds = [userId, ...followingIds]

      const { data: savedPostIds } = await supabase.from("saved_posts").select("post_id").eq("user_id", userId)
      const savedIds = new Set(savedPostIds?.map((s: any) => s.post_id) || [])

      const { data: regularPosts, error: postsError } = await supabase
        .from("posts")
        .select(`
        *,
        profiles!posts_user_id_fkey(*),
        post_likes (id, user_id, profiles (id, username, avatar_url)),
        comments (id),
        post_shares (id)
      `)
        .in("user_id", allowedUserIds)
        .order("created_at", { ascending: false })
        .limit(50)

      if (postsError) {
        console.log("[v0] Error fetching posts:", postsError)
      }

      const { data: reshares } = await supabase
        .from("post_shares")
        .select(`
        *,
        resharer:profiles!post_shares_user_id_fkey (*),
        post:posts (
          *,
          profiles!posts_user_id_fkey(*),
          post_likes (id, user_id, profiles (id, username, avatar_url)),
          comments (id),
          post_shares (id)
        )
      `)
        .in("user_id", allowedUserIds)
        .eq("is_reshare", true)
        .order("created_at", { ascending: false })
        .limit(20)

      const allPosts: EnrichedPost[] = []

      if (regularPosts) {
        regularPosts.forEach((post: any) => {
          allPosts.push({
            ...post,
            likes_count: post.post_likes?.length || 0,
            comments_count: post.comments?.length || 0,
            shares_count: post.post_shares?.length || 0,
            is_liked: post.post_likes?.some((like: { user_id: string }) => like.user_id === userId) || false,
            is_saved: savedIds.has(post.id),
          })
        })
      }

      if (reshares) {
        reshares.forEach((reshare: any) => {
          if (reshare.post) {
            allPosts.push({
              ...reshare.post,
              likes_count: reshare.post.post_likes?.length || 0,
              comments_count: reshare.post.comments?.length || 0,
              shares_count: reshare.post.post_shares?.length || 0,
              is_liked: reshare.post.post_likes?.some((like: { user_id: string }) => like.user_id === userId) || false,
              is_saved: savedIds.has(reshare.post.id),
              reshared_by: reshare.resharer,
              created_at: reshare.created_at,
            })
          }
        })
      }

      const uniquePosts = allPosts
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .filter(
          (post, index, self) =>
            index === self.findIndex((p) => p.id === post.id && p.reshared_by?.id === post.reshared_by?.id),
        )

      setPosts(uniquePosts)
      setError(null)
    } catch (err) {
      console.error("[v0] Feed content error:", err)
      setError("Unable to load feed. This may be due to network issues in the preview environment.")
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchPosts()

    try {
      const supabase = createClient()
      const channel = supabase
        .channel("posts-feed")
        .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => fetchPosts())
        .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, () => fetchPosts())
        .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => fetchPosts())
        .on("postgres_changes", { event: "*", schema: "public", table: "post_shares" }, () => fetchPosts())
        .on("postgres_changes", { event: "*", schema: "public", table: "saved_posts" }, () => fetchPosts())
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    } catch (err) {
      console.log("[v0] Error setting up realtime:", err)
    }
  }, [fetchPosts])

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 sm:py-12 px-4">
        <p className="text-sm sm:text-base text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12 px-4">
        <p className="text-sm sm:text-base text-muted-foreground">No posts yet. Follow people to see their posts!</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col items-center gap-3 sm:gap-4 px-0 sm:px-2 animate-in fade-in duration-500">
        {posts.map((post, index) => (
          <div key={`${post.id}-${post.reshared_by?.id || index}`} className="w-full max-w-lg transition-all duration-200 hover:scale-[1.01]">
            <PostCard 
              post={post} 
              currentUserId={userId} 
              onUpdate={fetchPosts}
              onPostClick={() => setSelectedPost(post)}
            />
          </div>
        ))}
      </div>

      {selectedPost && (
        <PostDetailDialog
          post={selectedPost as Post & { profiles: Profile; likes_count: number; comments_count: number }}
          open={!!selectedPost}
          onOpenChange={(open) => !open && setSelectedPost(null)}
          currentUserId={userId}
        />
      )}
    </>
  )
}
