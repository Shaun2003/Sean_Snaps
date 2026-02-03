"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PenSquare, Search, X } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { Profile } from "@/lib/types"
import { useDebounce } from "@/hooks/use-debounce"
import { useRouter } from "next/navigation"

interface Conversation {
  id: string
  updated_at: string
  other_user: {
    id: string
    username: string | null
    avatar_url: string | null
    full_name: string | null
  } | null
  last_message: {
    content: string
    created_at: string
    sender_id: string
  } | null
}

interface ConversationsListProps {
  conversations: Conversation[]
  currentUserId: string
}

export function ConversationsList({ conversations, currentUserId }: ConversationsListProps) {
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debouncedQuery = useDebounce(searchQuery, 300)
  const router = useRouter()

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    const supabase = createClient()

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", currentUserId)
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(10)

    setSearchResults(data || [])
    setIsSearching(false)
  }

  // Search when debounced query changes
  useState(() => {
    searchUsers(debouncedQuery)
  })

  const startConversation = async (userId: string) => {
    const supabase = createClient()

    // Check if conversation exists
    const { data: existingConversations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", currentUserId)

    if (existingConversations && existingConversations.length > 0) {
      const conversationIds = existingConversations.map((c) => c.conversation_id)

      const { data: sharedConversation } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId)
        .in("conversation_id", conversationIds)
        .single()

      if (sharedConversation) {
        router.push(`/messages/${sharedConversation.conversation_id}`)
        return
      }
    }

    // Create new conversation
    const { data: newConversation } = await supabase.from("conversations").insert({}).select().single()

    if (newConversation) {
      await supabase.from("conversation_participants").insert([
        { conversation_id: newConversation.id, user_id: currentUserId },
        { conversation_id: newConversation.id, user_id: userId },
      ])
      router.push(`/messages/${newConversation.id}`)
    }
  }

  return (
    <div className="container mx-auto max-w-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h1 className="text-xl font-semibold">Messages</h1>
        <Button variant="ghost" size="icon" onClick={() => setShowNewMessage(!showNewMessage)}>
          {showNewMessage ? <X className="h-5 w-5" /> : <PenSquare className="h-5 w-5" />}
        </Button>
      </div>

      {/* New message search */}
      {showNewMessage && (
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                searchUsers(e.target.value)
              }}
              placeholder="Search users to message..."
              className="pl-10 h-11"
              autoFocus
            />
          </div>

          {searchQuery && (
            <div className="mt-4 space-y-1">
              {isSearching ? (
                <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => startConversation(user.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors text-left"
                  >
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-secondary shrink-0">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url || "/placeholder.svg"}
                          alt={user.username || "User"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                          {(user.username || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{user.username}</p>
                      {user.full_name && <p className="text-sm text-muted-foreground">{user.full_name}</p>}
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Conversations list */}
      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <p className="text-lg font-medium mb-2">No messages yet</p>
          <p className="text-muted-foreground mb-4">Start a conversation with someone!</p>
          <Button onClick={() => setShowNewMessage(true)}>
            <PenSquare className="h-4 w-4 mr-2" />
            New Message
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/messages/${conversation.id}`}
              className="flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="h-14 w-14 rounded-full overflow-hidden bg-secondary shrink-0">
                {conversation.other_user?.avatar_url ? (
                  <img
                    src={conversation.other_user.avatar_url || "/placeholder.svg"}
                    alt={conversation.other_user.username || "User"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-lg font-semibold text-muted-foreground">
                    {(conversation.other_user?.username || "U").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold truncate">{conversation.other_user?.username || "Unknown"}</p>
                  {conversation.last_message && (
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conversation.last_message.created_at), {
                        addSuffix: false,
                      })}
                    </span>
                  )}
                </div>
                {conversation.last_message && (
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.last_message.sender_id === currentUserId && "You: "}
                    {conversation.last_message.content}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
