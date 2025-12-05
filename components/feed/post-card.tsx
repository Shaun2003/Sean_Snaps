"use client"

import type React from "react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Post, Profile, Comment } from "@/lib/types"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Heart, MessageCircle, Share2, MoreHorizontal, Send, Pencil, X, Check, Repeat2, Bookmark } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { ShareDialog } from "./share-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"

interface PostCardProps {
  post: Post & {
    reshared_by?: Profile
    original_post?: Post & { profiles: Profile }
    is_saved?: boolean
  }
  currentUserId: string
  onUpdate: () => void
}

export function PostCard({ post, currentUserId, onUpdate }: PostCardProps) {
  const [isLiking, setIsLiking] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [localLiked, setLocalLiked] = useState(post.is_liked)
  const [localLikesCount, setLocalLikesCount] = useState(post.likes_count || 0)
  const [localSaved, setLocalSaved] = useState(post.is_saved || false)
  const [isSaving, setIsSaving] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content || "")

  const profile = post.profiles as Profile
  const isReshare = !!post.reshared_by

  const fetchComments = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("comments")
      .select("*, profiles (*)")
      .eq("post_id", post.id)
      .is("parent_id", null)
      .order("created_at", { ascending: true })
      .limit(10)

    if (data) setComments(data)
  }

  const handleToggleComments = async () => {
    if (!showComments) {
      await fetchComments()
    }
    setShowComments(!showComments)
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || isSubmittingComment) return

    setIsSubmittingComment(true)
    const supabase = createClient()

    await supabase.from("comments").insert({
      post_id: post.id,
      user_id: currentUserId,
      content: newComment.trim(),
    })

    if (post.user_id !== currentUserId) {
      await supabase.from("notifications").insert({
        user_id: post.user_id,
        actor_id: currentUserId,
        type: "comment",
        title: "New comment",
        content: newComment.trim().slice(0, 100),
        reference_id: post.id,
        reference_type: "post",
      })
    }

    setNewComment("")
    await fetchComments()
    setIsSubmittingComment(false)
    onUpdate()
  }

  const handleLike = async () => {
    if (isLiking) return
    setIsLiking(true)

    const supabase = createClient()

    if (localLiked) {
      setLocalLiked(false)
      setLocalLikesCount((prev) => Math.max(0, (prev || 0) - 1))
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", currentUserId)
    } else {
      setLocalLiked(true)
      setLocalLikesCount((prev) => (prev || 0) + 1)
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: currentUserId })

      if (post.user_id !== currentUserId) {
        await supabase.from("notifications").insert({
          user_id: post.user_id,
          actor_id: currentUserId,
          type: "like",
          title: "New like",
          content: "Someone liked your post",
          reference_id: post.id,
          reference_type: "post",
        })
      }
    }

    setIsLiking(false)
    onUpdate()
  }

  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)

    const supabase = createClient()

    if (localSaved) {
      setLocalSaved(false)
      await supabase.from("saved_posts").delete().eq("post_id", post.id).eq("user_id", currentUserId)
    } else {
      setLocalSaved(true)
      await supabase.from("saved_posts").insert({ post_id: post.id, user_id: currentUserId })
    }

    setIsSaving(false)
  }

  const handleDelete = async () => {
    const supabase = createClient()
    await supabase.from("posts").delete().eq("id", post.id)
    onUpdate()
  }

  const handleSaveEdit = async () => {
    const supabase = createClient()
    await supabase
      .from("posts")
      .update({ content: editContent, updated_at: new Date().toISOString() })
      .eq("id", post.id)
    setIsEditing(false)
    onUpdate()
  }

  return (
    <>
      <Card className="overflow-hidden w-full border-0 sm:border shadow-sm bg-card">
        {isReshare && post.reshared_by && (
          <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:py-2 bg-muted/50 text-[10px] sm:text-xs text-muted-foreground border-b">
            <Repeat2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <Link href={`/profile/${post.reshared_by.id}`} className="font-medium hover:underline">
              {post.reshared_by.display_name || post.reshared_by.username}
            </Link>
            <span>shared this</span>
          </div>
        )}

        <CardHeader className="flex flex-row items-center gap-2 sm:gap-3 space-y-0 p-2.5 sm:p-4">
          <Link href={`/profile/${profile.id}`}>
            <Avatar className="h-9 w-9 sm:h-11 sm:w-11 ring-2 ring-background">
              <AvatarImage src={profile.avatar_url || ""} />
              <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs sm:text-sm">
                {profile.display_name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link
              href={`/profile/${profile.id}`}
              className="font-semibold text-xs sm:text-sm hover:underline truncate block"
            >
              {profile.display_name || profile.username}
            </Link>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {format(new Date(post.created_at), "MMM d 'at' h:mm a")}
              {post.updated_at && post.updated_at !== post.created_at && " · Edited"}
            </p>
          </div>
          {post.user_id === currentUserId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
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
        </CardHeader>

        {isEditing ? (
          <CardContent className="px-2.5 sm:px-4 pb-2.5 sm:pb-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[60px] sm:min-h-[80px] text-xs sm:text-sm resize-none"
            />
            <div className="flex justify-end gap-2 mt-2 sm:mt-3">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="h-7 sm:h-8 text-xs">
                <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdit} className="h-7 sm:h-8 text-xs">
                <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> Save
              </Button>
            </div>
          </CardContent>
        ) : (
          <>
            {post.content && (
              <CardContent className="pt-0 pb-2 sm:pb-3 px-2.5 sm:px-4">
                <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>
              </CardContent>
            )}

            {post.image_url && (
              <div className="relative bg-muted">
                <img
                  src={post.image_url || "/placeholder.svg"}
                  alt="Post"
                  className="w-full h-auto max-h-[400px] sm:max-h-[500px] object-contain"
                />
              </div>
            )}
          </>
        )}

        <CardFooter className="flex flex-col items-stretch gap-1.5 sm:gap-2 p-2.5 sm:p-4 pt-1.5 sm:pt-2">
          {(localLikesCount > 0 ||
            (post.comments_count && post.comments_count > 0) ||
            (post.shares_count && post.shares_count > 0)) && (
            <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground pb-1.5 sm:pb-2">
              <div className="flex items-center gap-1 sm:gap-1.5">
                {localLikesCount > 0 && (
                  <>
                    <span className="flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-[8px] sm:text-[10px] text-white">
                      <Heart className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-current" />
                    </span>
                    <span>{localLikesCount}</span>
                  </>
                )}
              </div>
              <div className="flex gap-2 sm:gap-3">
                {post.comments_count !== undefined && post.comments_count > 0 && (
                  <button onClick={handleToggleComments} className="hover:underline">
                    {post.comments_count} comments
                  </button>
                )}
                {post.shares_count !== undefined && post.shares_count > 0 && <span>{post.shares_count} shares</span>}
              </div>
            </div>
          )}

          <div className="flex items-center justify-around border-t border-b py-0.5 sm:py-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn("flex-1 h-8 sm:h-10 gap-1 sm:gap-2 rounded-lg", localLiked && "text-rose-500")}
              onClick={handleLike}
              disabled={isLiking}
            >
              <Heart className={cn("h-4 w-4 sm:h-5 sm:w-5", localLiked && "fill-current")} />
              <span className="sr-only">Like</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-8 sm:h-10 gap-1 sm:gap-2 rounded-lg"
              onClick={handleToggleComments}
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
              disabled={isSaving}
            >
              <Bookmark className={cn("h-4 w-4 sm:h-5 sm:w-5", localSaved && "fill-current")} />
              <span className="sr-only">Save</span>
            </Button>
          </div>

          {showComments && (
            <div className="pt-1.5 sm:pt-2 space-y-2 sm:space-y-3">
              {comments.length > 0 ? (
                <div className="space-y-2 sm:space-y-3 max-h-48 sm:max-h-60 overflow-y-auto">
                  {comments.map((comment) => {
                    const commenter = comment.profiles as Profile
                    return (
                      <div key={comment.id} className="flex gap-1.5 sm:gap-2">
                        <Link href={`/profile/${commenter.id}`} className="shrink-0">
                          <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                            <AvatarImage src={commenter.avatar_url || ""} />
                            <AvatarFallback className="text-[10px] sm:text-xs">
                              {commenter.display_name?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="bg-muted rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2">
                            <Link
                              href={`/profile/${commenter.id}`}
                              className="font-semibold text-[10px] sm:text-xs hover:underline"
                            >
                              {commenter.display_name || commenter.username}
                            </Link>
                            <p className="text-xs sm:text-sm break-words">{comment.content}</p>
                          </div>
                          <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 px-2">
                            {format(new Date(comment.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-[10px] sm:text-xs text-muted-foreground text-center py-2 sm:py-3">
                  No comments yet. Be the first!
                </p>
              )}

              <form onSubmit={handleSubmitComment} className="flex gap-1.5 sm:gap-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 h-8 sm:h-9 text-xs sm:text-sm rounded-full bg-muted border-0"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full"
                  disabled={!newComment.trim() || isSubmittingComment}
                >
                  <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </form>
            </div>
          )}
        </CardFooter>
      </Card>

      <ShareDialog open={showShare} onOpenChange={setShowShare} post={post} currentUserId={currentUserId} />
    </>
  )
}
