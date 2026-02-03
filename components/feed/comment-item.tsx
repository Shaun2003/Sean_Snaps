"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Comment, Profile } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { MoreHorizontal, Send, Smile, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react"

interface CommentItemProps {
  comment: Comment & { profiles: Profile; replies?: Array<Comment & { profiles: Profile }> }
  currentUserId: string
  onReply?: (commentId: string, repliedTo: string) => void
  onEdit?: (commentId: string, content: string) => void
  onDelete?: (commentId: string) => void
  replyingTo?: string | null
}

const EMOJI_REACTIONS = ["❤️", "😂", "😮", "😢", "🔥", "👏", "🙏"]

export function CommentItem({
  comment,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  replyingTo,
}: CommentItemProps) {
  const [reactions, setReactions] = useState<Array<{ emoji: string; count: number; hasReacted: boolean; users: Array<{ id: string; username: string; display_name: string; avatar_url: string | null }> }>>([])
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(comment.content || "")
  const [isLoading, setIsLoading] = useState(false)
  const [showReplies, setShowReplies] = useState(false)
  const commenter = comment.profiles as Profile
  const replyCount = comment.replies?.length || 0

  useEffect(() => {
    fetchReactions()
  }, [comment.id])

  const fetchReactions = async () => {
    try {
      console.log("📥 fetchReactions called for comment:", comment.id)
      const supabase = createClient()
      const { data: reactions, error } = await supabase
        .from("comment_reactions")
        .select("emoji, user_id")
        .eq("comment_id", comment.id)

      console.log("📊 Raw reactions data:", reactions, "Error:", error)

      if (!reactions || reactions.length === 0) {
        console.log("📭 No reactions found")
        setReactions([])
        return
      }

      // Get unique user IDs
      const userIds = Array.from(new Set(reactions.map((r: any) => r.user_id)))
      console.log("👥 Unique user IDs:", userIds)

      // Fetch user profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds)

      console.log("👤 Profiles fetched:", profiles)

      const profilesMap = new Map()
      profiles?.forEach((profile: any) => {
        profilesMap.set(profile.id, profile)
      })

      const reactionsMap = new Map<string, { count: number; hasReacted: boolean; users: Array<{ id: string; username: string; display_name: string; avatar_url: string | null }> }>()

      reactions.forEach((reaction: any) => {
        const current = reactionsMap.get(reaction.emoji) || { count: 0, hasReacted: false, users: [] }
        current.count++
        const userProfile = profilesMap.get(reaction.user_id)
        if (userProfile) {
          current.users.push(userProfile)
        }
        if (reaction.user_id === currentUserId) {
          current.hasReacted = true
        }
        reactionsMap.set(reaction.emoji, current)
      })

      const formattedReactions = Array.from(reactionsMap.entries()).map(([emoji, { count, hasReacted, users }]) => ({
        emoji,
        count,
        hasReacted,
        users,
      }))

      console.log("✅ Formatted reactions:", formattedReactions)
      setReactions(formattedReactions)
    } catch (err) {
      console.error("❌ Error fetching reactions:", err)
    }
  }

  const handleReact = async (emoji: string) => {
    console.log("🎯 handleReact called with emoji:", emoji, "for comment:", comment.id)
    setIsLoading(true)
    try {
      const supabase = createClient()
      console.log("✅ Supabase client created")
      
      const { data: existing, error: checkError } = await supabase
        .from("comment_reactions")
        .select("id")
        .eq("comment_id", comment.id)
        .eq("user_id", currentUserId)
        .eq("emoji", emoji)

      console.log("📊 Existing reactions query result:", existing, "Error:", checkError)

      if (checkError) {
        console.error("❌ Error checking existing reaction:", checkError)
        return
      }

      if (existing && existing.length > 0) {
        console.log("🗑️ Deleting existing reaction")
        const { error: deleteError } = await supabase
          .from("comment_reactions")
          .delete()
          .eq("id", existing[0].id)
        
        if (deleteError) {
          console.error("❌ Error deleting reaction:", deleteError)
          return
        }
        console.log("✅ Reaction deleted successfully")
      } else {
        console.log("➕ Adding new reaction")
        const { data: userReactions, error: getUserError } = await supabase
          .from("comment_reactions")
          .select("id")
          .eq("comment_id", comment.id)
          .eq("user_id", currentUserId)

        if (getUserError) {
          console.error("❌ Error fetching user reactions:", getUserError)
          return
        }

        if (userReactions && userReactions.length > 0) {
          console.log("🗑️ Deleting old reactions before adding new one")
          const { error: deleteOldError } = await supabase
            .from("comment_reactions")
            .delete()
            .eq("comment_id", comment.id)
            .eq("user_id", currentUserId)
          
          if (deleteOldError) {
            console.error("❌ Error deleting old reactions:", deleteOldError)
            return
          }
        }

        const { error: insertError } = await supabase.from("comment_reactions").insert({
          comment_id: comment.id,
          user_id: currentUserId,
          emoji,
        })

        if (insertError) {
          console.error("❌ Error inserting reaction:", insertError)
          return
        }
        console.log("✅ Reaction inserted successfully")
      }

      console.log("🔄 Fetching updated reactions")
      await fetchReactions()
      console.log("✅ Reactions fetched, state updated")
    } catch (err) {
      console.error("❌ Error handling reaction:", err)
    } finally {
      setIsLoading(false)
      console.log("✅ Loading complete")
    }
  }

  const handleEditSubmit = async () => {
    if (onEdit && editedContent.trim()) {
      await onEdit(comment.id, editedContent.trim())
      setIsEditing(false)
    }
  }

  return (
    <div className="w-full">
      {/* Parent comment or reply with flex layout */}
      <div className="flex gap-2">
        <Link href={`/profile/${commenter.id}`} className="shrink-0">
          <Avatar className={comment.parent_id ? "h-6 w-6 sm:h-7 sm:w-7" : "h-7 w-7 sm:h-8 sm:w-8"}>
            <AvatarImage src={commenter.avatar_url || ""} />
            <AvatarFallback className={comment.parent_id ? "text-[8px] sm:text-[9px]" : "text-[10px] sm:text-xs"}>
              {commenter.display_name?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="bg-muted rounded-2xl px-3 py-1.5">
            <Link
              href={`/profile/${commenter.id}`}
              className="font-semibold text-[10px] sm:text-xs hover:underline"
            >
              {commenter.display_name || commenter.username}
            </Link>
            {replyingTo && (
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                replying to {replyingTo}
              </p>
            )}
            {isEditing ? (
              <div className="flex gap-1 mt-1">
                <Input
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="h-7 text-xs"
                  autoFocus
                />
                <Button size="sm" className="h-7 w-7 p-0" onClick={handleEditSubmit}>
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <p className="text-xs sm:text-sm wrap-break-word">{comment.content}</p>
            )}
          </div>
          
          {/* Comment reactions display - like post card */}
          {reactions.length > 0 && (
            <div className="flex items-center gap-2 mt-2 text-[9px] sm:text-[10px]">
              <div className="flex items-center gap-0.5">
                {reactions.slice(0, 3).map((reaction) => (
                  <div key={reaction.emoji} className="relative">
                    <Avatar className="h-5 w-5 border border-background">
                      <AvatarImage src={reaction.users[0]?.avatar_url || ""} />
                      <AvatarFallback className="text-[8px]">
                        {reaction.users[0]?.display_name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5 text-[10px]">{reaction.emoji}</span>
                  </div>
                ))}
              </div>
              <span className="text-muted-foreground">
                {reactions.reduce((sum, r) => sum + r.count, 0)} {reactions.reduce((sum, r) => sum + r.count, 0) === 1 ? "reaction" : "reactions"}
              </span>
            </div>
          )}

          {/* Comment action buttons */}
          <div className="flex items-center gap-2 mt-2">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">
              {format(new Date(comment.created_at), "MMM d, yyyy")}
            </p>

            {currentUserId === commenter.id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-muted rounded">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem
                    onClick={() => setIsEditing(true)}
                    className="cursor-pointer"
                  >
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete?.(comment.id)}
                    className="text-destructive cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 hover:bg-muted rounded"
                  disabled={isLoading}
                >
                  <Smile className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2">
                <div className="grid grid-cols-4 gap-1">
                  {EMOJI_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReact(emoji)}
                      disabled={isLoading}
                      className="text-lg p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-[9px] sm:text-[10px] px-1"
              onClick={() => onReply?.(comment.id, commenter.display_name || commenter.username || "user")}
            >
              Reply
            </Button>
          </div>
        </div>
      </div>

      {/* Replies Section - Display below parent comment in full width */}
      {replyCount > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[9px] sm:text-[10px] px-0 text-muted-foreground hover:text-foreground mb-2"
            onClick={() => setShowReplies(!showReplies)}
          >
            {showReplies ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Hide {replyCount} {replyCount === 1 ? "reply" : "replies"}
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                View {replyCount} {replyCount === 1 ? "reply" : "replies"}
              </>
            )}
          </Button>

          {showReplies && (
            <div className="space-y-3">
              {comment.replies?.map((reply: any) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
