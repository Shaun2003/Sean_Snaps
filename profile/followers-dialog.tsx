"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"
import type { Profile } from "@/lib/types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  type: "followers" | "following"
  currentUserId: string
}

export function FollowersDialog({ open, onOpenChange, userId, type, currentUserId }: Props) {
  const [users, setUsers] = useState<(Profile & { isFollowing: boolean })[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      fetchUsers()
    }
  }, [open, userId, type])

  async function fetchUsers() {
    setLoading(true)

    if (type === "followers") {
      const { data } = await supabase
        .from("followers")
        .select("follower:profiles!followers_follower_id_fkey(*)")
        .eq("following_id", userId)

      if (data) {
        const usersWithFollowStatus = await Promise.all(
          data.map(async (item: any) => {
            const { data: followCheck } = await supabase
              .from("followers")
              .select("id")
              .eq("follower_id", currentUserId)
              .eq("following_id", item.follower.id)
              .single()
            return { ...item.follower, isFollowing: !!followCheck }
          }),
        )
        setUsers(usersWithFollowStatus)
      }
    } else {
      const { data } = await supabase
        .from("followers")
        .select("following:profiles!followers_following_id_fkey(*)")
        .eq("follower_id", userId)

      if (data) {
        const usersWithFollowStatus = await Promise.all(
          data.map(async (item: any) => {
            const { data: followCheck } = await supabase
              .from("followers")
              .select("id")
              .eq("follower_id", currentUserId)
              .eq("following_id", item.following.id)
              .single()
            return { ...item.following, isFollowing: !!followCheck }
          }),
        )
        setUsers(usersWithFollowStatus)
      }
    }

    setLoading(false)
  }

  async function toggleFollow(targetUserId: string, isCurrentlyFollowing: boolean) {
    if (isCurrentlyFollowing) {
      await supabase.from("followers").delete().eq("follower_id", currentUserId).eq("following_id", targetUserId)
    } else {
      await supabase.from("followers").insert({
        follower_id: currentUserId,
        following_id: targetUserId,
      })
    }

    setUsers((prev) => prev.map((u) => (u.id === targetUserId ? { ...u, isFollowing: !isCurrentlyFollowing } : u)))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="capitalize">{type}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-96">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full size-6 border-b-2 border-primary" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No {type} yet</p>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <Link href={`/profile/${user.username}`} onClick={() => onOpenChange(false)}>
                    <Avatar>
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>{user.display_name?.[0] || user.username[0]}</AvatarFallback>
                    </Avatar>
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/profile/${user.username}`}
                      onClick={() => onOpenChange(false)}
                      className="font-semibold text-sm hover:underline block truncate"
                    >
                      {user.username}
                    </Link>
                    {user.display_name && <p className="text-xs text-muted-foreground truncate">{user.display_name}</p>}
                  </div>

                  {user.id !== currentUserId && (
                    <Button
                      variant={user.isFollowing ? "secondary" : "default"}
                      size="sm"
                      onClick={() => toggleFollow(user.id, user.isFollowing)}
                    >
                      {user.isFollowing ? "Following" : "Follow"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
