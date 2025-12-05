"use client"

import { useState } from "react"
import { ConversationList } from "./conversation-list"
import { ChatView } from "./chat-view"
import { CallHistorySheet } from "./call-history-sheet"
import { CreateGroupDialog } from "./create-group-dialog"
import { NewMessageDialog } from "./new-message-dialog"
import { Button } from "@/components/ui/button"
import { Plus, History, Users } from "lucide-react"

interface MessagesLayoutProps {
  userId: string
}

export function MessagesLayout({ userId }: MessagesLayoutProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [showCallHistory, setShowCallHistory] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showNewMessage, setShowNewMessage] = useState(false)

  return (
    <div className="flex h-[calc(100dvh-4rem)] md:h-[calc(100dvh-0rem)]">
      {/* Conversations Sidebar */}
      <div
        className={`w-full md:w-72 lg:w-80 border-r flex flex-col bg-background ${selectedConversationId ? "hidden md:flex" : "flex"}`}
      >
        <div className="p-3 sm:p-4 border-b flex items-center justify-between shrink-0">
          <h1 className="text-lg sm:text-xl font-bold">Messages</h1>
          <div className="flex gap-0.5 sm:gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowCallHistory(true)} className="size-8 sm:size-9">
              <History className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowCreateGroup(true)} className="size-8 sm:size-9">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowNewMessage(true)} className="size-8 sm:size-9">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>
        <ConversationList userId={userId} selectedId={selectedConversationId} onSelect={setSelectedConversationId} />
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-background ${selectedConversationId ? "flex" : "hidden md:flex"}`}>
        {selectedConversationId ? (
          <ChatView
            conversationId={selectedConversationId}
            userId={userId}
            onBack={() => setSelectedConversationId(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
            <div className="text-center">
              <p className="text-base sm:text-lg font-medium">Your Messages</p>
              <p className="text-xs sm:text-sm">Send a message to start a chat</p>
              <Button className="mt-4" size="sm" onClick={() => setShowNewMessage(true)}>
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
    </div>
  )
}
