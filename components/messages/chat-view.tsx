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
  Eye,
  EyeOff,
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
import { ReplyPreview } from "./reply-preview"
import { GroupSettingsDialog } from "./group-settings-dialog"
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
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [isViewOnce, setIsViewOnce] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showCallDialog, setShowCallDialog] = useState(false)
  const [callType, setCallType] = useState<"voice" | "video">("voice")
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [missedCalls, setMissedCalls] = useState<any[]>([])
  const [showGroupSettings, setShowGroupSettings] = useState(false)
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
      .select("*, profiles (*), replied_message:reply_to_id(*, profiles(*))")
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
      setParticipants(parts.map((p: any) => p.profiles as Profile))
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
      setMissedCalls(calls.filter((call: any) => !call.started_at || new Date(call.started_at).getTime() === new Date(call.created_at).getTime()))
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
        reply_to_id: replyingTo?.id,
        is_view_once: isViewOnce,
      })

      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId)
    }

    setNewMessage("")
    setReplyingTo(null)
    setIsViewOnce(false)
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
        file_type: file.type || fileType,
        file_name: file.name,
        is_view_once: isViewOnce,
      })

      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId)

      setIsViewOnce(false)
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
    
    try {
      const { error } = await supabase.from("messages").delete().eq("id", messageId)
      
      if (error) throw error
      
      toast({
        title: "Message deleted",
        description: "Your message has been removed",
      })
      
      fetchMessages()
    } catch (error) {
      console.error("Error deleting message:", error)
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      })
    }
  }

  const handleAddReaction = async (messageId: string, emoji: string) => {
    const supabase = createClient()
    
    try {
      // Get current message reactions
      const { data: msg, error: fetchError } = await supabase
        .from("messages")
        .select("reactions")
        .eq("id", messageId)
        .single()

      if (fetchError) {
        console.error("Error fetching message reactions - Details:", fetchError)
        throw new Error(`Failed to fetch message: ${fetchError.message}`)
      }

      let reactions = msg?.reactions || {}
      
      // Initialize emoji array if it doesn't exist
      if (!reactions[emoji]) {
        reactions[emoji] = []
      }
      
      // Add or remove user reaction
      const userIdStr = userId
      if (reactions[emoji].includes(userIdStr)) {
        reactions[emoji] = reactions[emoji].filter((id: string) => id !== userIdStr)
        if (reactions[emoji].length === 0) {
          delete reactions[emoji]
        }
      } else {
        reactions[emoji].push(userIdStr)
      }
      
      // Update message
      const { error: updateError } = await supabase
        .from("messages")
        .update({ reactions })
        .eq("id", messageId)

      if (updateError) {
        console.error("Error updating reactions - Details:", updateError)
        throw new Error(`Failed to update reactions: ${updateError.message}`)
      }
      
      fetchMessages()
    } catch (error) {
      console.error("Error adding reaction:", error instanceof Error ? error.message : JSON.stringify(error))
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add reaction",
        variant: "destructive",
      })
    }
  }

  const handleCall = (type: "voice" | "video") => {
    setCallType(type)
    setShowCallDialog(true)
  }

  const handleSendVoiceNote = async (audioBlob: Blob, duration: number, mimeType?: string) => {
    const supabase = createClient()
    
    try {
      let actualMimeType = mimeType || audioBlob.type || "audio/webm"
      
      // Strip codec info from MIME type (e.g., "audio/webm;codecs=opus" -> "audio/webm")
      actualMimeType = actualMimeType.split(";")[0].trim()
      
      console.log("[ChatView] Received voice note blob - Size:", audioBlob.size, "bytes - Type:", actualMimeType)
      
      // Determine file extension based on MIME type
      let extension = "webm"
      if (actualMimeType.includes("mp4")) extension = "mp4"
      else if (actualMimeType.includes("mpeg")) extension = "mp3"
      else if (actualMimeType.includes("wav")) extension = "wav"
      else if (actualMimeType.includes("ogg")) extension = "ogg"
      
      const fileName = `${userId}/${conversationId}/${Date.now()}.${extension}`
      
      // Try buckets in order: voice_notes first, then messages
      const bucketsToTry = ["voice_notes", "messages"]
      let uploadError: any = null
      
      for (const bucketName of bucketsToTry) {
        try {
          console.log(`[ChatView] Attempting to upload to '${bucketName}' bucket with MIME type: ${actualMimeType}`)
          
          // Try multiple upload strategies
          let uploadResult = null
          
          // Strategy 1: Upload with proper MIME type
          uploadResult = await supabase.storage
            .from(bucketName)
            .upload(fileName, audioBlob, {
              contentType: actualMimeType,
              cacheControl: "3600",
            })

          // Strategy 2: If MIME type rejected, try without contentType
          if (uploadResult.error?.message?.includes("mime type") || uploadResult.error?.message?.includes("not supported")) {
            console.warn(`[ChatView] MIME type '${actualMimeType}' not supported, retrying without contentType...`)
            uploadResult = await supabase.storage
              .from(bucketName)
              .upload(fileName, audioBlob, {
                cacheControl: "3600",
              })
          }

          // Strategy 3: If still fails, upload as application/octet-stream (raw binary)
          if (uploadResult.error?.message?.includes("mime type") || uploadResult.error?.message?.includes("not supported")) {
            console.warn(`[ChatView] Still failing, trying as raw binary (application/octet-stream)...`)
            uploadResult = await supabase.storage
              .from(bucketName)
              .upload(fileName, audioBlob, {
                contentType: "application/octet-stream",
                cacheControl: "3600",
              })
          }

          const { data: uploadData, error: uploadErr } = uploadResult

          if (uploadErr) {
            console.warn(`[ChatView] Upload to '${bucketName}' failed:`, uploadErr.message)
            uploadError = uploadErr
            continue // Try next bucket
          }

          // Success! Get public URL
          console.log(`[ChatView] Upload successful to '${bucketName}' bucket, path:`, uploadData?.path)
          const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName)
          
          console.log("[ChatView] Public URL from storage:", data?.publicUrl)

          if (!data?.publicUrl) {
            throw new Error("Failed to generate public URL for voice note")
          }

          // Send message with voice note URL
          const { data: messageData, error: messageError } = await supabase
            .from("messages")
            .insert([
              {
                conversation_id: conversationId,
                user_id: userId,
                content: `[Voice Note - ${duration}s]`,
                file_url: data.publicUrl,
                file_type: "audio/webm",
              },
            ])
            .select()
            .single()

          if (messageError) {
            console.error("[ChatView] Error saving message - Full error:", JSON.stringify(messageError, null, 2))
            console.error("[ChatView] Error message:", messageError.message)
            console.error("[ChatView] Error code:", messageError.code)
            console.error("[ChatView] Error hint:", messageError.hint)
            throw new Error(`Failed to save message: ${messageError.message || JSON.stringify(messageError)}`)
          }

          console.log("[ChatView] Message saved successfully")
          fetchMessages()
          return // Exit successfully
        } catch (err: any) {
          console.warn(`[ChatView] Error with '${bucketName}' bucket:`, err.message)
          uploadError = err
          // Continue to next bucket
        }
      }

      // If we got here, all buckets failed
      if (uploadError?.message?.includes("not found")) {
        throw new Error("Storage buckets not found. Please create 'voice_notes' bucket in Supabase Storage")
      }
      throw uploadError || new Error("No suitable bucket found. Please create 'voice_notes' or 'messages' bucket in Supabase Storage")
    } catch (error) {
      console.error("[ChatView] Error sending voice note - Full error:", JSON.stringify(error, null, 2))
      console.error("[ChatView] Error object:", error)
      
      let errorMsg = "Failed to send voice note"
      if (error instanceof Error) {
        errorMsg = error.message
      } else if (error && typeof error === "object") {
        errorMsg = (error as any).message || JSON.stringify(error)
      } else {
        errorMsg = String(error)
      }
      
      console.error("[ChatView] Final error message:", errorMsg)
      toast({
        title: "Error sending voice note",
        description: errorMsg || "Unknown error occurred",
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
      {/* Header - Fixed on mobile, sticky on desktop */}
      <div className="fixed md:static top-0 left-0 right-0 md:relative flex items-center gap-3 p-4 sm:p-5 border-b border-border/50 bg-card shrink-0 z-20 md:z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden h-10 w-10 hover:bg-muted" 
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {conversation?.is_group ? (
          <button
            onClick={() => setShowGroupSettings(true)}
            className="h-12 w-12 rounded-full bg-linear-to-br from-primary to-purple-600 flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity cursor-pointer"
            title="Group settings"
          >
            <Users className="h-5 w-5 text-white" />
          </button>
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

      {/* Messages - Better spacing with padding for header and input on mobile */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 space-y-2 sm:space-y-3 md:space-y-4 bg-linear-to-br from-background via-background to-muted/10 pt-20 md:pt-0 pb-0 md:pb-0">
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
                onReact={handleAddReaction}
                onReply={(replyMsg) => {
                  setReplyingTo(replyMsg)
                  textareaRef.current?.focus()
                }}
              />
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed directly above mobile navbar, normal on desktop */}
      <div className="fixed md:relative bottom-14 left-0 right-0 md:bottom-auto p-3 sm:p-4 md:p-5 border-t border-border/50 bg-card shrink-0 space-y-2 sm:space-y-3 z-30 md:z-auto md:static">
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

        {replyingTo && (
          <ReplyPreview 
            message={replyingTo} 
            onClearReply={() => setReplyingTo(null)} 
          />
        )}

        <div className="flex items-end gap-1.5 sm:gap-2 md:gap-3 flex-wrap sm:flex-nowrap">
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

          <Button
            variant={isViewOnce ? "default" : "ghost"}
            size="icon"
            onClick={() => setIsViewOnce(!isViewOnce)}
            className={cn(
              "shrink-0 h-10 w-10",
              isViewOnce ? "bg-blue-500 hover:bg-blue-600 text-white" : "hover:bg-muted"
            )}
            title={isViewOnce ? "View once enabled" : "View once disabled"}
          >
            {isViewOnce ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </Button>

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

      {conversation?.is_group && (
        <GroupSettingsDialog
          open={showGroupSettings}
          onOpenChange={setShowGroupSettings}
          conversationId={conversationId}
          groupName={conversation.name || "Group"}
          currentUserId={userId}
          isAdmin={true}
        />
      )}
    </div>
  )
}
