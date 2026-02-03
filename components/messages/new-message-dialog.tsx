"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search } from "lucide-react"

interface NewMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onConversationCreated: (conversationId: string) => void
}

export function NewMessageDialog({ open, onOpenChange, userId, onConversationCreated }: NewMessageDialogProps) {
  const [users, setUsers] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (open) {
      fetchUsers()
    }
  }, [open])

  const fetchUsers = async () => {
    const supabase = createClient()
    const { data } = await supabase.from("profiles").select("*").neq("id", userId).limit(50)

    if (data) setUsers(data)
  }

  const filteredUsers = users.filter(
    (user) =>
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleSelectUser = async (selectedUserId: string) => {
    const supabase = createClient()

    try {
      // Check if conversation already exists
      const { data: existingParticipations } = await supabase
        .from("conversation_participants")
        .select("conversation_id, conversations(id, is_group)")
        .eq("user_id", userId)

      if (existingParticipations && existingParticipations.length > 0) {
        for (const p of existingParticipations) {
          const { data: otherParticipants } = await supabase
            .from("conversation_participants")
            .select("user_id")
            .eq("conversation_id", p.conversation_id)
            .neq("user_id", userId)

          // Check if this is a 1-on-1 conversation with the selected user
          if (
            otherParticipants &&
            otherParticipants.length === 1 &&
            otherParticipants[0]?.user_id === selectedUserId &&
            !(p.conversations as any)?.is_group
          ) {
            onConversationCreated(p.conversation_id)
            return
          }
        }
      }

      // Create new conversation
      const { data: newConv } = await supabase.from("conversations").insert({ is_group: false }).select().single()

      if (newConv) {
        // Add both participants
        await supabase.from("conversation_participants").insert([
          { conversation_id: newConv.id, user_id: userId },
          { conversation_id: newConv.id, user_id: selectedUserId },
        ])

        onConversationCreated(newConv.id)
      }
    } catch (error) {
      console.error("Error creating or finding conversation:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <VisuallyHidden asChild>
            <DialogDescription>Start a new message with a user</DialogDescription>
          </VisuallyHidden>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user.id)}
                className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent transition-colors text-left"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar_url || ""} />
                  <AvatarFallback>{user.display_name?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{user.username}</p>
                  <p className="text-xs text-muted-foreground">{user.display_name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
