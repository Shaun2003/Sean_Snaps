"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Send, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { Message } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ChatViewProps {
  conversationId: string
  otherUser: {
    id: string
    username: string | null
    avatar_url: string | null
    full_name: string | null
  } | null
  initialMessages: Message[]
  currentUserId: string
}

export function ChatView({ conversationId, otherUser, initialMessages, currentUserId }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch the complete message with profile
          const { data } = await supabase
            .from("messages")
            .select(`
              *,
              profiles (id, username, avatar_url)
            `)
            .eq("id", payload.new.id)
            .single()

          if (data && data.id !== messages[messages.length - 1]?.id) {
            setMessages((prev) => [...prev, data])
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: newMessage.trim(),
      })
      .select(`
        *,
        profiles (id, username, avatar_url)
      `)
      .single()

    if (!error && data) {
      setMessages((prev) => [...prev, data])
      setNewMessage("")

      // Update conversation timestamp
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId)
    }

    setIsSending(false)
  }

  // Group messages by date
  const groupedMessages = messages.reduce(
    (groups, message) => {
      const date = new Date(message.created_at).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
      return groups
    },
    {} as Record<string, Message[]>,
  )

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.push("/messages")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Link href={`/profile/${otherUser?.username}`} className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full overflow-hidden bg-secondary">
            {otherUser?.avatar_url ? (
              <img
                src={otherUser.avatar_url || "/placeholder.svg"}
                alt={otherUser.username || "User"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                {(otherUser?.username || "U").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold">{otherUser?.username}</p>
          </div>
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            <div className="flex justify-center mb-4">
              <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                {date === new Date().toDateString() ? "Today" : date}
              </span>
            </div>
            <div className="space-y-2">
              {dateMessages.map((message, index) => {
                const isOwn = message.sender_id === currentUserId
                const showAvatar = !isOwn && (index === 0 || dateMessages[index - 1].sender_id !== message.sender_id)

                return (
                  <div key={message.id} className={cn("flex items-end gap-2", isOwn ? "justify-end" : "justify-start")}>
                    {!isOwn && (
                      <div className="w-8 shrink-0">
                        {showAvatar && (
                          <div className="h-8 w-8 rounded-full overflow-hidden bg-secondary">
                            {message.profiles?.avatar_url ? (
                              <img
                                src={message.profiles.avatar_url || "/placeholder.svg"}
                                alt={message.profiles.username || "User"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
                                {(message.profiles?.username || "U").charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[70%] px-4 py-2 rounded-2xl",
                        isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary rounded-bl-md",
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      <p
                        className={cn(
                          "text-[10px] mt-1",
                          isOwn ? "text-primary-foreground/70" : "text-muted-foreground",
                        )}
                      >
                        {formatDistanceToNow(new Date(message.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 p-4 border-t border-border shrink-0">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Message..."
          className="flex-1 h-11"
        />
        <Button type="submit" size="icon" disabled={!newMessage.trim() || isSending} className="h-11 w-11">
          {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </form>
    </div>
  )
}
