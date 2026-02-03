"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Post, Profile, Comment } from "@/lib/types"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MessageCircle, Share2, MoreHorizontal, Send, Pencil, X, Check, Repeat2, Bookmark, Smile, ImagePlus, Video } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { ShareDialog } from "./share-dialog"
import { EmojiReactions } from "./emoji-reactions"
import { CarouselPost } from "./carousel-post"
import { VideoPlayer } from "./video-player"
import { ParseHashtags } from "@/components/explore/hashtag-parser"
import { ParseMentions } from "./mention-autocomplete"
import { PostDetailDialog } from "@/components/explore/post-detail-dialog"
import { CommentItem } from "./comment-item"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"

interface ReactionsPreviewProps {
  postId: string
  onCommentClick: () => void
  commentsCount?: number
  sharesCount?: number
}

function ReactionsPreview({ postId, onCommentClick, commentsCount = 0, sharesCount = 0 }: ReactionsPreviewProps) {
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
          (payload: any) => {
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

  if (reactionCount === 0 && commentsCount === 0 && sharesCount === 0) {
    return null
  }

  return (
    <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground pb-1.5 sm:pb-2">
      <div className="flex items-center gap-2">
        {reactionCount > 0 && (
          <div className="flex -space-x-3">
            {usersWithReactions.map((userReaction) => (
              <div key={userReaction.id} className="relative">
                <Avatar className="h-6 w-6 sm:h-7 sm:w-7 border-2 border-background">
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
        {commentsCount !== undefined && commentsCount > 0 && (
          <button onClick={onCommentClick} className="hover:underline">
            {commentsCount} comment{commentsCount !== 1 ? 's' : ''}
          </button>
        )}
        {sharesCount !== undefined && sharesCount > 0 && <span>{sharesCount} share{sharesCount !== 1 ? 's' : ''}</span>}
      </div>
    </div>
  )
}

interface PostCardProps {
  post: Post & {
    reshared_by?: Profile
    original_post?: Post & { profiles: Profile }
    is_saved?: boolean
  }
  currentUserId: string
  onUpdate: () => void
  onPostClick?: () => void
}

const getThemeClass = (theme: string | null | undefined): string => {
  const themeClasses: Record<string, string> = {
    "gradient-sunset": "bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 text-white",
    "gradient-ocean": "bg-gradient-to-br from-blue-400 via-cyan-500 to-teal-600 text-white",
    "gradient-forest": "bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 text-white",
    "gradient-royal": "bg-gradient-to-br from-purple-400 via-pink-500 to-rose-600 text-white",
  }
  return theme && themeClasses[theme] ? themeClasses[theme] : ""
}

export function PostCard({ post, currentUserId, onUpdate, onPostClick }: PostCardProps) {
  const [isLiking, setIsLiking] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [localLiked, setLocalLiked] = useState(post.is_liked)
  const [localLikesCount, setLocalLikesCount] = useState(post.likes_count || 0)
  const [localSaved, setLocalSaved] = useState(post.is_saved || false)
  const [isSaving, setIsSaving] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content || "")
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const [editImagePreview, setEditImagePreview] = useState<string | null>(post.image_url || null)
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null)
  const [editVideoPreview, setEditVideoPreview] = useState<string | null>(post.video_url || null)
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null)
  const [replyingToUser, setReplyingToUser] = useState<string | null>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)
  const editVideoInputRef = useRef<HTMLInputElement>(null)

  const profile = post.profiles as Profile
  const isReshare = !!post.reshared_by

  const fetchComments = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("comments")
      .select("*, profiles (*)")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true })

    if (data) {
      // Organize comments with their replies
      const parentComments = data.filter((c: any) => !c.parent_id)
      const replies = data.filter((c: any) => c.parent_id)

      // Attach replies to parent comments
      const commentsWithReplies = parentComments.map((parent: any) => ({
        ...parent,
        replies: replies.filter((r: any) => r.parent_id === parent.id),
      }))

      setComments(commentsWithReplies)
    }
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
      parent_id: replyingToCommentId,
    })

    if (post.user_id !== currentUserId && !replyingToCommentId) {
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
    setReplyingToCommentId(null)
    setReplyingToUser(null)
    await fetchComments()
    setIsSubmittingComment(false)
    onUpdate()
  }

  const handleEditComment = async (commentId: string, newContent: string) => {
    const supabase = createClient()
    await supabase
      .from("comments")
      .update({ content: newContent, updated_at: new Date().toISOString() })
      .eq("id", commentId)
      .eq("user_id", currentUserId)

    await fetchComments()
  }

  const handleDeleteComment = async (commentId: string) => {
    const supabase = createClient()
    await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", currentUserId)

    await fetchComments()
  }

  const handleReplyComment = (commentId: string, userName: string) => {
    setReplyingToCommentId(commentId)
    setReplyingToUser(userName)
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
    let imageUrl = post.image_url
    let videoUrl = post.video_url

    // Upload new image if selected
    if (editImageFile) {
      const fileName = `post-image-${post.id}-${Date.now()}.jpg`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("posts")
        .upload(fileName, editImageFile, { upsert: true })
      
      if (!uploadError && uploadData) {
        const { data } = supabase.storage.from("posts").getPublicUrl(fileName)
        imageUrl = data.publicUrl
      }
    }

    // Upload new video if selected
    if (editVideoFile) {
      const fileName = `post-video-${post.id}-${Date.now()}.webm`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("posts")
        .upload(fileName, editVideoFile, { upsert: true })
      
      if (!uploadError && uploadData) {
        const { data } = supabase.storage.from("posts").getPublicUrl(fileName)
        videoUrl = data.publicUrl
      }
    }

    await supabase
      .from("posts")
      .update({
        content: editContent,
        image_url: imageUrl,
        video_url: videoUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", post.id)
    
    setIsEditing(false)
    setEditImageFile(null)
    setEditVideoFile(null)
    onUpdate?.()
  }

  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setEditImageFile(file)
      setEditVideoFile(null)
      setEditVideoPreview(null)
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleEditVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setEditVideoFile(file)
      setEditImageFile(null)
      setEditImagePreview(null)
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditVideoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveEditMedia = () => {
    setEditImageFile(null)
    setEditImagePreview(post.image_url || null)
    setEditVideoFile(null)
    setEditVideoPreview(post.video_url || null)
  }


  const handleUnfollow = async () => {
    try {
      const supabase = createClient()
      await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", post.user_id)
      onUpdate()
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

      if (!existing || existing.length === 0) {
        await supabase.from("muted_users").insert({
          user_id: currentUserId,
          muted_user_id: post.user_id,
        })
      }
      onUpdate()
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
        status: "pending",
      })
      alert("Post reported successfully. Our team will review it shortly.")
    } catch (err) {
      console.error("Error reporting post:", err)
    }
  }

  return (
    <>
      <Card className="overflow-hidden w-full border-0 shadow-lg bg-linear-to-br from-card to-card/80 rounded-xl mb-4 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] animate-in fade-in">
        {isReshare && post.reshared_by && (
          <div className="flex items-center gap-1.5 sm:gap-2 px-4 py-2 bg-linear-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 text-[10px] sm:text-xs text-muted-foreground border-b">
            <Repeat2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <Link href={`/profile/${post.reshared_by.id}`} className="font-medium hover:underline">
              {post.reshared_by.display_name || post.reshared_by.username}
            </Link>
            <span>shared this</span>
          </div>
        )}

        {/* Facebook Style Header */}
        <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-4 sm:p-5 border-b border-border/30 bg-linear-to-r from-background/50 to-background/30">
          <Link href={`/profile/${profile.id}`}>
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 ring-2 ring-background shadow-md transition-all duration-200 hover:scale-110">
              <AvatarImage src={profile.avatar_url || ""} />
              <AvatarFallback className="bg-linear-to-br from-blue-500 via-purple-500 to-pink-500 text-primary-foreground text-sm font-semibold">
                {profile.display_name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link
              href={`/profile/${profile.id}`}
              className="font-bold text-sm sm:text-base bg-clip-text text-transparent bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 truncate block transition-all duration-200"
            >
              {profile.display_name || profile.username}
            </Link>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              {format(new Date(post.created_at), "MMM d 'at' h:mm a")}
              {post.updated_at && post.updated_at !== post.created_at && " · Edited"}
            </p>
          </div>
          {post.user_id === currentUserId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-muted rounded-lg transition-all duration-200">
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
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-muted rounded-lg transition-all duration-200">
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
        </CardHeader>

        {isEditing ? (
          <CardContent className="px-2.5 sm:px-4 pb-2.5 sm:pb-3">
            <div className="space-y-3">
              {/* Media preview/editor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(editImagePreview || editVideoPreview) && (
                  <div className="relative bg-black rounded-lg overflow-hidden h-40 sm:h-48">
                    {editImagePreview && (
                      <img src={editImagePreview} alt="Edit preview" className="w-full h-full object-cover" />
                    )}
                    {editVideoPreview && (
                      <video src={editVideoPreview} className="w-full h-full object-cover" />
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveEditMedia}
                      className="absolute top-2 right-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                {/* Media upload buttons */}
                <div className="space-y-2">
                  <input 
                    ref={editFileInputRef} 
                    type="file" 
                    accept="image/*" 
                    onChange={handleEditImageSelect} 
                    className="hidden" 
                  />
                  <input 
                    ref={editVideoInputRef} 
                    type="file" 
                    accept="video/*" 
                    onChange={handleEditVideoSelect} 
                    className="hidden" 
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editFileInputRef.current?.click()}
                    className="w-full text-xs"
                  >
                    <ImagePlus className="h-4 w-4 mr-1" /> Change Photo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editVideoInputRef.current?.click()}
                    className="w-full text-xs"
                  >
                    <Video className="h-4 w-4 mr-1" /> Change Video
                  </Button>
                </div>
              </div>
              
              {/* Text editor */}
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-15 sm:min-h-20 text-xs sm:text-sm resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 mt-2 sm:mt-3">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="h-7 sm:h-8 text-xs bg-transparent">
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
              <CardContent className={cn(
                "pt-0 pb-2 sm:pb-3 px-2.5 sm:px-4 rounded-lg",
                getThemeClass(post.theme)
              )}>
                <ParseHashtags 
                  text={post.content} 
                  className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed"
                />
              </CardContent>
            )}

            {/* Carousel posts or single image */}
            {post.post_media && post.post_media.length > 0 ? (
              <CardContent className="pt-0 pb-2 sm:pb-3 px-0">
                <CarouselPost media={post.post_media} onMediaClick={onPostClick} />
              </CardContent>
            ) : post.image_url ? (
              <CardContent className="pt-0 pb-2 sm:pb-3 px-0">
                <div className="relative bg-muted cursor-pointer" onClick={onPostClick}>
                  <img
                    src={post.image_url}
                    alt="Post"
                    className="w-full h-auto max-h-100 sm:max-h-125 object-contain"
                  />
                </div>
              </CardContent>
            ) : null}

            {/* Video support */}
            {post.video_url && !post.post_media && (
              <CardContent className="pt-0 pb-2 sm:pb-3 px-0">
                <VideoPlayer src={post.video_url} className="rounded-lg overflow-hidden" />
              </CardContent>
            )}
          </>
        )}

        <CardFooter className="flex flex-col items-stretch gap-1.5 sm:gap-2 p-2.5 sm:p-4 pt-1.5 sm:pt-2">
          <ReactionsPreview postId={post.id} onCommentClick={handleToggleComments} commentsCount={post.comments_count} sharesCount={post.shares_count} />


          <div className="flex items-center justify-around border-t border-b py-0.5 sm:py-1">
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
            <div className="flex-1 flex items-center justify-center px-1">
              <EmojiReactions postId={post.id} currentUserId={currentUserId} onReactionsChange={onUpdate} />
            </div>
          </div>

          {showComments && (
            <div className="pt-1.5 sm:pt-2 space-y-2 sm:space-y-3">
              {comments.length > 0 ? (
                <div className="space-y-2 sm:space-y-3 max-h-48 sm:max-h-60 overflow-y-auto">
                  {comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      currentUserId={currentUserId}
                      onReply={handleReplyComment}
                      onEdit={handleEditComment}
                      onDelete={handleDeleteComment}
                      replyingTo={comment.parent_id ? replyingToUser : null}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-[10px] sm:text-xs text-muted-foreground text-center py-2 sm:py-3">
                  No comments yet. Be the first!
                </p>
              )}

              <form onSubmit={handleSubmitComment} className="space-y-1.5 sm:space-y-2">
                {replyingToUser && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground px-2">
                    <span>Replying to {replyingToUser}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingToCommentId(null)
                        setReplyingToUser(null)
                      }}
                      className="hover:text-foreground ml-auto"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <div className="flex gap-1.5 sm:gap-2">
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
                </div>
              </form>
            </div>
          )}
        </CardFooter>
      </Card>

      <ShareDialog open={showShare} onOpenChange={setShowShare} post={post} currentUserId={currentUserId} />
      <PostDetailDialog 
        post={post} 
        currentUserId={currentUserId} 
        open={showDetailDialog} 
        onOpenChange={setShowDetailDialog} 
      />
    </>
  )
}
