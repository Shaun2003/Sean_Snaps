"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Post, Profile, Comment } from "@/lib/types"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Heart, MessageCircle, Share2, Send, ThumbsUp, Laugh, Smile } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface PostDetailDialogProps {
  post: Post & { profiles: Profile; likes_count: number; comments_count: number }
  currentUserId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const reactionIcons = {
  like: ThumbsUp,
  love: Heart,
  laugh: Laugh,
  care: Smile,
  finger: ThumbsUp,
}

export function PostDetailDialog({ post, currentUserId, open, onOpenChange }: PostDetailDialogProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null)

  const fetchComments = useCallback(async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from("comments")
      .select(`
        *,
        profiles (*),
        comment_reactions (*)
      `)
      .eq("post_id", post.id)
      .is("parent_id", null)
      .order("created_at", { ascending: true })

    if (data) {
      const commentsWithReplies = await Promise.all(
        data.map(async (comment) => {
          const { data: replies } = await supabase
            .from("comments")
            .select(`*, profiles (*), comment_reactions (*)`)
            .eq("parent_id", comment.id)
            .order("created_at", { ascending: true })

          return { ...comment, replies: replies || [] }
        }),
      )
      setComments(commentsWithReplies)
    }
  }, [post.id])

  const checkLiked = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", post.id)
      .eq("user_id", currentUserId)
      .single()

    setIsLiked(!!data)
  }, [post.id, currentUserId])

  useEffect(() => {
    if (open) {
      fetchComments()
      checkLiked()
    }
  }, [open, fetchComments, checkLiked])

  const handleLike = async () => {
    const supabase = createClient()

    if (isLiked) {
      setIsLiked(false)
      setLikesCount((prev) => prev - 1)
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", currentUserId)
    } else {
      setIsLiked(true)
      setLikesCount((prev) => prev + 1)
      await supabase.from("post_likes").insert({
        post_id: post.id,
        user_id: currentUserId,
      })
    }
  }

  const handleComment = async () => {
    if (!newComment.trim()) return

    const supabase = createClient()
    await supabase.from("comments").insert({
      post_id: post.id,
      user_id: currentUserId,
      parent_id: replyTo?.id || null,
      content: newComment.trim(),
    })

    setNewComment("")
    setReplyTo(null)
    fetchComments()
  }

  const handleReaction = async (commentId: string, reactionType: string) => {
    const supabase = createClient()

    const { data: existing } = await supabase
      .from("comment_reactions")
      .select("*")
      .eq("comment_id", commentId)
      .eq("user_id", currentUserId)
      .single()

    if (existing) {
      if (existing.reaction_type === reactionType) {
        await supabase.from("comment_reactions").delete().eq("id", existing.id)
      } else {
        await supabase.from("comment_reactions").update({ reaction_type: reactionType }).eq("id", existing.id)
      }
    } else {
      await supabase.from("comment_reactions").insert({
        comment_id: commentId,
        user_id: currentUserId,
        reaction_type: reactionType,
      })
    }

    fetchComments()
  }

  const renderComment = (comment: Comment, isReply = false) => {
    const profile = comment.profiles as Profile
    const userReaction = comment.comment_reactions?.find((r: { user_id: string }) => r.user_id === currentUserId)

    return (
      <div key={comment.id} className={cn("flex gap-2", isReply && "ml-8")}>
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={profile.avatar_url || ""} />
          <AvatarFallback>{profile.display_name?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="bg-muted rounded-2xl px-3 py-2">
            <p className="font-semibold text-xs">{profile.username}</p>
            <p className="text-sm">{comment.content}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 px-2 text-xs text-muted-foreground">
            <span>{format(new Date(comment.created_at), "MMM d, h:mm a")}</span>
            <DropdownMenu>
              <DropdownMenuTrigger className="hover:text-foreground">
                {userReaction ? "Reacted" : "React"}
              </DropdownMenuTrigger>
              <DropdownMenuContent className="flex gap-1 p-1">
                {(["like", "love", "laugh", "care", "finger"] as const).map((type) => {
                  const Icon = reactionIcons[type]
                  return (
                    <Button
                      key={type}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleReaction(comment.id, type)}
                    >
                      <Icon className={cn("h-4 w-4", type === "love" && "text-red-500")} />
                    </Button>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            {!isReply && (
              <button
                onClick={() => setReplyTo({ id: comment.id, username: profile.username || "" })}
                className="hover:text-foreground"
              >
                Reply
              </button>
            )}
          </div>
          {comment.replies?.map((reply: Comment) => renderComment(reply, true))}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden">
        <div className="flex flex-col md:flex-row max-h-[90vh]">
          {/* Image */}
          {post.image_url && (
            <div className="md:w-1/2 bg-black flex items-center justify-center">
              <img
                src={post.image_url || "/placeholder.svg"}
                alt=""
                className="max-h-[50vh] md:max-h-[90vh] object-contain"
              />
            </div>
          )}

          {/* Content */}
          <div className={cn("flex flex-col", post.image_url ? "md:w-1/2" : "w-full")}>
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b">
              <Link href={`/profile/${post.profiles.id}`}>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={post.profiles.avatar_url || ""} />
                  <AvatarFallback>{post.profiles.display_name?.[0]}</AvatarFallback>
                </Avatar>
              </Link>
              <div>
                <Link href={`/profile/${post.profiles.id}`} className="font-semibold text-sm hover:underline">
                  {post.profiles.username}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(post.created_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>

            {/* Caption */}
            {post.content && (
              <div className="p-4 border-b">
                <p className="text-sm">{post.content}</p>
              </div>
            )}

            {/* Comments */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.map((comment) => renderComment(comment))}
            </div>

            {/* Actions */}
            <div className="border-t p-4">
              <div className="flex items-center gap-4 mb-3">
                <Button variant="ghost" size="icon" onClick={handleLike} className={cn(isLiked && "text-primary")}>
                  <Heart className={cn("h-6 w-6", isLiked && "fill-current")} />
                </Button>
                <Button variant="ghost" size="icon">
                  <MessageCircle className="h-6 w-6" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Share2 className="h-6 w-6" />
                </Button>
              </div>
              <p className="text-sm font-semibold mb-3">{likesCount} likes</p>

              {replyTo && (
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                  Replying to {replyTo.username}
                  <button onClick={() => setReplyTo(null)} className="text-primary">
                    Cancel
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  onKeyDown={(e) => e.key === "Enter" && handleComment()}
                />
                <Button size="icon" onClick={handleComment} disabled={!newComment.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
