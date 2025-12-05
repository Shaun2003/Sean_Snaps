"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Post, Profile } from "@/lib/types"
import { Heart, MessageCircle } from "lucide-react"
import { PostDetailDialog } from "./post-detail-dialog"

interface DiscoverGridProps {
  userId: string
}

interface PostWithDetails extends Post {
  profiles: Profile
  likes_count: number
  comments_count: number
}

export function DiscoverGrid({ userId }: DiscoverGridProps) {
  const [posts, setPosts] = useState<PostWithDetails[]>([])
  const [selectedPost, setSelectedPost] = useState<PostWithDetails | null>(null)

  useEffect(() => {
    const fetchPosts = async () => {
      const supabase = createClient()

      const { data } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (*),
          post_likes (id),
          comments (id)
        `)
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(30)

      if (data) {
        const enriched = data.map((post) => ({
          ...post,
          likes_count: post.post_likes?.length || 0,
          comments_count: post.comments?.length || 0,
        }))
        setPosts(enriched)
      }
    }

    fetchPosts()
  }, [])

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5 sm:gap-1 md:gap-2">
        {posts.map((post) => (
          <button
            key={post.id}
            onClick={() => setSelectedPost(post)}
            className="relative aspect-square group overflow-hidden rounded-none sm:rounded-sm md:rounded-lg bg-muted"
          >
            <img
              src={post.image_url || "/placeholder.svg?height=300&width=300&query=post image"}
              alt=""
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 sm:gap-4">
              <span className="flex items-center gap-0.5 sm:gap-1 text-white font-semibold text-xs sm:text-sm">
                <Heart className="h-3 w-3 sm:h-5 sm:w-5 fill-white" />
                {post.likes_count}
              </span>
              <span className="flex items-center gap-0.5 sm:gap-1 text-white font-semibold text-xs sm:text-sm">
                <MessageCircle className="h-3 w-3 sm:h-5 sm:w-5 fill-white" />
                {post.comments_count}
              </span>
            </div>
          </button>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center py-8 sm:py-12 text-muted-foreground text-sm">No posts to discover yet</div>
      )}

      {selectedPost && (
        <PostDetailDialog
          post={selectedPost}
          currentUserId={userId}
          open={!!selectedPost}
          onOpenChange={(open) => !open && setSelectedPost(null)}
        />
      )}
    </>
  )
}
