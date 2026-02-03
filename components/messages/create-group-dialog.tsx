"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { Check, Search, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface CreateGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onCreated: (conversationId: string) => void
}

export function CreateGroupDialog({ open, onOpenChange, userId, onCreated }: CreateGroupDialogProps) {
  const [users, setUsers] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [groupName, setGroupName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (open) {
      fetchUsers()
      setSelectedUsers([])
      setGroupName("")
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

  const toggleUser = (id: string) => {
    setSelectedUsers((prev) => (prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]))
  }

  const handleCreate = async () => {
    if (selectedUsers.length < 2 || !groupName.trim()) return

    setIsCreating(true)
    const supabase = createClient()

    try {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({ name: groupName.trim(), is_group: true })
        .select()
        .single()

      if (newConv) {
        // Add all participants including self
        const participants = [userId, ...selectedUsers].map((uid) => ({
          conversation_id: newConv.id,
          user_id: uid,
        }))

        await supabase.from("conversation_participants").insert(participants)

        onCreated(newConv.id)
      }
    } catch (error) {
      console.error("Error creating group:", error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group Chat</DialogTitle>
          <VisuallyHidden asChild>
            <DialogDescription>Create a new group chat with selected members</DialogDescription>
          </VisuallyHidden>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Add Members ({selectedUsers.length} selected)</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => toggleUser(user.id)}
                className={cn(
                  "flex items-center gap-3 w-full p-2 rounded-lg transition-colors text-left",
                  selectedUsers.includes(user.id) ? "bg-accent" : "hover:bg-accent",
                )}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.avatar_url || ""} />
                  <AvatarFallback>{user.display_name?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">{user.username}</p>
                  <p className="text-xs text-muted-foreground">{user.display_name}</p>
                </div>
                {selectedUsers.includes(user.id) && (
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <Button
            onClick={handleCreate}
            disabled={selectedUsers.length < 2 || !groupName.trim() || isCreating}
            className="w-full"
          >
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Group
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
