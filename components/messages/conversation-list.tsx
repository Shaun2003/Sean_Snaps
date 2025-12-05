"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Conversation, Profile, Message } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { Users } from "lucide-react"

interface ConversationListProps {
  userId: string
  selectedId: string | null
  onSelect: (id: string) => void
}

interface ConversationWithDetails extends Conversation {
  otherParticipants: Profile[]
  lastMessage?: Message
  unreadCount: number
}

export function ConversationList({ userId, selectedId, onSelect }: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([])

  const fetchConversations = useCallback(async () => {
    const supabase = createClient()

    // Get user's conversations
    const { data: participations } = await supabase
      .from("conversation_participants")
      .select(`
        conversation_id,
        last_read_at,
        conversations (*)
      `)
      .eq("user_id", userId)

    if (!participations) return

    const conversationsWithDetails = await Promise.all(
      participations.map(async (p) => {
        const conversation = p.conversations as Conversation

        // Get other participants
        const { data: participants } = await supabase
          .from("conversation_participants")
          .select("profiles (*)")
          .eq("conversation_id", p.conversation_id)
          .neq("user_id", userId)

        // Get last message
        const { data: messages } = await supabase
          .from("messages")
          .select("*, profiles (*)")
          .eq("conversation_id", p.conversation_id)
          .order("created_at", { ascending: false })
          .limit(1)

        // Get unread count
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", p.conversation_id)
          .neq("user_id", userId)
          .gt("created_at", p.last_read_at)

        return {
          ...conversation,
          otherParticipants: participants?.map((pt) => pt.profiles as Profile) || [],
          lastMessage: messages?.[0],
          unreadCount: count || 0,
        }
      }),
    )

    // Sort by last message time
    conversationsWithDetails.sort((a, b) => {
      const aTime = a.lastMessage?.created_at || a.created_at
      const bTime = b.lastMessage?.created_at || b.created_at
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })

    setConversations(conversationsWithDetails)
  }, [userId])

  useEffect(() => {
    fetchConversations()

    const supabase = createClient()
    const channel = supabase
      .channel("conversations-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => fetchConversations())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => fetchConversations())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchConversations])

  const getConversationName = (conv: ConversationWithDetails) => {
    if (conv.is_group && conv.name) return conv.name
    return conv.otherParticipants.map((p) => p.display_name || p.username).join(", ") || "Unknown"
  }

  const getConversationAvatar = (conv: ConversationWithDetails) => {
    if (conv.is_group) return null
    return conv.otherParticipants[0]?.avatar_url
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground">No conversations yet</div>
      ) : (
        conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={cn(
              "w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors text-left",
              selectedId === conv.id && "bg-accent",
            )}
          >
            {conv.is_group ? (
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            ) : (
              <Avatar className="h-12 w-12">
                <AvatarImage src={getConversationAvatar(conv) || ""} />
                <AvatarFallback>{getConversationName(conv)[0]?.toUpperCase() || "?"}</AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className={cn("font-medium text-sm truncate", conv.unreadCount > 0 && "font-semibold")}>
                  {getConversationName(conv)}
                </p>
                {conv.lastMessage && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conv.lastMessage.created_at), { addSuffix: false })}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p
                  className={cn(
                    "text-sm truncate",
                    conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground",
                  )}
                >
                  {conv.lastMessage?.file_url
                    ? `📎 ${conv.lastMessage.file_type || "File"}`
                    : conv.lastMessage?.content || "No messages yet"}
                </p>
                {conv.unreadCount > 0 && (
                  <Badge className="ml-2 h-5 min-w-[20px] rounded-full px-1.5">{conv.unreadCount}</Badge>
                )}
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  )
}
