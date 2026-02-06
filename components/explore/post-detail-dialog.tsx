"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Post, Profile, Comment } from "@/lib/types"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Heart, MessageCircle, Share2, Send, MoreHorizontal, Pencil, X, CornerDownRight, Bookmark, ThumbsUp, Laugh, Smile } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import data from "@emoji-mart/data"
import Picker from "@emoji-mart/react"
import { EmojiReactions } from "@/components/feed/emoji-reactions"
import { ShareDialog } from "@/components/feed/share-dialog"

interface PostDetailDialogProps {
  post: Post & { profiles: Profile; likes_count: number; comments_count: number }
  currentUserId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const EMOJI_REACTIONS = ["❤️", "😂", "😮", "😢", "🔥", "👏", "🙏"]

const reactionIcons = {
  like: ThumbsUp,
  love: Heart,
  laugh: Laugh,
  care: Smile,
  finger: ThumbsUp,
}

interface EmojiReactionsPreviewProps {
  postId: string
  commentsCount?: number
}

function EmojiReactionsPreview({ postId, commentsCount = 0 }: EmojiReactionsPreviewProps) {
  const [reactions, setReactions] = useState<Array<{ emoji: string; users: Array<{ id: string; username: string; display_name: string; avatar_url: string | null }> }>>([])
  const [reactionCount, setReactionCount] = useState(0)

  useEffect(() => {
    fetchReactions()
    setupRealtimeSubscription()
  }, [postId])

  const setupRealtimeSubscription = () => {
    try {
      const supabase = createClient()
      const channel = supabase
        .channel(`post_reactions:${postId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "post_reactions",
            filter: `post_id=eq.${postId}`,
          },
          () => {
            fetchReactions()
          },
        )
        .subscribe()
    } catch (err) {
      console.error("Error setting up realtime subscription:", err)
    }
  }

  const fetchReactions = async () => {
    try {
      const supabase = createClient()
      const { data: reactions } = await supabase
        .from("post_reactions")
        .select("emoji, user_id")
        .eq("post_id", postId)

      if (!reactions || reactions.length === 0) {
        setReactions([])
        setReactionCount(0)
        return
      }

      // Get unique user IDs
      const userIds = Array.from(new Set(reactions.map((r: any) => r.user_id)))

      // Fetch user profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds)

      const profilesMap = new Map()
      profiles?.forEach((profile: any) => {
        profilesMap.set(profile.id, profile)
      })

      const reactionsMap = new Map<string, Array<{ id: string; username: string; display_name: string; avatar_url: string | null }>>()

      reactions.forEach((reaction: any) => {
        const current = reactionsMap.get(reaction.emoji) || []
        const userProfile = profilesMap.get(reaction.user_id)
        if (userProfile) {
          current.push(userProfile)
        }
        reactionsMap.set(reaction.emoji, current)
      })

      const formattedReactions = Array.from(reactionsMap.entries()).map(([emoji, users]) => ({
        emoji,
        users,
      }))

      setReactions(formattedReactions)
      setReactionCount(reactions.length)
    } catch (err) {
      console.error("Error fetching reactions:", err)
    }
  }

  // Get all unique users with their first reaction emoji
  const userReactionsMap = new Map<string, string>()
  reactions.forEach((reaction) => {
    reaction.users.forEach((user) => {
      if (!userReactionsMap.has(user.id)) {
        userReactionsMap.set(user.id, reaction.emoji)
      }
    })
  })

  const usersWithReactions = Array.from(userReactionsMap.entries())
    .slice(0, 3)
    .map(([userId, emoji]) => {
      const user = reactions.flatMap(r => r.users).find(u => u.id === userId)
      return { ...user, emoji }
    })
    .filter(Boolean) as Array<{ id: string; username: string; display_name: string; avatar_url: string | null; emoji: string }>

  if (reactionCount === 0 && commentsCount === 0) {
    return null
  }

  return (
    <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground px-4 py-1.5 sm:py-2 border-b">
      <div className="flex items-center gap-2">
        {reactionCount > 0 && (
          <div className="flex -space-x-3">
            {usersWithReactions.map((userReaction) => (
              <div key={userReaction.id} className="relative" title={userReaction.display_name || userReaction.username}>
                <Avatar className="h-6 w-6 sm:h-7 sm:w-7 border-2 border-background cursor-pointer hover:scale-110 transition-transform">
                  <AvatarImage src={userReaction.avatar_url || ""} alt={userReaction.display_name || userReaction.username} />
                  <AvatarFallback className="text-[8px]">{(userReaction.display_name || userReaction.username)?.[0]}</AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-1 -right-1 text-sm">{userReaction.emoji}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 sm:gap-3">
        {commentsCount > 0 && (
          <span className="text-muted-foreground">
            {commentsCount} comment{commentsCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}

export function PostDetailDialog({ post, currentUserId, open, onOpenChange }: PostDetailDialogProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [likesCount, setLikesCount] = useState(post?.likes_count || 0)
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [localSaved, setLocalSaved] = useState((post as any)?.is_saved || false)
  const [isSavingPost, setIsSavingPost] = useState(false)
  const [showShare, setShowShare] = useState(false)

  const fetchComments = useCallback(async () => {
    if (!post?.id) return
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
        data.map(async (comment: any) => {
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
  }, [post?.id])

  const checkLiked = useCallback(async () => {
    if (!post?.id) return
    const supabase = createClient()
    // This function is kept but not used - we're now using emoji reactions instead of simple likes
  }, [post?.id, currentUserId])

  useEffect(() => {
    if (open && post?.id) {
      fetchComments()
    }
  }, [open, post?.id, fetchComments])

  const handleSave = async () => {
    if (isSavingPost) return
    setIsSavingPost(true)

    const supabase = createClient()

    if (localSaved) {
      setLocalSaved(false)
      await supabase.from("saved_posts").delete().eq("post_id", post.id).eq("user_id", currentUserId)
    } else {
      setLocalSaved(true)
      await supabase.from("saved_posts").insert({ post_id: post.id, user_id: currentUserId })
    }

    setIsSavingPost(false)
  }

  // Safety check - only affects JSX rendering
  if (!post || !post.profiles) {
    return null
  }

  const handleComment = async () => {
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    const supabase = createClient()
    await supabase.from("comments").insert({
      post_id: post.id,
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

  const handleDeleteComment = async (commentId: string) => {
    const supabase = createClient()
    await supabase.from("comments").delete().eq("id", commentId)
    fetchComments()
  }

  const handleEmojiSelect = (emoji: { native: string }) => {
    setNewComment((prev) => prev + emoji.native)
    setShowEmojiPicker(false)
  }

  const handleUnfollow = async () => {
    try {
      const supabase = createClient()
      await supabase.from("followers").delete().eq("follower_id", currentUserId).eq("following_id", post.user_id)
    } catch (err) {
      console.error("Error unfollowing:", err)
    }
  }

  const handleMute = async () => {
    try {
      const supabase = createClient()
      const { data: existing } = await supabase
        .from("muted_users")
        .select("id")
        .eq("user_id", currentUserId)
        .eq("muted_user_id", post.user_id)
        .single()

      if (!existing) {
        await supabase.from("muted_users").insert({
          user_id: currentUserId,
          muted_user_id: post.user_id,
        })
      }
    } catch (err) {
      console.error("Error muting user:", err)
    }
  }

  const handleReport = async () => {
    try {
      const supabase = createClient()
      await supabase.from("reports").insert({
        reported_by: currentUserId,
        reported_user_id: post.user_id,
        post_id: post.id,
        reason: "Inappropriate content",
      })
      alert("Post reported successfully. Our team will review it shortly.")
    } catch (err) {
      console.error("Error reporting post:", err)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return
    try {
      const supabase = createClient()
      await supabase.from("posts").delete().eq("id", post.id).eq("user_id", currentUserId)
      onOpenChange(false)
    } catch (err) {
      console.error("Error deleting post:", err)
    }
  }

  const handleSaveEdit = async () => {
    setIsSaving(true)
    try {
      const supabase = createClient()
      await supabase
        .from("posts")
        .update({ content: editContent, updated_at: new Date().toISOString() })
        .eq("id", post.id)
        .eq("user_id", currentUserId)

      setIsEditing(false)
      fetchComments()
    } catch (err) {
      console.error("Error updating post:", err)
    } finally {
      setIsSaving(false)
    }
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
                onClick={() => handleDeleteComment(comment.id)}
              >
                Delete
              </Button>
            )}
          </div>

          {/* Reaction summary */}
          {Object.keys(reactionCounts).length > 0 && (
            <div className="flex items-center gap-1 mt-1 px-2">
              {Object.entries(reactionCounts).map(([emoji, count]) => {
                const emojiStr = emoji
                return (
                  <span key={emoji} className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <span>{emojiStr}</span>
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
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetDescription className="sr-only">View and interact with post details</SheetDescription>
        <SheetHeader className="border-b px-3 sm:px-4 py-2 sm:py-3 relative">
          <SheetTitle className="text-sm sm:text-base">Post</SheetTitle>
          {post.user_id === currentUserId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 absolute right-3 sm:right-4 top-12">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setIsEditing(true)
                    setEditContent(post.content || "")
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" /> Edit Post
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  Delete Post
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {post.user_id !== currentUserId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 absolute right-3 sm:right-4 top-12">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent">
                  Show Opinion
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleUnfollow} className="cursor-pointer hover:bg-accent">
                  Unfollow
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleMute} className="cursor-pointer hover:bg-accent">
                  Mute
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleReport} className="text-destructive cursor-pointer hover:bg-destructive/10">
                  Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </SheetHeader>

        {/* Post Header - Profile Section */}
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 border-b">
          <Link href={`/profile/${post.profiles.id}`}>
            <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
              <AvatarImage src={post.profiles.avatar_url || ""} />
              <AvatarFallback>{post.profiles.display_name?.[0] || "U"}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/profile/${post.profiles.id}`} className="font-semibold text-xs sm:text-sm hover:underline block truncate">
              {post.profiles.display_name || post.profiles.username}
            </Link>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {format(new Date(post.created_at), "MMM d 'at' h:mm a")}
              {post.updated_at && post.updated_at !== post.created_at && " · Edited"}
            </p>
          </div>
        </div>

        {/* Post Image */}
        {post.image_url && (
          <div className="w-full px-0 py-2">
            <img
              src={post.image_url}
              alt="Post"
              className="w-full object-cover max-h-96"
            />
          </div>
        )}

        {/* Post Caption */}
        {isEditing ? (
          <div className="px-4 py-2 border-b space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-2 border rounded-md bg-background resize-none text-xs sm:text-sm"
              rows={3}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="h-7 sm:h-8 text-xs">
                <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={isSaving} className="h-7 sm:h-8 text-xs">
                Save
              </Button>
            </div>
          </div>
        ) : (
          post.content && (
            <div className="px-4 py-2 border-b text-xs sm:text-sm">
              {post.content}
            </div>
          )
        )}

        {/* Emoji Reactions Preview */}
        <EmojiReactionsPreview postId={post.id} commentsCount={post.comments_count || comments.length} />

        {/* Action Buttons */}
        <div className="flex items-center justify-around border-b py-0.5 sm:py-1 px-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 sm:h-10 gap-1 sm:gap-2 rounded-lg"
          >
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="sr-only">Comment</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 sm:h-10 gap-1 sm:gap-2 rounded-lg"
            onClick={() => setShowShare(true)}
          >
            <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="sr-only">Share</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("flex-1 h-8 sm:h-10 gap-1 sm:gap-2 rounded-lg", localSaved && "text-amber-500")}
            onClick={handleSave}
            disabled={isSavingPost}
          >
            <Bookmark className={cn("h-4 w-4 sm:h-5 sm:w-5", localSaved && "fill-current")} />
            <span className="sr-only">Save</span>
          </Button>
          <div className="flex-1 flex items-center justify-center px-1">
            <EmojiReactions postId={post.id} currentUserId={currentUserId} />
          </div>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 sm:py-3 space-y-2 sm:space-y-3">
          {comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 sm:py-8 text-xs">No comments yet. Be the first to comment!</p>
          ) : (
            comments.map((comment) => renderComment(comment))
          )}
        </div>

        {/* Comment Input Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleComment() }} className="border-t px-4 pt-2 sm:pt-3 pb-3 sm:pb-4 space-y-1.5 sm:space-y-2">
          {replyTo && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Replying to {replyTo.username}</span>
              <Button type="button" variant="ghost" size="sm" className="h-auto p-0 ml-auto hover:text-foreground" onClick={() => setReplyTo(null)}>
                ✕
              </Button>
            </div>
          )}
          <div className="flex gap-1.5 sm:gap-2">
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild suppressHydrationWarning>
                <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 sm:h-9 w-8 sm:w-9">
                  <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
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
              className="flex-1 h-8 sm:h-9 text-xs sm:text-sm rounded-full bg-muted border-0"
            />
            <Button type="submit" size="icon" disabled={!newComment.trim() || isSubmitting} className="h-8 sm:h-9 w-8 sm:w-9 rounded-full shrink-0">
              <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
    <ShareDialog open={showShare} onOpenChange={setShowShare} post={post} currentUserId={currentUserId} />
    </>
  )
}
