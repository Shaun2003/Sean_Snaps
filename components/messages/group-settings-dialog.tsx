"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { X, Plus, Trash2 } from "lucide-react"

interface GroupSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversationId: string
  groupName: string
  currentUserId: string
  isAdmin: boolean
}

interface GroupMember {
  user_id: string
  profile: Profile
  isAdmin: boolean
}

export function GroupSettingsDialog({
  open,
  onOpenChange,
  conversationId,
  groupName,
  currentUserId,
  isAdmin,
}: GroupSettingsDialogProps) {
  const [members, setMembers] = useState<GroupMember[]>([])
  const [editingName, setEditingName] = useState(groupName)
  const [isSaving, setIsSaving] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([])
  const [showAddUsers, setShowAddUsers] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      fetchGroupMembers()
      if (isAdmin) {
        fetchAvailableUsers()
      }
    }
  }, [open])

  const fetchGroupMembers = async () => {
    try {
      const { data } = await supabase
        .from("conversation_participants")
        .select("user_id, is_admin, profiles (*)")
        .eq("conversation_id", conversationId)

      if (data) {
        const membersWithProfiles = data.map((p) => ({
          user_id: p.user_id,
          profile: p.profiles as Profile,
          isAdmin: p.is_admin || false,
        }))
        setMembers(membersWithProfiles)
      }
    } catch (error) {
      console.error("Error fetching members:", error)
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      const memberIds = members.map((m) => m.user_id)
      
      // Get all profiles
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("*")
        .limit(50)

      if (allProfiles) {
        // Filter out members and current user
        const filtered = allProfiles.filter(
          (profile) => !memberIds.includes(profile.id) && profile.id !== currentUserId
        )
        setAvailableUsers(filtered)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const updateGroupName = async () => {
    if (!isAdmin) {
      toast({
        title: "Error",
        description: "Only admins can change group name",
        variant: "destructive",
      })
      return
    }

    if (!editingName.trim()) {
      toast({
        title: "Error",
        description: "Group name cannot be empty",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)
      const { error } = await supabase
        .from("conversations")
        .update({ name: editingName.trim() })
        .eq("id", conversationId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Group name updated",
      })
    } catch (error) {
      console.error("Error updating group name:", error)
      toast({
        title: "Error",
        description: "Failed to update group name",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const addUserToGroup = async (userId: string) => {
    if (!isAdmin) {
      toast({
        title: "Error",
        description: "Only admins can add members",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)
      const { data, error } = await supabase
        .from("conversation_participants")
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          is_admin: false,
        })
        .select()

      if (error) {
        throw new Error(error.message || "Failed to add user")
      }

      if (!data || data.length === 0) {
        throw new Error("No data returned from insert")
      }

      toast({
        title: "Success",
        description: "User added to group",
      })

      await fetchGroupMembers()
      await fetchAvailableUsers()
      setShowAddUsers(false)
    } catch (error: any) {
      console.error("Error adding user:", error?.message || error)
      
      // Check if it's a duplicate user error
      if (error?.message?.includes('duplicate') || error?.code === '23505') {
        toast({
          title: "User Already in Group",
          description: "This user is already a member of this group",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: error?.message || "Failed to add user to group",
          variant: "destructive",
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  const removeUserFromGroup = async (userId: string) => {
    if (!isAdmin && userId !== currentUserId) {
      toast({
        title: "Error",
        description: "You can only remove yourself",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase
        .from("conversation_participants")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", userId)

      if (error) throw error

      toast({
        title: "Success",
        description: userId === currentUserId ? "You left the group" : "User removed",
      })

      fetchGroupMembers()
      if (isAdmin) {
        await fetchAvailableUsers()
      }
    } catch (error) {
      console.error("Error removing user:", error)
      toast({
        title: "Error",
        description: "Failed to remove user",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Group Settings</DialogTitle>
          <DialogDescription>Manage group name and members</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Group Name */}
          {isAdmin ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Group Name</label>
              <div className="flex gap-2">
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  placeholder="Enter group name"
                />
                <Button
                  onClick={updateGroupName}
                  disabled={isSaving}
                  size="sm"
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Group Name</label>
              <p className="text-sm text-muted-foreground">{groupName}</p>
            </div>
          )}

          {/* Members Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Members ({members.length})</label>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddUsers(!showAddUsers)}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              )}
            </div>

            {/* Add Users Section */}
            {showAddUsers && isAdmin && (
              <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                {availableUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No users available
                  </p>
                ) : (
                  availableUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 hover:bg-accent rounded"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={user.avatar_url || ""} />
                          <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{user.username}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addUserToGroup(user.id)}
                        className="h-6 w-6 p-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Members List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-3 hover:bg-accent rounded-lg border"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={member.profile.avatar_url || ""} />
                      <AvatarFallback>
                        {member.profile.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.profile.display_name || member.profile.username}
                      </p>
                      <div className="flex gap-2 items-center">
                        {member.user_id === currentUserId && (
                          <p className="text-xs text-muted-foreground">(You)</p>
                        )}
                        {member.isAdmin && (
                          <p className="text-xs text-blue-500 font-medium">Admin</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {(isAdmin || member.user_id === currentUserId) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUserFromGroup(member.user_id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
