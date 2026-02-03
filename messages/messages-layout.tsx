"use client"

import { useState } from "react"
import { ConversationList } from "./conversation-list"
import { ChatView } from "./chat-view"
import { CallHistorySheet } from "./call-history-sheet"
import { CreateGroupDialog } from "./create-group-dialog"
import { NewMessageDialog } from "./new-message-dialog"
import { IncomingCallNotification } from "./incoming-call-notification"
import { CallDialog } from "./call-dialog"
import { Button } from "@/components/ui/button"
import { Plus, History, Users } from "lucide-react"
import type { Profile } from "@/lib/types"

interface IncomingCallData {
  id: string
  initiator_id: string
  conversation_id: string
  call_type: "voice" | "video"
  initiator?: Profile
}

interface MessagesLayoutProps {
  userId: string
}

export function MessagesLayout({ userId }: MessagesLayoutProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [showCallHistory, setShowCallHistory] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null)
  const [showIncomingCallDialog, setShowIncomingCallDialog] = useState(false)

  return (
    <div className="flex h-[calc(100dvh-4rem)] md:h-[calc(100dvh-0rem)] w-full bg-background">
      {/* Conversations Sidebar - Responsive */}
      <div
        className={`w-full md:w-72 lg:w-80 border-r border-border/50 flex flex-col bg-card transition-all duration-300 ${selectedConversationId ? "hidden md:flex" : "flex"}`}
      >
        <div className="p-4 sm:p-5 border-b border-border/50 flex items-center justify-between shrink-0 bg-background">
          <h1 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-blue-500 via-purple-500 to-pink-500">Messages</h1>
          <div className="flex gap-1 sm:gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowCallHistory(true)} 
              className="size-9 sm:size-10 hover:bg-muted transition-colors"
              title="Call History"
            >
              <History className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowCreateGroup(true)} 
              className="size-9 sm:size-10 hover:bg-muted transition-colors"
              title="Create Group"
            >
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowNewMessage(true)} 
              className="size-9 sm:size-10 hover:bg-muted transition-colors"
              title="New Message"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <ConversationList 
            userId={userId} 
            selectedId={selectedConversationId} 
            onSelect={setSelectedConversationId} 
          />
        </div>
      </div>

      {/* Chat Area - Full width on mobile */}
      <div className={`flex-1 flex flex-col bg-background transition-all duration-300 ${selectedConversationId ? "flex" : "hidden md:flex"} w-full md:w-auto`}>
        {selectedConversationId ? (
          <ChatView
            conversationId={selectedConversationId}
            userId={userId}
            onBack={() => setSelectedConversationId(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground p-4 sm:p-6">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                <Plus className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-lg sm:text-xl font-semibold bg-clip-text text-transparent bg-linear-to-r from-blue-500 via-purple-500 to-pink-500">Your Messages</p>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">Send a message to start a chat</p>
              </div>
              <Button 
                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white" 
                size="lg" 
                onClick={() => setShowNewMessage(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Message
              </Button>
            </div>
          </div>
        )}
      </div>

      <CallHistorySheet open={showCallHistory} onOpenChange={setShowCallHistory} userId={userId} />

      <CreateGroupDialog
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        userId={userId}
        onCreated={(id) => {
          setSelectedConversationId(id)
          setShowCreateGroup(false)
        }}
      />

      <NewMessageDialog
        open={showNewMessage}
        onOpenChange={setShowNewMessage}
        userId={userId}
        onConversationCreated={(id) => {
          setSelectedConversationId(id)
          setShowNewMessage(false)
        }}
      />

      {/* Incoming Call Notification */}
      <IncomingCallNotification
        userId={userId}
        onCallAccept={(call) => {
          console.log("[MessagesLayout] onCallAccept callback received with call:", call.id)
          console.log("[MessagesLayout] Call data:", { initiator_id: call.initiator_id, conversation_id: call.conversation_id, call_type: call.call_type, has_initiator: !!call.initiator })
          setIncomingCall(call)
          setShowIncomingCallDialog(true)
          // Switch to the conversation
          setSelectedConversationId(call.conversation_id)
          console.log("[MessagesLayout] State updated - incomingCall set, showIncomingCallDialog=true, selectedConversationId set to:", call.conversation_id)
        }}
      />

      {/* Incoming Call Dialog */}
      {incomingCall && (
        <CallDialog
          open={showIncomingCallDialog}
          onOpenChange={(open) => {
            console.log("[MessagesLayout] CallDialog open changed to:", open)
            setShowIncomingCallDialog(open)
            if (!open) {
              setIncomingCall(null)
            }
          }}
          participant={incomingCall.initiator || { id: incomingCall.initiator_id, username: "User" } as Profile}
          participants={[incomingCall.initiator || { id: incomingCall.initiator_id, username: "User" } as Profile]}
          callType={incomingCall.call_type}
          onEndCall={() => {
            console.log("[MessagesLayout] Call ended")
            setIncomingCall(null)
            setShowIncomingCallDialog(false)
          }}
          currentUserId={userId}
          conversationId={incomingCall.conversation_id}
          incomingCallId={incomingCall.id}
          isIncomingCall={true}
        />
      )}
    </div>
  )
}
