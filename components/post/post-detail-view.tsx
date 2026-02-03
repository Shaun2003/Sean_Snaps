"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Heart, MessageCircle, Send, Bookmark, ArrowLeft, MoreHorizontal, Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { Post, Comment } from "@/lib/types"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface PostDetailViewProps {
  post: Post & { comments?: Comment[] }
  currentUserId: string
}

export function PostDetailView({ post, currentUserId }: PostDetailViewProps) {
  const [isLiked, setIsLiked] = useState(post.is_liked || false)
  const [likesCount, setLikesCount] = useState(post.likes_count || 0)
  const [comments, setComments] = useState(post.comments || [])
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const profile = post.profiles
  const isOwnPost = post.user_id === currentUserId

  const handleLike = async () => {
    const supabase = createClient()

    if (isLiked) {
      setIsLiked(false)
      setLikesCount((prev) => prev - 1)
      await supabase.from("likes").delete().eq("user_id", currentUserId).eq("post_id", post.id)
    } else {
      setIsLiked(true)
      setLikesCount((prev) => prev + 1)
      await supabase.from("likes").insert({
        user_id: currentUserId,
        post_id: post.id,
      })
    }
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim() || isSubmitting) return

    setIsSubmitting(true)
    const supabase = createClient()

    const { data } = await supabase
      .from("comments")
      .insert({
        user_id: currentUserId,
        post_id: post.id,
        content: comment.trim(),
      })
      .select(`
        *,
        profiles (*)
      `)
      .single()

    if (data) {
      setComments((prev) => [...prev, data])
      setComment("")
    }
    setIsSubmitting(false)
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return

    const supabase = createClient()
    await supabase.from("posts").delete().eq("id", post.id)
    router.push("/feed")
    router.refresh()
  }

  return (
    <div className="container mx-auto max-w-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold">Post</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isOwnPost && (
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Post
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Post content */}
      <div className="flex items-center gap-3 p-4">
        <Link href={`/profile/${profile?.username}`}>
          <div className="h-10 w-10 rounded-full overflow-hidden bg-secondary">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url || "/placeholder.svg"}
                alt={profile.username || "User"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                {(profile?.username || "U").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </Link>
        <div>
          <Link href={`/profile/${profile?.username}`} className="font-semibold text-sm">
            {profile?.username}
          </Link>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {post.image_url && (
        <div className="aspect-square bg-secondary">
          <img
            src={post.image_url || "/placeholder.svg"}
            alt={post.caption || "Post"}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Actions */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleLike}>
              <Heart className={cn("h-6 w-6", isLiked && "fill-rose-500 text-rose-500")} />
            </Button>
            <Button variant="ghost" size="icon">
              <MessageCircle className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="icon">
              <Send className="h-6 w-6" />
            </Button>
          </div>
          <Button variant="ghost" size="icon">
            <Bookmark className="h-6 w-6" />
          </Button>
        </div>

        {likesCount > 0 && (
          <p className="font-semibold text-sm">
            {likesCount} {likesCount === 1 ? "like" : "likes"}
          </p>
        )}

        {post.caption && (
          <p className="text-sm">
            <span className="font-semibold mr-1">{profile?.username}</span>
            {post.caption}
          </p>
        )}
      </div>

      {/* Comments */}
      <div className="border-t border-border">
        {comments.length > 0 ? (
          <div className="p-4 space-y-4 max-h-[40vh] overflow-y-auto">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <Link href={`/profile/${c.profiles?.username}`}>
                  <div className="h-8 w-8 rounded-full overflow-hidden bg-secondary shrink-0">
                    {c.profiles?.avatar_url ? (
                      <img
                        src={c.profiles.avatar_url || "/placeholder.svg"}
                        alt={c.profiles.username || "User"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
                        {(c.profiles?.username || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </Link>
                <div>
                  <p className="text-sm">
                    <Link href={`/profile/${c.profiles?.username}`} className="font-semibold mr-1">
                      {c.profiles?.username}
                    </Link>
                    {c.content}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground text-sm">No comments yet. Be the first to comment!</div>
        )}

        {/* Add comment */}
        <form onSubmit={handleComment} className="flex items-center gap-2 p-4 border-t border-border">
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment..."
            className="border-0 px-0 focus-visible:ring-0"
          />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            disabled={!comment.trim() || isSubmitting}
            className="text-primary font-semibold"
          >
            Post
          </Button>
        </form>
      </div>
    </div>
  )
}
