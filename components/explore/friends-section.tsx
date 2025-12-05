"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Users, UserPlus } from "lucide-react"
import Link from "next/link"

interface FriendsSectionProps {
  userId: string
}

interface FriendWithMutual extends Profile {
  mutualCount: number
  mutualFriends: Profile[]
}

export function FriendsSection({ userId }: FriendsSectionProps) {
  const [friends, setFriends] = useState<FriendWithMutual[]>([])
  const [suggestions, setSuggestions] = useState<FriendWithMutual[]>([])
  const [following, setFollowing] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    const { data: myFollowing } = await supabase.from("followers").select("following_id").eq("follower_id", userId)

    const followingIds = myFollowing?.map((f) => f.following_id) || []
    setFollowing(new Set(followingIds))

    const { data: myFollowers } = await supabase.from("followers").select("follower_id").eq("following_id", userId)

    const followerIds = myFollowers?.map((f) => f.follower_id) || []

    const mutualIds = followingIds.filter((id) => followerIds.includes(id))

    if (mutualIds.length > 0) {
      const { data: mutualProfiles } = await supabase.from("profiles").select("*").in("id", mutualIds)

      if (mutualProfiles) {
        const friendsWithMutual = await Promise.all(
          mutualProfiles.map(async (friend) => {
            const { data: theirFollowing } = await supabase
              .from("followers")
              .select("following_id")
              .eq("follower_id", friend.id)

            const theirFollowingIds = theirFollowing?.map((f) => f.following_id) || []
            const commonIds = theirFollowingIds.filter(
              (id) => followingIds.includes(id) && id !== friend.id && id !== userId,
            )

            let mutualFriends: Profile[] = []
            if (commonIds.length > 0) {
              const { data: profiles } = await supabase.from("profiles").select("*").in("id", commonIds.slice(0, 3))

              mutualFriends = profiles || []
            }

            return {
              ...friend,
              mutualCount: commonIds.length,
              mutualFriends,
            }
          }),
        )

        setFriends(friendsWithMutual)
      }
    }

    const { data: allUsers } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", userId)
      .not("id", "in", `(${[...followingIds, userId].join(",")})`)
      .limit(20)

    if (allUsers) {
      const suggestionsWithMutual = await Promise.all(
        allUsers.map(async (user) => {
          const { data: theirFollowers } = await supabase
            .from("followers")
            .select("follower_id")
            .eq("following_id", user.id)

          const theirFollowerIds = theirFollowers?.map((f) => f.follower_id) || []
          const mutualFollowerIds = theirFollowerIds.filter((id) => followingIds.includes(id))

          let mutualFriends: Profile[] = []
          if (mutualFollowerIds.length > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("*")
              .in("id", mutualFollowerIds.slice(0, 3))

            mutualFriends = profiles || []
          }

          return {
            ...user,
            mutualCount: mutualFollowerIds.length,
            mutualFriends,
          }
        }),
      )

      suggestionsWithMutual.sort((a, b) => b.mutualCount - a.mutualCount)
      setSuggestions(suggestionsWithMutual.slice(0, 10))
    }
  }, [userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleFollow = async (targetUserId: string) => {
    const supabase = createClient()

    if (following.has(targetUserId)) {
      await supabase.from("followers").delete().eq("follower_id", userId).eq("following_id", targetUserId)

      setFollowing((prev) => {
        const next = new Set(prev)
        next.delete(targetUserId)
        return next
      })
    } else {
      await supabase.from("followers").insert({
        follower_id: userId,
        following_id: targetUserId,
      })

      await supabase.from("notifications").insert({
        user_id: targetUserId,
        actor_id: userId,
        type: "follow",
        title: "New follower",
        content: "Someone started following you",
        reference_id: userId,
        reference_type: "user",
      })

      setFollowing((prev) => new Set([...prev, targetUserId]))
    }

    fetchData()
  }

  const renderUserCard = (user: FriendWithMutual, showFollowButton = true) => (
    <div key={user.id} className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 rounded-lg border bg-card">
      <Link href={`/profile/${user.id}`}>
        <Avatar className="h-10 w-10 sm:h-14 sm:w-14">
          <AvatarImage src={user.avatar_url || ""} />
          <AvatarFallback className="text-sm sm:text-base">{user.display_name?.[0] || "U"}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/profile/${user.id}`} className="font-semibold text-sm hover:underline truncate block">
          {user.username}
        </Link>
        <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.display_name}</p>
        {user.mutualCount > 0 && (
          <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
            <div className="flex -space-x-1.5 sm:-space-x-2">
              {user.mutualFriends.slice(0, 3).map((mutual) => (
                <Avatar key={mutual.id} className="h-4 w-4 sm:h-5 sm:w-5 border-2 border-background">
                  <AvatarImage src={mutual.avatar_url || ""} />
                  <AvatarFallback className="text-[6px] sm:text-[8px]">{mutual.display_name?.[0]}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-[10px] sm:text-xs text-muted-foreground">{user.mutualCount} mutual</span>
          </div>
        )}
      </div>
      {showFollowButton && (
        <Button
          variant={following.has(user.id) ? "outline" : "default"}
          size="sm"
          onClick={() => handleFollow(user.id)}
          className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3 shrink-0"
        >
          {following.has(user.id) ? "Following" : "Follow"}
        </Button>
      )}
    </div>
  )

  return (
    <Tabs defaultValue="friends">
      <TabsList className="grid w-full grid-cols-2 h-9 sm:h-10">
        <TabsTrigger value="friends" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
          <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">Friends</span> ({friends.length})
        </TabsTrigger>
        <TabsTrigger value="suggestions" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
          <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">Suggestions</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="friends" className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
        {friends.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-muted-foreground">
            <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
            <p className="text-sm">No mutual friends yet</p>
            <p className="text-xs sm:text-sm">Follow people to build your network</p>
          </div>
        ) : (
          friends.map((friend) => renderUserCard(friend, false))
        )}
      </TabsContent>

      <TabsContent value="suggestions" className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
        {suggestions.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-muted-foreground">
            <UserPlus className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
            <p className="text-sm">No suggestions available</p>
          </div>
        ) : (
          suggestions.map((user) => renderUserCard(user))
        )}
      </TabsContent>
    </Tabs>
  )
}
