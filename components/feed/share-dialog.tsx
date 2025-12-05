"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Post, Profile } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, Search, Share2, Copy, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  post: Post
  currentUserId: string
}

export function ShareDialog({ open, onOpenChange, post, currentUserId }: ShareDialogProps) {
  const [users, setUsers] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [isSharing, setIsSharing] = useState(false)
  const [isResharing, setIsResharing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchUsers()
    }
  }, [open])

  const fetchUsers = async () => {
    const supabase = createClient()
    const { data } = await supabase.from("profiles").select("*").neq("id", currentUserId).limit(50)

    if (data) setUsers(data)
  }

  const filteredUsers = users.filter(
    (user) =>
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const handleShare = async () => {
    if (selectedUsers.length === 0) return

    setIsSharing(true)
    const supabase = createClient()

    try {
      for (const userId of selectedUsers) {
        await supabase.from("post_shares").insert({
          post_id: post.id,
          user_id: currentUserId,
          shared_to_user_id: userId,
        })

        await supabase.from("notifications").insert({
          user_id: userId,
          type: "share",
          title: "Post shared with you",
          content: "Someone shared a post with you",
          reference_id: post.id,
          reference_type: "post",
        })
      }

      toast({ title: "Shared successfully", description: `Post shared with ${selectedUsers.length} user(s)` })
      setSelectedUsers([])
      onOpenChange(false)
    } catch (error) {
      toast({ title: "Error", description: "Failed to share post", variant: "destructive" })
    } finally {
      setIsSharing(false)
    }
  }

  const handleReshare = async () => {
    setIsResharing(true)
    const supabase = createClient()

    try {
      // Check if is_reshare column exists by trying with it first
      const { error } = await supabase.from("post_shares").insert({
        post_id: post.id,
        user_id: currentUserId,
        is_reshare: true,
      })

      if (error) {
        // Fallback without is_reshare column
        await supabase.from("post_shares").insert({
          post_id: post.id,
          user_id: currentUserId,
        })
      }

      toast({ title: "Reshared", description: "Post has been reshared to your profile" })
      onOpenChange(false)
    } catch (error) {
      console.log("[v0] Reshare error:", error)
      toast({ title: "Error", description: "Failed to reshare post", variant: "destructive" })
    } finally {
      setIsResharing(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`)
    toast({ title: "Link copied", description: "Post link copied to clipboard" })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Share Post</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="send" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-8 sm:h-10">
            <TabsTrigger value="send" className="text-xs sm:text-sm">
              Send
            </TabsTrigger>
            <TabsTrigger value="reshare" className="text-xs sm:text-sm">
              Reshare
            </TabsTrigger>
            <TabsTrigger value="link" className="text-xs sm:text-sm">
              Copy Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="space-y-3 sm:space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            <div className="max-h-48 sm:max-h-64 overflow-y-auto space-y-1">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className="flex items-center gap-2 sm:gap-3 w-full p-1.5 sm:p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                    <AvatarImage src={user.avatar_url || ""} />
                    <AvatarFallback>{user.display_name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">{user.username}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{user.display_name}</p>
                  </div>
                  {selectedUsers.includes(user.id) && (
                    <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <Button
              onClick={handleShare}
              disabled={selectedUsers.length === 0 || isSharing}
              className="w-full h-9"
              size="sm"
            >
              {isSharing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send to {selectedUsers.length || ""} {selectedUsers.length === 1 ? "person" : "people"}
            </Button>
          </TabsContent>

          <TabsContent value="reshare" className="space-y-4">
            <div className="text-center py-6 sm:py-8">
              <Share2 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">Share this post to your profile</p>
              <Button onClick={handleReshare} disabled={isResharing} size="sm">
                {isResharing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reshare to Profile
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="link" className="space-y-4">
            <div className="text-center py-6 sm:py-8">
              <Copy className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                Copy the post link to share anywhere
              </p>
              <Button onClick={copyLink} size="sm">
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
