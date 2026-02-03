"use client"

import { cn } from "@/lib/utils"
import { Message, Profile } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"
import Link from "next/link"
import { MessageContextMenu } from "./message-context-menu"
import { MessageReactions } from "./message-reactions"
import { VoiceNotePlayer } from "./voice-note-player"
import { FileText, ImageIcon, Film, Paperclip, AlertCircle } from "lucide-react"

interface MessageBubbleProps {
  message: Message & {
    profiles?: Profile
  }
  isOwn: boolean
  isGroupChat?: boolean
  currentUserId: string
  onEdit: (msg: Message) => void
  onDelete: (messageId: string) => Promise<void>
}

export function MessageBubble({
  message: msg,
  isOwn,
  isGroupChat = false,
  currentUserId,
  onEdit,
  onDelete,
}: MessageBubbleProps) {
  const profile = msg.profiles as Profile

  const renderFileMessage = () => {
    switch (msg.file_type) {
      case "image":
        return (
          <div className="rounded-lg overflow-hidden">
            <img
              src={msg.file_url || "/placeholder.svg"}
              alt="Shared image"
              className="max-w-50 max-h-75 object-cover rounded-lg"
            />
          </div>
        )
      case "video":
        return (
          <div className="rounded-lg overflow-hidden">
            <video
              src={msg.file_url || ""}
              controls
              className="max-w-50 max-h-75 rounded-lg"
            />
          </div>
        )
      case "sticker":
        return (
          <img
            src={msg.file_url || "/placeholder.svg"}
            alt="Sticker"
            className="w-24 h-24 object-contain"
          />
        )
      case "audio/webm":
      case "audio":
        if (!msg.file_url) {
          return (
            <div className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg bg-red-500/10 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span>Voice note unavailable</span>
            </div>
          )
        }
        return (
          <VoiceNotePlayer 
            audioUrl={msg.file_url} 
            className="min-w-62.5"
          />
        )
      case "pdf":
        return (
          <a
            href={msg.file_url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-muted text-primary hover:bg-muted/80 transition-colors"
          >
            <FileText className="h-5 w-5" />
            <span>PDF Document</span>
          </a>
        )
      default:
        return (
          <a
            href={msg.file_url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-muted text-primary hover:bg-muted/80 transition-colors"
          >
            <Paperclip className="h-5 w-5" />
            <span>Download File</span>
          </a>
        )
    }
  }

  return (
    <div className={cn("flex gap-2 group", isOwn && "flex-row-reverse")}>
      {!isOwn && (
        <Link href={`/profile/${profile.id}`}>
          <Avatar className="h-8 w-8 shrink-0 ring-2 ring-background">
            <AvatarImage src={profile.avatar_url || ""} />
            <AvatarFallback className="text-xs">
              {profile.display_name?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
        </Link>
      )}

      <div className={cn("max-w-[70%] flex flex-col", isOwn && "items-end")}>
        {isGroupChat && !isOwn && (
          <p className="text-xs text-muted-foreground mb-1 px-2 font-medium">
            {profile.username}
          </p>
        )}

        <div className="flex items-end gap-1">
          <MessageContextMenu
            messageId={msg.id}
            content={msg.content}
            isOwn={isOwn}
            isEdited={msg.is_edited}
            onEdit={() => onEdit(msg)}
            onDelete={onDelete}
            className={isOwn ? "order-first" : ""}
          />

          <div
            className={cn(
              "rounded-2xl px-4 py-2 transition-all hover:shadow-md",
              isOwn
                ? "bg-linear-to-r from-primary to-purple-600 text-white shadow-sm"
                : "bg-card border border-border shadow-sm",
            )}
          >
            {msg.file_url ? (
              renderFileMessage()
            ) : (
              <div>
                <p className="text-sm whitespace-pre-wrap wrap-break-word">{msg.content}</p>
              </div>
            )}
          </div>
        </div>

        <div
          className={cn(
            "flex items-center gap-1.5 mt-1 px-2 text-xs text-muted-foreground",
            isOwn && "justify-end",
          )}
        >
          <span>{format(new Date(msg.created_at), "h:mm a")}</span>
          {msg.is_edited && <span className="italic">(edited)</span>}
        </div>

        {/* Message reactions */}
        <div className="mt-1 px-2">
          <MessageReactions messageId={msg.id} currentUserId={currentUserId} />
        </div>
      </div>
    </div>
  )
}
