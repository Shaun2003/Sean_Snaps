"use client"

import { useState } from "react"
import { Eye, Lock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Message } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ViewOnceProps {
  message: Message
  isOwn: boolean
  className?: string
  onViewed?: () => void
}

export function ViewOnce({
  message,
  isOwn,
  className,
  onViewed,
}: ViewOnceProps) {
  const [isMarking, setIsMarking] = useState(false)
  const supabase = createClient()

  const handleReveal = async () => {
    if (isOwn) return

    try {
      setIsMarking(true)

      // Mark as viewed in database
      const { error } = await supabase
        .from("messages")
        .update({
          is_viewed: true,
          viewed_at: new Date().toISOString(),
        })
        .eq("id", message.id)

      if (!error) {
        onViewed?.()
      }
    } catch (error) {
      console.error("Failed to mark as viewed:", error)
    } finally {
      setIsMarking(false)
    }
  }

  // If own message and view-once, show lock icon and status
  if (isOwn) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50", className)}>
        <Lock className="w-4 h-4 text-muted-foreground" />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">View once</span>
          <span className="text-xs text-muted-foreground/70">
            {message.is_viewed ? "✓ Viewed" : "Not yet viewed"}
          </span>
        </div>
      </div>
    )
  }

  // For receiver - show locked view prompt
  return (
    <button
      onClick={handleReveal}
      disabled={isMarking}
      className={cn(
        "relative overflow-hidden rounded-lg group cursor-pointer inline-block",
        "bg-gradient-to-br from-purple-500 to-pink-500 px-6 py-8",
        "hover:from-purple-600 hover:to-pink-600 transition-all duration-200",
        "disabled:opacity-75 disabled:cursor-not-allowed",
        "w-full max-w-xs sm:max-w-sm",
        className
      )}
    >
      <div className="flex flex-col items-center justify-center gap-3">
        <Lock className="w-8 h-8 text-white animate-pulse" />
        <div className="text-center">
          <p className="text-white font-semibold">
            {message.file_url && !message.content ? "View Media" : "View Message"}
          </p>
          <p className="text-white text-sm opacity-90">(View Once)</p>
        </div>
        <p className="text-white/80 text-xs font-medium">
          {isMarking ? "Revealing..." : "Tap to reveal"}
        </p>
      </div>
    </button>
  )
}
