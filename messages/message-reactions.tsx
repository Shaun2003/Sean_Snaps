"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Smile } from "lucide-react"
import { cn } from "@/lib/utils"

interface MessageReactionsProps {
  messageId: string
  currentUserId: string
  onReactionsChange?: () => void
}

const EMOJI_REACTIONS = ["❤️", "😂", "😮", "😢", "😍", "🔥", "👏", "🙏", "👍", "👎"]

export function MessageReactions({ messageId, currentUserId, onReactionsChange }: MessageReactionsProps) {
  const [reactions, setReactions] = useState<{ emoji: string; count: number; hasReacted: boolean }[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchReactions()
  }, [messageId])

  const fetchReactions = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from("message_reactions")
        .select("emoji, user_id")
        .eq("message_id", messageId)

      const reactionsMap = new Map<string, { count: number; hasReacted: boolean }>()

      data?.forEach((reaction: { emoji: string; user_id: string }) => {
        const current = reactionsMap.get(reaction.emoji) || { count: 0, hasReacted: false }
        current.count++
        if (reaction.user_id === currentUserId) {
          current.hasReacted = true
        }
        reactionsMap.set(reaction.emoji, current)
      })

      const formattedReactions = Array.from(reactionsMap.entries()).map(([emoji, { count, hasReacted }]) => ({
        emoji,
        count,
        hasReacted,
      }))

      setReactions(formattedReactions)
    } catch (err) {
      console.error("Error fetching message reactions:", err)
    }
  }

  const handleReact = async (emoji: string) => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const existing = await supabase
        .from("message_reactions")
        .select("id")
        .eq("message_id", messageId)
        .eq("user_id", currentUserId)
        .eq("emoji", emoji)
        .single()

      if (existing.data) {
        // User already has this reaction, remove it (toggle)
        await supabase.from("message_reactions").delete().eq("id", existing.data.id)
      } else {
        // Check if user has any other reaction on this message and remove it first
        const { data: userReactions } = await supabase
          .from("message_reactions")
          .select("id")
          .eq("message_id", messageId)
          .eq("user_id", currentUserId)

        if (userReactions && userReactions.length > 0) {
          // Delete all existing reactions from this user on this message
          await supabase
            .from("message_reactions")
            .delete()
            .eq("message_id", messageId)
            .eq("user_id", currentUserId)
        }

        // Add the new reaction
        await supabase.from("message_reactions").insert({
          message_id: messageId,
          user_id: currentUserId,
          emoji,
        })
      }

      fetchReactions()
      onReactionsChange?.()
    } catch (err) {
      console.error("Error adding message reaction:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex gap-1 flex-wrap items-center">
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => handleReact(reaction.emoji)}
          disabled={isLoading}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors",
            reaction.hasReacted
              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700",
          )}
        >
          <span>{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </button>
      ))}

      <Popover>
        <PopoverTrigger asChild>
          <button
            data-slot="popover-trigger"
            className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 rounded-md gap-1.5 has-[>svg]:px-2.5 h-8 px-2 text-xs"
            title="Add reaction"
            type="button"
            disabled={isLoading}
            aria-haspopup="dialog"
          >
            <Smile className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          <div className="grid grid-cols-5 gap-2">
            {EMOJI_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                disabled={isLoading}
                className="text-xl p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
