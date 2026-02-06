"use client"

import { Message, Profile } from "@/lib/types"
import { cn } from "@/lib/utils"

interface RepliedMessageProps {
  message: Message & { profiles?: Profile }
  className?: string
}

export function RepliedMessage({ message, className }: RepliedMessageProps) {
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
    <div
      className={cn(
        "border-l-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm mb-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors",
        className
      )}
    >
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-0.5">
        {message.profiles?.display_name || message.profiles?.username}
      </p>
      <p className="text-gray-700 dark:text-gray-300 truncate">
        {getPreviewText()}
      </p>
    </div>
  )
}
