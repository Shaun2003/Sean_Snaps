"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2 } from "lucide-react"
import Link from "next/link"

interface FollowSuggestionsProps {
  userId: string
  limit?: number
}

interface SuggestedUser extends Profile {
  isFollowing?: boolean
  mutualFollowersCount?: number
}

export function FollowSuggestions({ userId, limit = 5 }: FollowSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchSuggestions()
  }, [userId])

  const fetchSuggestions = useCallback(async () => {
    try {
      const supabase = createClient()

      // Get users that current user is following
      const { data: followingData } = await supabase
        .from("followers")
        .select("following_id")
        .eq("follower_id", userId)

      const followingIds = new Set((followingData || []).map((f) => f.following_id))
      setFollowingIds(followingIds)

      // Get suggested users (people that people you follow are following)
      const { data: suggestionsData } = await supabase
        .from("followers")
        .select("following_id, profiles!followers_following_id_fkey(*)")
        .in("follower_id", Array.from(followingIds))
        .neq("following_id", userId)
        .limit(limit * 3)

      if (suggestionsData) {
        // Remove duplicates and people already followed
        const seen = new Set<string>()
        const uniqueSuggestions = suggestionsData
          .filter((item: any) => {
            if (seen.has(item.following_id) || followingIds.has(item.following_id)) {
              return false
            }
            seen.add(item.following_id)
            return true
          })
          .slice(0, limit)
          .map((item: any) => ({
            ...item.profiles,
            isFollowing: false,
          }))

        setSuggestions(uniqueSuggestions as SuggestedUser[])
      }
    } catch (err) {
      console.error("Error fetching suggestions:", err)
    } finally {
      setIsLoading(false)
    }
  }, [userId, limit])

  const handleFollow = async (profileId: string) => {
    try {
      const supabase = createClient()
      await supabase.from("followers").insert({
        follower_id: userId,
        following_id: profileId,
      })

      setSuggestions((prev) =>
        prev.map((user) =>
          user.id === profileId ? { ...user, isFollowing: true } : user,
        ),
      )
      setFollowingIds((prev) => new Set([...prev, profileId]))
    } catch (err) {
      console.error("Error following user:", err)
    }
  }

  const handleUnfollow = async (profileId: string) => {
    try {
      const supabase = createClient()
      await supabase
        .from("followers")
        .delete()
        .eq("follower_id", userId)
        .eq("following_id", profileId)

      setSuggestions((prev) =>
        prev.map((user) =>
          user.id === profileId ? { ...user, isFollowing: false } : user,
        ),
      )
      setFollowingIds((prev) => {
        const updated = new Set(prev)
        updated.delete(profileId)
        return updated
      })
    } catch (err) {
      console.error("Error unfollowing user:", err)
    }
  }

  if (isLoading) {
    return (
      <Card className="p-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
      </Card>
    )
  }

  if (suggestions.length === 0) {
    return null
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-lg mb-4">Suggestions For You</h3>
      <div className="space-y-4">
        {suggestions.map((user) => (
          <div key={user.id} className="flex items-center justify-between">
            <Link href={`/profile/${user.id}`} className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar_url || ""} />
                <AvatarFallback>{user.display_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user.display_name || user.username}</p>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
              </div>
            </Link>
            <Button
              size="sm"
              variant={followingIds.has(user.id) ? "outline" : "default"}
              onClick={() =>
                followingIds.has(user.id) ? handleUnfollow(user.id) : handleFollow(user.id)
              }
            >
              {followingIds.has(user.id) ? "Following" : "Follow"}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  )
}
