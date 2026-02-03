"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { createNotification } from "@/lib/notifications"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Pencil, Trash2, Flag } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { Post } from "@/lib/types"
import { cn } from "@/lib/utils"

interface PostCardProps {
  post: Post
  currentUserId: string
  onPostDeleted?: (postId: string) => void
  onPostUpdated?: (post: Post) => void
}

export function PostCard({ post, currentUserId, onPostDeleted, onPostUpdated }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.is_liked || false)
  const [likesCount, setLikesCount] = useState(post.likes_count || 0)
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0)
  const [comment, setComment] = useState("")
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Array<{ id: string; content: string; profiles: { username: string } }>>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editCaption, setEditCaption] = useState(post.caption || "")
  const [currentCaption, setCurrentCaption] = useState(post.caption || "")
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const router = useRouter()
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

      // Create notification for post owner
      await createNotification({
        userId: post.user_id,
        actorId: currentUserId,
        type: "like",
        postId: post.id,
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
        profiles (username)
      `)
      .single()

    if (data) {
      setComments((prev) => [...prev, data])
      setCommentsCount((prev) => prev + 1)

      // Create notification for post owner
      await createNotification({
        userId: post.user_id,
        actorId: currentUserId,
        type: "comment",
        postId: post.id,
        commentId: data.id,
        message: comment.trim().substring(0, 100),
      })

      setComment("")
    }
    setIsSubmitting(false)
  }

  const loadComments = async () => {
    if (comments.length > 0) {
      setShowComments(!showComments)
      return
    }

    const supabase = createClient()
    const { data } = await supabase
      .from("comments")
      .select(`
        *,
        profiles (username)
      `)
      .eq("post_id", post.id)
      .order("created_at", { ascending: true })
      .limit(10)

    if (data) {
      setComments(data)
      setShowComments(true)
    }
  }

  const handleEditPost = async () => {
    if (!editCaption.trim()) return
    setIsEditing(true)

    const supabase = createClient()
    const { error } = await supabase
      .from("posts")
      .update({ caption: editCaption.trim() })
      .eq("id", post.id)
      .eq("user_id", currentUserId)

    if (!error) {
      setCurrentCaption(editCaption.trim())
      setShowEditDialog(false)
      onPostUpdated?.({ ...post, caption: editCaption.trim() })
    }
    setIsEditing(false)
  }

  const handleDeletePost = async () => {
    setIsDeleting(true)
    const supabase = createClient()

    // Delete associated likes and comments first
    await supabase.from("likes").delete().eq("post_id", post.id)
    await supabase.from("comments").delete().eq("post_id", post.id)

    const { error } = await supabase.from("posts").delete().eq("id", post.id).eq("user_id", currentUserId)

    if (!error) {
      setShowDeleteDialog(false)
      onPostDeleted?.(post.id)
      router.refresh()
    }
    setIsDeleting(false)
  }

  const profile = post.profiles

  return (
    <>
      <article className="pb-4">
        {/* Header */}
        <div className="flex items-center justify-between p-3">
          <Link href={`/profile/${profile?.username}`} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full overflow-hidden bg-secondary">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url || "/placeholder.svg"}
                  alt={profile.username || "User"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
                  {(profile?.username || "U").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="font-semibold text-sm">{profile?.username}</span>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {isOwnPost ? (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setEditCaption(currentCaption)
                      setShowEditDialog(true)
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Caption
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Post
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem>
                  <Flag className="h-4 w-4 mr-2" />
                  Report Post
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Image */}
        {post.image_url && (
          <div className="aspect-square bg-secondary">
            <img
              src={post.image_url || "/placeholder.svg"}
              alt={currentCaption || "Post"}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Actions */}
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleLike} className="h-9 w-9">
                <Heart className={cn("h-6 w-6 transition-colors", isLiked && "fill-rose-500 text-rose-500")} />
              </Button>
              <Button variant="ghost" size="icon" onClick={loadComments} className="h-9 w-9">
                <MessageCircle className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Send className="h-6 w-6" />
              </Button>
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Bookmark className="h-6 w-6" />
            </Button>
          </div>

          {/* Likes count */}
          {likesCount > 0 && (
            <p className="font-semibold text-sm">
              {likesCount} {likesCount === 1 ? "like" : "likes"}
            </p>
          )}

          {/* Caption - use currentCaption for live updates */}
          {currentCaption && (
            <p className="text-sm">
              <Link href={`/profile/${profile?.username}`} className="font-semibold mr-1">
                {profile?.username}
              </Link>
              {currentCaption}
            </p>
          )}

          {/* Comments count */}
          {commentsCount > 0 && !showComments && (
            <button onClick={loadComments} className="text-sm text-muted-foreground">
              View all {commentsCount} comments
            </button>
          )}

          {/* Comments */}
          {showComments && comments.length > 0 && (
            <div className="space-y-1">
              {comments.map((c) => (
                <p key={c.id} className="text-sm">
                  <Link href={`/profile/${c.profiles?.username}`} className="font-semibold mr-1">
                    {c.profiles?.username}
                  </Link>
                  {c.content}
                </p>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <p className="text-xs text-muted-foreground uppercase">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>

          {/* Add comment */}
          <form onSubmit={handleComment} className="flex items-center gap-2 pt-2 border-t border-border">
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="border-0 px-0 focus-visible:ring-0 h-9"
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
      </article>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Caption</DialogTitle>
            <DialogDescription>Make changes to your post caption.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={editCaption}
            onChange={(e) => setEditCaption(e.target.value)}
            placeholder="Write a caption..."
            rows={4}
            className="resize-none"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditPost} disabled={isEditing}>
              {isEditing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePost} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
