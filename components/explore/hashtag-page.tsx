"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Post, Profile } from "@/lib/types"
import { PostCard } from "@/components/feed/post-card"
import { Loader2 } from "lucide-react"
import Link from "next/link"

interface HashtagPageProps {
  slug: string
  userId: string
}

interface EnrichedPost extends Post {
  reshared_by?: Profile
  is_saved?: boolean
}

export function HashtagPage({ slug, userId }: HashtagPageProps) {
  const [hashtag, setHashtag] = useState<{ id: string; name: string; count: number } | null>(null)
  const [posts, setPosts] = useState<EnrichedPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHashtagPosts = useCallback(async () => {
    try {
      const supabase = createClient()

      // Get hashtag
      const { data: hashtagData } = await supabase
        .from("hashtags")
        .select("id, name, count")
        .eq("slug", slug.toLowerCase())
        .single()

      if (!hashtagData) {
        setError("Hashtag not found")
        setIsLoading(false)
        return
      }

      setHashtag(hashtagData)

      // Get posts with this hashtag
      const { data: postsData } = await supabase
        .from("post_hashtags")
        .select(`
          post:posts (
            *,
            profiles (*),
            post_likes (id, user_id),
            comments (id),
            post_shares (id),
            post_reactions (id, emoji, user_id),
            post_media (*)
          )
        `)
        .eq("hashtag_id", hashtagData.id)
        .order("created_at", { ascending: false })

      if (postsData) {
        const enrichedPosts = postsData
          .filter((item: any) => item.post)
          .map((item: any) => ({
            ...item.post,
            likes_count: item.post.post_likes?.length || 0,
            comments_count: item.post.comments?.length || 0,
            shares_count: item.post.post_shares?.length || 0,
            reactions_count: item.post.post_reactions?.length || 0,
            is_liked: item.post.post_likes?.some((like: { user_id: string }) => like.user_id === userId) || false,
          }))
        setPosts(enrichedPosts)
      }
      setError(null)
    } catch (err) {
      console.error("Error fetching hashtag posts:", err)
      setError("Failed to load hashtag posts")
    } finally {
      setIsLoading(false)
    }
  }, [slug, userId])

  useEffect(() => {
    fetchHashtagPosts()
  }, [fetchHashtagPosts])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <Link href="/explore" className="text-blue-600 dark:text-blue-400 hover:underline mt-4 inline-block">
          Back to Explore
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Hashtag header */}
      {hashtag && (
        <div className="border-b border-slate-200 dark:border-slate-800 p-6">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-blue-500 via-purple-500 to-pink-500">#{hashtag.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {hashtag.count} {hashtag.count === 1 ? "post" : "posts"}
          </p>
        </div>
      )}

      {/* Posts list */}
      {posts.length > 0 ? (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {posts.map((post, index) => (
            <div key={`${post.id}-${index}`} className="p-6 border-b border-slate-100 dark:border-slate-800">
              <PostCard post={post} currentUserId={userId} onUpdate={fetchHashtagPosts} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">No posts found with this hashtag</p>
        </div>
      )}
    </div>
  )
}
