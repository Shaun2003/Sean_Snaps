"use client"

import { X } from "lucide-react"
import { Message, Profile } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface ReplyPreviewProps {
  message: Message & { profiles?: Profile }
  onClearReply: () => void
}

export function ReplyPreview({ message, onClearReply }: ReplyPreviewProps) {
  const getPreviewText = () => {
    if (message.content) return message.content
    if (message.file_name) return `📎 ${message.file_name}`
    if (message.file_url && !message.file_name) {
      if (message.file_type?.startsWith("image")) return "📷 Image"
      if (message.file_type?.startsWith("video")) return "🎥 Video"
      if (message.file_type?.includes("audio")) return "🎤 Voice note"
      return "📄 File"
    }
    return "Message"
  }

  return (
    <div className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950 p-3 rounded-lg flex gap-2 items-start">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
          Replying to {message.profiles?.display_name || message.profiles?.username}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
          {getPreviewText()}
        </p>
      </div>
      <button
        onClick={onClearReply}
        className="shrink-0 p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded transition-colors"
        aria-label="Clear reply"
      >
        <X className="w-4 h-4 text-blue-700 dark:text-blue-300" />
      </button>
    </div>
  )
}
