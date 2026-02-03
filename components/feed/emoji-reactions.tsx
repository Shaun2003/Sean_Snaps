"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Smile } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmojiReactionsProps {
  postId: string
  currentUserId: string
  onReactionsChange?: () => void
}

const EMOJI_REACTIONS = ["❤️", "😂", "😮", "😢", "🔥", "👏", "🙏"]

export function EmojiReactions({ postId, currentUserId, onReactionsChange }: EmojiReactionsProps) {
  const [reactions, setReactions] = useState<{ emoji: string; count: number; hasReacted: boolean; users: Array<{ id: string; username: string; display_name: string }> }[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const subscriptionRef = useRef<ReturnType<typeof createClient>['from'] | null>(null)

  useEffect(() => {
    fetchReactions()
    setupRealtimeSubscription()

    return () => {
      if (subscriptionRef.current) {
        const supabase = createClient()
        supabase.removeAllChannels()
      }
    }
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
        return
      }

      // Get unique user IDs
      const userIds = Array.from(new Set(reactions.map((r: any) => r.user_id)))

      // Fetch user profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .in("id", userIds)

      const profilesMap = new Map()
      profiles?.forEach((profile: any) => {
        profilesMap.set(profile.id, profile)
      })

      const reactionsMap = new Map<string, { count: number; hasReacted: boolean; users: Array<{ id: string; username: string; display_name: string }> }>()

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

      setReactions(formattedReactions)
    } catch (err) {
      console.error("Error fetching reactions:", err)
    }
  }

  const handleReact = async (emoji: string) => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data: existing } = await supabase
        .from("post_reactions")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", currentUserId)
        .eq("emoji", emoji)

      if (existing && existing.length > 0) {
        await supabase.from("post_reactions").delete().eq("id", existing[0].id)
      } else {
        const { data: userReactions } = await supabase
          .from("post_reactions")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", currentUserId)

        if (userReactions && userReactions.length > 0) {
          await supabase
            .from("post_reactions")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", currentUserId)
        }

        await supabase.from("post_reactions").insert({
          post_id: postId,
          user_id: currentUserId,
          emoji,
        })
      }

      fetchReactions()
      onReactionsChange?.()
    } catch (err) {
      console.error("Error adding reaction:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 rounded-md gap-1.5 has-[>svg]:px-2.5 h-8 px-2 text-xs",
            "w-8 sm:w-10 sm:h-10"
          )}
          title="Add reaction"
          type="button"
          disabled={isLoading}
          aria-haspopup="dialog"
        >
          <Smile className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="grid grid-cols-4 gap-2">
          {EMOJI_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              disabled={isLoading}
              className="text-2xl p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
