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
  X,
  ImageIcon,
  Film,
  FileText,
  Users,
  Mic,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import data from "@emoji-mart/data"
import Picker from "@emoji-mart/react"
import { useToast } from "@/hooks/use-toast"
import { CallDialog } from "./call-dialog"
import { MessageBubble } from "./message-bubble"
import { VoiceNoteRecorder } from "./voice-note-recorder"
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
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [missedCalls, setMissedCalls] = useState<any[]>([])
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

    // Fetch missed calls for this conversation
    const { data: calls } = await supabase
      .from("calls")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("recipient_id", userId)
      .eq("status", "ended")
      .order("created_at", { ascending: false })

    if (calls) {
      setMissedCalls(calls.filter((call) => !call.started_at || new Date(call.started_at).getTime() === new Date(call.created_at).getTime()))
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
    if (!window.confirm("Delete this message?")) return
    
    const supabase = createClient()
    await supabase.from("messages").delete().eq("id", messageId)
    
    toast({
      title: "Message deleted",
      description: "Your message has been removed",
    })
    
    fetchMessages()
  }

  const handleCall = (type: "voice" | "video") => {
    setCallType(type)
    setShowCallDialog(true)
  }

  const handleSendVoiceNote = async (audioUrl: string, duration: number) => {
    const supabase = createClient()
    
    try {
      // Convert blob URL to blob if it's a blob URL
      const response = await fetch(audioUrl)
      const blob = await response.blob()
      
      console.log("[ChatView] Voice note blob size:", blob.size, "Type:", blob.type)
      
      // Upload to Supabase storage
      const fileName = `${userId}/${conversationId}/${Date.now()}.webm`
      const { data: uploadData, error: uploadError } = await supabase.storage.from("voice_notes").upload(fileName, blob)

      if (uploadError) {
        console.error("[ChatView] Upload error:", uploadError)
        throw uploadError
      }

      console.log("[ChatView] Upload successful:", uploadData)

      // Get public URL
      const { data } = supabase.storage.from("voice_notes").getPublicUrl(fileName)
      
      console.log("[ChatView] Public URL data:", data)
      
      if (!data?.publicUrl) {
        throw new Error("Failed to get public URL")
      }

      console.log("[ChatView] Saving message with URL:", data.publicUrl)

      // Save message with file URL
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        user_id: userId,
        content: `Voice note (${Math.floor(duration)}s)`,
        file_url: data.publicUrl,
        file_type: "audio/webm",
      })

      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId)

      setIsRecordingVoice(false)
      fetchMessages()
      toast({
        title: "Voice note sent",
        description: "Your voice message has been sent",
      })
    } catch (error) {
      console.error("[ChatView] Error sending voice note:", error)
      toast({
        title: "Error",
        description: "Failed to send voice note",
        variant: "destructive",
      })
    }
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

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Header - Facebook Messenger Style */}
      <div className="flex items-center gap-3 p-4 sm:p-5 border-b border-border/50 bg-card shrink-0">
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden h-10 w-10 hover:bg-muted" 
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {conversation?.is_group ? (
          <div className="h-12 w-12 rounded-full bg-linear-to-br from-primary to-purple-600 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5 text-white" />
          </div>
        ) : (
          <Link href={`/profile/${participants[0]?.id}`}>
            <Avatar className="h-12 w-12 ring-2 ring-background shrink-0">
              <AvatarImage src={participants[0]?.avatar_url || ""} />
              <AvatarFallback className="bg-linear-to-br from-primary to-primary text-white font-semibold">
                {getConversationName()[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
        )}

        <div className="flex-1 min-w-0">
          <Link href={conversation?.is_group ? "#" : `/profile/${participants[0]?.id}`} className="hover:underline block">
            <p className="font-bold text-base truncate bg-clip-text text-transparent bg-linear-to-r from-blue-500 via-purple-500 to-pink-500">{getConversationName()}</p>
          </Link>
          {conversation?.is_group && (
            <p className="text-xs sm:text-sm text-muted-foreground">{participants.length + 1} members</p>
          )}
        </div>

        <div className="flex gap-1 sm:gap-2 shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleCall("voice")}
            className="h-10 w-10 hover:bg-muted"
            title="Voice call"
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleCall("video")}
            className="h-10 w-10 hover:bg-muted"
            title="Video call"
          >
            <Video className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages - Better spacing */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 sm:space-y-4 bg-linear-to-br from-background via-background to-muted/10">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            {missedCalls.length > 0 ? (
              <div className="text-center space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  {missedCalls.length === 1 ? "You've a missed call" : `You've ${missedCalls.length} missed calls`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {missedCalls[0]?.call_type === "video" ? "Video call" : "Voice call"} from {participants[0]?.display_name || participants[0]?.username || "Unknown"}
                </p>
              </div>
            ) : (
              <p className="text-sm">No messages yet. Start the conversation!</p>
            )}
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.user_id === userId

            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={isOwn}
                isGroupChat={conversation?.is_group || false}
                currentUserId={userId}
                onEdit={(editMsg) => {
                  setEditingMessage(editMsg)
                  setNewMessage(editMsg.content || "")
                }}
                onDelete={handleDeleteMessage}
              />
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Better alignment */}
      <div className="p-4 sm:p-5 border-t border-border/50 bg-card shrink-0 space-y-3">
        {editingMessage && (
          <div className="flex items-center justify-between bg-muted/50 p-2.5 sm:p-3 rounded-lg border border-border/30">
            <span className="text-sm text-muted-foreground font-medium">Editing message...</span>
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

        <div className="flex items-end gap-2 sm:gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="shrink-0 h-10 w-10 hover:bg-muted" 
                disabled={isUploading}
                title="Attach file"
              >
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
  <PopoverTrigger asChild suppressHydrationWarning>
    <Button
      variant="ghost"
      size="icon"
      className="shrink-0 h-10 w-10 hover:bg-muted"
      title="Emoji"
    >
      <Smile className="h-5 w-5" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0" align="start" suppressHydrationWarning>
            </PopoverContent>
          </Popover>

          {!isRecordingVoice ? (
            <>
              <Textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Aa"
                className="flex-1 min-h-10 max-h-37.5 py-2 px-4 rounded-full bg-muted border-0 resize-none overflow-y-auto text-sm focus:bg-muted focus:ring-1 focus:ring-primary/50"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
              />

              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsRecordingVoice(true)}
                className="shrink-0 h-10 w-10 hover:bg-muted"
                title="Record voice note"
              >
                <Mic className="h-5 w-5" />
              </Button>

              <Button 
                size="icon" 
                className="rounded-full shrink-0 h-10 w-10 bg-blue-500 hover:bg-blue-600 text-white" 
                onClick={handleSend} 
                disabled={!newMessage.trim()}
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <VoiceNoteRecorder
              onSend={handleSendVoiceNote}
              onCancel={() => setIsRecordingVoice(false)}
            />
          )}
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
