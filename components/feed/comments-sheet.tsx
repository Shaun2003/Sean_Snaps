"use client"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Comment, Profile } from "@/lib/types"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Heart, ThumbsUp, Laugh, Smile, CornerDownRight, Smile as SmileIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import data from "@emoji-mart/data"
import Picker from "@emoji-mart/react"

interface CommentsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
  currentUserId: string
}

const EMOJI_REACTIONS = ["❤️", "😂", "😮", "😢", "🔥", "👏", "🙏"]

const reactionIcons = {
  like: ThumbsUp,
  love: Heart,
  laugh: Laugh,
  care: Smile,
  finger: ThumbsUp,
}

const reactionLabels = {
  like: "Like",
  love: "Love",
  laugh: "Haha",
  care: "Care",
  finger: "Finger",
}

export function CommentsSheet({ open, onOpenChange, postId, currentUserId }: CommentsSheetProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const fetchComments = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("comments")
      .select(`
        *,
        profiles (*),
        comment_reactions (*)
      `)
      .eq("post_id", postId)
      .is("parent_id", null)
      .order("created_at", { ascending: true })

    if (data) {
      // Fetch replies for each comment
      const commentsWithReplies = await Promise.all(
        data.map(async (comment: any) => {
          const { data: replies } = await supabase
            .from("comments")
            .select(`
              *,
              profiles (*),
              comment_reactions (*)
            `)
            .eq("parent_id", comment.id)
            .order("created_at", { ascending: true })

          return { ...comment, replies: replies || [] }
        }),
      )
      setComments(commentsWithReplies)
    }
  }, [postId])

  useEffect(() => {
    if (open) {
      fetchComments()
    }
  }, [open, fetchComments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    const supabase = createClient()

    await supabase.from("comments").insert({
      post_id: postId,
      user_id: currentUserId,
      parent_id: replyTo?.id || null,
      content: newComment.trim(),
    })

    setNewComment("")
    setReplyTo(null)
    await fetchComments()
    setIsSubmitting(false)
  }

  const handleReaction = async (commentId: string, emoji: string) => {
    const supabase = createClient()

    // Check if user already has a reaction for this emoji on this comment
    const { data: existing } = await supabase
      .from("comment_reactions")
      .select("id")
      .eq("comment_id", commentId)
      .eq("user_id", currentUserId)
      .eq("emoji", emoji)

    if (existing && existing.length > 0) {
      // User already reacted with this emoji - remove it
      await supabase.from("comment_reactions").delete().eq("id", existing[0].id)
    } else {
      // Delete user's existing reaction (if any) before adding new one
      // This ensures user can only have one emoji reaction per comment
      const { data: userReactions } = await supabase
        .from("comment_reactions")
        .select("id")
        .eq("comment_id", commentId)
        .eq("user_id", currentUserId)

      if (userReactions && userReactions.length > 0) {
        await supabase
          .from("comment_reactions")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", currentUserId)
      }

      // Insert new emoji reaction
      await supabase.from("comment_reactions").insert({
        comment_id: commentId,
        user_id: currentUserId,
        emoji: emoji,
      })
    }

    fetchComments()
  }

  const handleDelete = async (commentId: string) => {
    const supabase = createClient()
    await supabase.from("comments").delete().eq("id", commentId)
    fetchComments()
  }

  const handleEmojiSelect = (emoji: { native: string }) => {
    setNewComment((prev) => prev + emoji.native)
    setShowEmojiPicker(false)
  }

  const renderComment = (comment: Comment, isReply = false) => {
    const profile = comment.profiles as Profile
    const userReaction = comment.comment_reactions?.find((r: { user_id: string }) => r.user_id === currentUserId)
    const reactionCounts =
      comment.comment_reactions?.reduce(
        (acc: Record<string, number>, r: { emoji: string }) => {
          acc[r.emoji] = (acc[r.emoji] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ) || {}

    return (
      <div key={comment.id} className={cn("flex gap-3", isReply && "ml-10")}>
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={profile.avatar_url || ""} />
          <AvatarFallback>{profile.display_name?.[0] || "U"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="bg-muted rounded-2xl px-4 py-2">
            <p className="font-semibold text-sm">{profile.username}</p>
            <p className="text-sm">{comment.content}</p>
          </div>

          <div className="flex items-center gap-4 mt-1 px-2">
            <span className="text-xs text-muted-foreground">
              {format(new Date(comment.created_at), "MMM d 'at' h:mm a")}
            </span>

            {/* Reaction buttons - use emoji dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="link"
                  size="sm"
                  className={cn("h-auto p-0 text-xs", userReaction && "text-primary font-semibold")}
                >
                  {userReaction ? `${userReaction.emoji} Reacted` : "React"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="flex gap-1 p-1">
                {EMOJI_REACTIONS.map((emoji) => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-lg"
                    onClick={() => handleReaction(comment.id, emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {!isReply && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => setReplyTo({ id: comment.id, username: profile.username || "" })}
              >
                Reply
              </Button>
            )}

            {comment.user_id === currentUserId && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-destructive"
                onClick={() => handleDelete(comment.id)}
              >
                Delete
              </Button>
            )}
          </div>

          {/* Reaction summary */}
          {Object.keys(reactionCounts).length > 0 && (
            <div className="flex items-center gap-1 mt-1 px-2">
              {Object.entries(reactionCounts).map(([type, count]) => {
                const Icon = reactionIcons[type as keyof typeof reactionIcons]
                return (
                  <span key={type} className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <Icon className="h-3 w-3" />
                    {count}
                  </span>
                )
              })}
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">{comment.replies.map((reply: Comment) => renderComment(reply, true))}</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Comments</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No comments yet. Be the first to comment!</p>
          ) : (
            comments.map((comment) => renderComment(comment))
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-t pt-4">
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <CornerDownRight className="h-4 w-4" />
              <span>Replying to {replyTo.username}</span>
              <Button type="button" variant="ghost" size="sm" className="h-auto p-1" onClick={() => setReplyTo(null)}>
                Cancel
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild suppressHydrationWarning>
                <Button type="button" variant="ghost" size="icon" className="shrink-0">
                  <Smile className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" suppressHydrationWarning>
                <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="auto" />
              </PopoverContent>
            </Popover>
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!newComment.trim() || isSubmitting}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
