"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Message, Profile } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Pencil, Trash2, Copy, Check, X, MoreHorizontal, Smile, Reply, Lock, Eye } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { VoiceNotePlayer } from "./voice-note-player"
import { MediaPreview } from "./media-preview"
import { RepliedMessage } from "./replied-message"
import { ViewOnce } from "./view-once"
import { useToast } from "@/hooks/use-toast"

interface MessageBubbleProps {
  message: Message & { profiles?: Profile; reactions?: Record<string, string[]> }
  isOwn: boolean
  isGroupChat?: boolean
  currentUserId?: string
  onEdit: (msg: Message) => void
  onDelete: (messageId: string) => Promise<void>
  onReact?: (messageId: string, emoji: string) => Promise<void>
  onReply?: (message: Message) => void
}

export function MessageBubble({
  message,
  isOwn,
  isGroupChat,
  currentUserId,
  onEdit,
  onDelete,
  onReact,
  onReply,
}: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content || "")
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [isRevealed, setIsRevealed] = useState(message.is_viewed || false)
  const [isHidden, setIsHidden] = useState(message.is_viewed || false)
  const { toast } = useToast()
  const supabase = createClient()

  // Auto-hide view-once message after 2 seconds of viewing
  useEffect(() => {
    if (isRevealed && message.is_view_once && !isOwn) {
      const timer = setTimeout(() => {
        setIsHidden(true)
      }, 2000) // Show content for 2 seconds, then hide
      return () => clearTimeout(timer)
    }
  }, [isRevealed, message.is_view_once, isOwn])

  const isVoiceNote = message.file_type?.includes("audio")
  const reactions = message.reactions || {}
  const reactionList = Object.entries(reactions).map(([emoji, users]) => ({ emoji, count: users.length }))

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
      toast({
        title: "Copied",
        description: "Message copied to clipboard",
        duration: 2000,
      })
    }
  }

  const handleEdit = async () => {
    if (!editContent.trim()) return

    try {
      setIsSaving(true)
      const { error } = await supabase
        .from("messages")
        .update({ content: editContent })
        .eq("id", message.id)

      if (error) throw error

      onEdit({
        ...message,
        content: editContent,
      })

      setIsEditing(false)
      toast({
        title: "Success",
        description: "Message updated",
        duration: 2000,
      })
    } catch (error) {
      console.error("Error editing message:", error)
      toast({
        title: "Error",
        description: "Failed to update message",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await onDelete(message.id)
      toast({
        title: "Success",
        description: "Message deleted",
        duration: 2000,
      })
    } catch (error) {
      console.error("Error deleting message:", error)
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div
        className={cn(
          "flex gap-2 sm:gap-3 mb-2 sm:mb-3 animate-in fade-in slide-in-from-bottom-2 duration-200 group px-1 sm:px-0",
          isOwn && "flex-row-reverse gap-1.5 sm:gap-2"
        )}
      >
        {/* Avatar */}
        {!isOwn && isGroupChat && (
          <Avatar className="h-8 w-8 mt-1 shrink-0">
            <AvatarImage src={message.profiles?.avatar_url || ""} />
            <AvatarFallback>{message.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        )}

        <div className={cn("flex flex-col gap-1", isOwn && "items-end")}>
          {/* Username in group chats */}
          {!isOwn && isGroupChat && (
            <span className="text-xs font-semibold text-muted-foreground px-2">
              {message.profiles?.display_name || message.profiles?.username}
            </span>
          )}

          {/* Message content */}
          {isEditing ? (
            <div className="flex gap-2 w-full">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-10 text-sm resize-none"
                placeholder="Edit message..."
              />
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleEdit}
                  disabled={isSaving}
                  className="h-8 w-8 p-0"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false)
                    setEditContent(message.content || "")
                  }}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Replied message context */}
              {message.replied_message && (
                <RepliedMessage message={message.replied_message} className="max-w-xs" />
              )}

              {/* Text content */}
              {message.content && !isVoiceNote && (
                <>
                  {message.is_view_once && !isOwn && !isRevealed && !message.is_viewed ? (
                    <ViewOnce
                      message={message}
                      isOwn={isOwn}
                      className="max-w-xs sm:max-w-sm"
                      onViewed={() => setIsRevealed(true)}
                    />
                  ) : message.is_view_once && !isOwn && isHidden && message.is_viewed ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 italic text-muted-foreground text-sm">
                      <Lock className="h-4 w-4 opacity-50" />
                      This message has disappeared
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <div
                        className={cn(
                          "rounded-lg px-3 py-2 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg word-break break-words",
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-br-none"
                            : "bg-muted rounded-bl-none"
                        )}
                      >
                        {message.is_view_once && isOwn ? (
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            <span className="text-xs font-medium">
                              {message.is_viewed ? "✓ Viewed" : "Not yet viewed"}
                            </span>
                          </div>
                        ) : message.is_view_once && message.is_viewed && !isOwn ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <Eye className="h-3 w-3 opacity-70" />
                              <span className="text-xs opacity-70 font-medium">Viewed</span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        )}
                      </div>
                      {reactionList.length > 0 && (
                        <div className="flex flex-wrap gap-1 px-2">
                          {reactionList.map((reaction) => (
                            <button
                              key={reaction.emoji}
                              onClick={() => onReact?.(message.id, reaction.emoji)}
                              className="text-xs bg-muted hover:bg-muted/80 rounded-full px-2 py-1 transition-colors cursor-pointer"
                            >
                              {reaction.emoji} {reaction.count > 1 ? reaction.count : ""}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Voice note player */}
              {isVoiceNote && message.file_url && (
                <>
                  {message.is_view_once && !isOwn && !isRevealed && !message.is_viewed ? (
                    <ViewOnce
                      message={message}
                      isOwn={isOwn}
                      className="max-w-xs sm:max-w-sm"
                      onViewed={() => setIsRevealed(true)}
                    />
                  ) : message.is_view_once && !isOwn && isHidden && message.is_viewed ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 italic text-muted-foreground text-sm">
                      <Lock className="h-4 w-4 opacity-50" />
                      This message has disappeared
                    </div>
                  ) : (
                    <div className={cn("max-w-sm", isOwn && "max-w-xs")}>
                      {message.is_view_once && message.is_viewed && !isOwn && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <Eye className="h-3 w-3" />
                          <span className="font-medium">Viewed</span>
                        </div>
                      )}
                      <VoiceNotePlayer
                        audioUrl={message.file_url}
                        duration={message.duration}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Media attachment - images, videos, documents */}
              {message.file_url && !isVoiceNote && (
                <>
                  {message.is_view_once && !isOwn && !isRevealed && !message.is_viewed ? (
                    <ViewOnce
                      message={message}
                      isOwn={isOwn}
                      className="max-w-xs sm:max-w-sm"
                      onViewed={() => setIsRevealed(true)}
                    />
                  ) : message.is_view_once && !isOwn && isHidden && message.is_viewed ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 italic text-muted-foreground text-sm">
                      <Lock className="h-4 w-4 opacity-50" />
                      This message has disappeared
                    </div>
                  ) : (
                    <div className={cn("mt-2", isOwn && "flex justify-end")}>
                      {(message.is_view_once && message.is_viewed && !isOwn) && (
                        <div className="flex flex-col gap-2 w-full">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Eye className="h-3 w-3" />
                            <span className="font-medium">Viewed</span>
                          </div>
                          <MediaPreview
                            fileUrl={message.file_url}
                            fileType={message.file_type || undefined}
                            fileName={message.file_name || undefined}
                          />
                        </div>
                      )}
                      {message.is_view_once && isOwn && (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Lock className="h-3 w-3" />
                            <span className="font-medium">{message.is_viewed ? "✓ Viewed" : "Not yet viewed"}</span>
                          </div>
                          <MediaPreview
                            fileUrl={message.file_url}
                            fileType={message.file_type || undefined}
                            fileName={message.file_name || undefined}
                          />
                        </div>
                      )}
                      {!message.is_view_once && (
                        <MediaPreview
                          fileUrl={message.file_url}
                          fileType={message.file_type || undefined}
                          fileName={message.file_name || undefined}
                        />
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Timestamp and actions */}
          {!isEditing && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground">
                {format(new Date(message.created_at), "h:mm a")}
                {message.updated_at && message.updated_at !== message.created_at && " (edited)"}
              </span>

              {/* Actions menu - Always visible on mobile, hidden on desktop until hover */}
              <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 md:transition-opacity">
                {onReact && (
                  <DropdownMenu open={showReactions} onOpenChange={setShowReactions}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-muted text-muted-foreground hover:text-foreground">
                        <Smile className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={isOwn ? "end" : "start"} className="w-64">
                      <div className="p-2 flex flex-wrap gap-1">
                        {["👍", "❤️", "😂", "😲", "😢", "😡", "🔥", "✨"].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => {
                              onReact?.(message.id, emoji)
                              setShowReactions(false)
                            }}
                            className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {isOwn && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-muted text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={isOwn ? "end" : "start"} className="w-40">
                      {!isOwn && (
                        <DropdownMenuItem onClick={() => onReply?.(message)}>
                          <Reply className="h-4 w-4 mr-2" />
                          Reply
                        </DropdownMenuItem>
                      )}
                      {message.content && !isVoiceNote && (
                        <DropdownMenuItem onClick={handleCopy}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </DropdownMenuItem>
                      )}
                      {message.content && !isVoiceNote && (
                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => setIsDeleting(true)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete {isVoiceNote ? "Voice Note" : "Message"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The message will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
