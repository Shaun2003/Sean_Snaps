"use client"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Conversation, Profile, Message } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { Users, EyeOff, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface ConversationListProps {
  userId: string
  selectedId: string | null
  onSelect: (id: string) => void
}

interface ConversationWithDetails extends Conversation {
  otherParticipants: Profile[]
  lastMessage?: Message
  unreadCount: number
  is_hidden?: boolean
}

export function ConversationList({ userId, selectedId, onSelect }: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([])
  const [showHidden, setShowHidden] = useState(false)

  const fetchConversations = useCallback(async () => {
    const supabase = createClient()

    const { data: participations } = await supabase
      .from("conversation_participants")
      .select(`
        conversation_id,
        last_read_at,
        is_hidden,
        conversations (*)
      `)
      .eq("user_id", userId)

    if (!participations) return

    const conversationsWithDetails = await Promise.all(
      participations.map(async (p) => {
        const conversation = p.conversations as Conversation | null

        // Skip if conversation data didn't load
        if (!conversation) {
          return null
        }

        const { data: participants } = await supabase
          .from("conversation_participants")
          .select("profiles (*)")
          .eq("conversation_id", p.conversation_id)
          .neq("user_id", userId)

        const { data: messages } = await supabase
          .from("messages")
          .select("*, profiles (*)")
          .eq("conversation_id", p.conversation_id)
          .order("created_at", { ascending: false })
          .limit(1)

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
          is_hidden: p.is_hidden || false,
        }
      }),
    )

    // Filter out null conversations
    const validConversations = conversationsWithDetails.filter((c) => c !== null) as ConversationWithDetails[]

    validConversations.sort((a, b) => {
      const aTime = a.lastMessage?.created_at || a.created_at
      const bTime = b.lastMessage?.created_at || b.created_at
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })

    setConversations(validConversations)
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

  const handleHideChat = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const supabase = createClient()
    await supabase
      .from("conversation_participants")
      .update({ is_hidden: true })
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
    fetchConversations()
  }

  const handleUnhideChat = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const supabase = createClient()
    await supabase
      .from("conversation_participants")
      .update({ is_hidden: false })
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
    fetchConversations()
  }

  const handleDeleteChat = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const supabase = createClient()
    await supabase
      .from("conversation_participants")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
    fetchConversations()
  }

  const getConversationName = (conv: ConversationWithDetails) => {
    if (conv.is_group && conv.name) return conv.name
    return conv.otherParticipants.map((p) => p.display_name || p.username).join(", ") || "Unknown"
  }

  const getConversationAvatar = (conv: ConversationWithDetails) => {
    if (conv.is_group) return null
    return conv.otherParticipants[0]?.avatar_url
  }

  const displayedConversations = showHidden ? conversations : conversations.filter((c) => !c.is_hidden)
  const hiddenCount = conversations.filter((c) => c.is_hidden).length

  return (
    <div className="flex-1 overflow-y-auto">
      {hiddenCount > 0 && (
        <div className="p-2 border-b">
          <Button variant="ghost" size="sm" onClick={() => setShowHidden(!showHidden)} className="w-full text-xs">
            {showHidden ? "Hide" : "Show"} hidden chats ({hiddenCount})
          </Button>
        </div>
      )}

      {displayedConversations.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground">No conversations yet</div>
      ) : (
        displayedConversations.map((conv) => (
          <div
            key={conv.id}
            className={cn(
              "relative group flex items-center gap-3 p-4 hover:bg-accent transition-colors",
              selectedId === conv.id && "bg-accent",
              conv.is_hidden && "opacity-60",
            )}
          >
            <button onClick={() => onSelect(conv.id)} className="absolute inset-0" />

            {conv.is_group ? (
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center relative z-10">
                <Users className="h-6 w-6 text-primary" />
              </div>
            ) : (
              <Avatar className="h-12 w-12 relative z-10">
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 relative z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-lg">⋮</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {conv.is_hidden ? (
                  <DropdownMenuItem onClick={(e) => handleUnhideChat(conv.id, e)}>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Unhide chat
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={(e) => handleHideChat(conv.id, e)}>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide chat
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={(e) => handleDeleteChat(conv.id, e)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))
      )}
    </div>
  )
}
