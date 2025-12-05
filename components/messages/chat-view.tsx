"use client"

import type React from "react"
import { useEffect, useState, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Message, Profile, Conversation } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Send,
  Smile,
  Paperclip,
  Phone,
  Video,
  MoreVertical,
  X,
  Edit2,
  Trash2,
  FileText,
  ImageIcon,
  Film,
  Users,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import data from "@emoji-mart/data"
import Picker from "@emoji-mart/react"
import { useToast } from "@/hooks/use-toast"
import { CallDialog } from "./call-dialog"
import Link from "next/link"

interface ChatViewProps {
  conversationId: string
  userId: string
  onBack: () => void
}

const STICKERS = [
  "/happy-sticker.jpg",
  "/love-sticker.jpg",
  "/laugh-sticker.jpg",
  "/sad-sticker.jpg",
  "/wow-sticker.jpg",
  "/angry-sticker.jpg",
]

export function ChatView({ conversationId, userId, onBack }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [participants, setParticipants] = useState<Profile[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showStickers, setShowStickers] = useState(false)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showCallDialog, setShowCallDialog] = useState(false)
  const [callType, setCallType] = useState<"voice" | "video">("voice")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [newMessage])

  const fetchMessages = useCallback(async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from("messages")
      .select("*, profiles (*)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (data) setMessages(data)

    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
  }, [conversationId, userId])

  const fetchConversation = useCallback(async () => {
    const supabase = createClient()

    const { data: conv } = await supabase.from("conversations").select("*").eq("id", conversationId).single()

    if (conv) setConversation(conv)

    const { data: parts } = await supabase
      .from("conversation_participants")
      .select("profiles (*)")
      .eq("conversation_id", conversationId)
      .neq("user_id", userId)

    if (parts) {
      setParticipants(parts.map((p) => p.profiles as Profile))
    }
  }, [conversationId, userId])

  useEffect(() => {
    fetchConversation()
    fetchMessages()

    const supabase = createClient()
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => fetchMessages(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, fetchConversation, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() && !editingMessage) return

    const supabase = createClient()

    if (editingMessage) {
      await supabase
        .from("messages")
        .update({ content: newMessage.trim(), is_edited: true, updated_at: new Date().toISOString() })
        .eq("id", editingMessage.id)

      setEditingMessage(null)
    } else {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        user_id: userId,
        content: newMessage.trim(),
      })

      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId)
    }

    setNewMessage("")
    fetchMessages()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const supabase = createClient()

    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from("messages").upload(fileName, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from("messages").getPublicUrl(fileName)

      let fileType = "file"
      if (file.type.startsWith("image/")) fileType = "image"
      else if (file.type.startsWith("video/")) fileType = "video"
      else if (file.type === "application/pdf") fileType = "pdf"

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        user_id: userId,
        file_url: publicUrl,
        file_type: fileType,
      })

      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId)

      fetchMessages()
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload file",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleSendSticker = async (stickerUrl: string) => {
    const supabase = createClient()

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      user_id: userId,
      file_url: stickerUrl,
      file_type: "sticker",
    })

    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId)

    setShowStickers(false)
    fetchMessages()
  }

  const handleDeleteMessage = async (messageId: string) => {
    const supabase = createClient()
    await supabase.from("messages").delete().eq("id", messageId)
    fetchMessages()
  }

  const handleCall = (type: "voice" | "video") => {
    setCallType(type)
    setShowCallDialog(true)
  }

  const handleEndCall = async (duration: number) => {
    const supabase = createClient()
    await supabase.from("call_history").insert({
      conversation_id: conversationId,
      caller_id: userId,
      call_type: callType,
      status: duration > 0 ? "answered" : "missed",
      duration,
    })
  }

  const handleEmojiSelect = (emoji: { native: string }) => {
    setNewMessage((prev) => prev + emoji.native)
    setShowEmojiPicker(false)
  }

  const getConversationName = () => {
    if (conversation?.is_group && conversation.name) return conversation.name
    return participants.map((p) => p.display_name || p.username).join(", ") || "Chat"
  }

  const renderFileMessage = (msg: Message) => {
    switch (msg.file_type) {
      case "image":
        return <img src={msg.file_url || "/placeholder.svg"} alt="Shared image" className="max-w-[200px] rounded-lg" />
      case "video":
        return <video src={msg.file_url || ""} controls className="max-w-[200px] rounded-lg" />
      case "sticker":
        return <img src={msg.file_url || "/placeholder.svg"} alt="Sticker" className="w-20 h-20" />
      case "pdf":
        return (
          <a
            href={msg.file_url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <FileText className="h-5 w-5" />
            PDF Document
          </a>
        )
      default:
        return (
          <a
            href={msg.file_url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Paperclip className="h-5 w-5" />
            Download File
          </a>
        )
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {conversation?.is_group ? (
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
            <Users className="h-5 w-5 text-white" />
          </div>
        ) : (
          <Link href={`/profile/${participants[0]?.id}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={participants[0]?.avatar_url || ""} />
              <AvatarFallback>{getConversationName()[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
        )}

        <div className="flex-1">
          <Link href={conversation?.is_group ? "#" : `/profile/${participants[0]?.id}`} className="hover:underline">
            <p className="font-semibold">{getConversationName()}</p>
          </Link>
          {conversation?.is_group && <p className="text-xs text-muted-foreground">{participants.length + 1} members</p>}
        </div>

        <Button variant="ghost" size="icon" onClick={() => handleCall("voice")}>
          <Phone className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => handleCall("video")}>
          <Video className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
        {messages.map((msg) => {
          const isOwn = msg.user_id === userId
          const profile = msg.profiles as Profile

          return (
            <div key={msg.id} className={cn("flex gap-2", isOwn && "flex-row-reverse")}>
              {!isOwn && (
                <Link href={`/profile/${profile.id}`}>
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={profile.avatar_url || ""} />
                    <AvatarFallback>{profile.display_name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                </Link>
              )}

              <div className={cn("max-w-[70%]", isOwn && "items-end")}>
                {conversation?.is_group && !isOwn && (
                  <p className="text-xs text-muted-foreground mb-1">{profile.username}</p>
                )}

                <div className="flex items-end gap-1 group">
                  {isOwn && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {msg.content && (
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingMessage(msg)
                              setNewMessage(msg.content || "")
                            }}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDeleteMessage(msg.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2",
                      isOwn ? "bg-gradient-to-r from-primary to-purple-600 text-white" : "bg-card border",
                    )}
                  >
                    {msg.file_url ? (
                      renderFileMessage(msg)
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>

                <div className={cn("flex items-center gap-1 mt-1", isOwn && "justify-end")}>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(msg.created_at), "MMM d, h:mm a")}
                  </span>
                  {msg.is_edited && <span className="text-xs text-muted-foreground">(edited)</span>}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-card">
        {editingMessage && (
          <div className="flex items-center justify-between bg-muted p-2 rounded-lg mb-2">
            <span className="text-sm text-muted-foreground">Editing message</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setEditingMessage(null)
                setNewMessage("")
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0" disabled={isUploading}>
                <Paperclip className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <ImageIcon className="h-4 w-4 mr-2" />
                Photo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Film className="h-4 w-4 mr-2" />
                Video
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <FileText className="h-4 w-4 mr-2" />
                Document
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowStickers(!showStickers)}>
                <Smile className="h-4 w-4 mr-2" />
                Stickers
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="auto" />
            </PopoverContent>
          </Popover>

          <Textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 min-h-[40px] max-h-[150px] py-2 px-4 rounded-2xl bg-muted border-0 resize-none overflow-y-auto"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />

          <Button size="icon" className="rounded-full shrink-0" onClick={handleSend} disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {showStickers && (
          <div className="mt-2 p-2 border rounded-lg grid grid-cols-6 gap-2">
            {STICKERS.map((sticker, i) => (
              <button
                key={i}
                onClick={() => handleSendSticker(sticker)}
                className="hover:bg-accent rounded p-1 transition-colors"
              >
                <img src={sticker || "/placeholder.svg"} alt={`Sticker ${i + 1}`} className="w-12 h-12" />
              </button>
            ))}
          </div>
        )}
      </div>

      {participants[0] && (
        <CallDialog
          open={showCallDialog}
          onOpenChange={setShowCallDialog}
          participant={participants[0]}
          participants={participants}
          callType={callType}
          onEndCall={handleEndCall}
          currentUserId={userId}
          conversationId={conversationId}
        />
      )}
    </div>
  )
}
