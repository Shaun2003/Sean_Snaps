"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Post, Profile } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Search, MessageCircle } from "lucide-react"
import Link from "next/link"
import { PostDetailDialog } from "./post-detail-dialog"

interface SearchSectionProps {
  userId: string
}

interface PostWithDetails extends Post {
  profiles: Profile
  likes_count: number
  comments_count: number
}

export function SearchSection({ userId }: SearchSectionProps) {
  const [query, setQuery] = useState("")
  const [searchType, setSearchType] = useState<"posts" | "users">("posts")
  const [users, setUsers] = useState<Profile[]>([])
  const [posts, setPosts] = useState<PostWithDetails[]>([])
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [selectedPost, setSelectedPost] = useState<PostWithDetails | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    const fetchFollowing = async () => {
      const supabase = createClient()
      const { data } = await supabase.from("followers").select("following_id").eq("follower_id", userId)

      if (data) {
        setFollowing(new Set(data.map((f) => f.following_id)))
      }
    }
    fetchFollowing()
  }, [userId])

  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (query.trim().length >= 2) {
        handleSearch()
      } else {
        setUsers([])
        setPosts([])
      }
    }, 300)

    return () => clearTimeout(searchTimeout)
  }, [query, searchType])

  const handleSearch = async () => {
    setIsSearching(true)
    const supabase = createClient()

    if (searchType === "users") {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .neq("id", userId)
        .limit(20)

      if (data) setUsers(data)
    } else {
      const { data } = await supabase
        .from("posts")
        .select(`
          *,
          profiles!posts_user_id_fkey(*),
          post_likes (id),
          comments (id)
        `)
        .ilike("content", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(20)

      if (data) {
        const enriched = data.map((post) => ({
          ...post,
          likes_count: post.post_likes?.length || 0,
          comments_count: post.comments?.length || 0,
        }))
        setPosts(enriched)
      }
    }
    setIsSearching(false)
  }

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
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search posts or users..."
          className="pl-8 sm:pl-9 h-9 sm:h-10 text-sm"
        />
      </div>

      <Tabs value={searchType} onValueChange={(v) => setSearchType(v as "posts" | "users")}>
        <TabsList className="grid w-full grid-cols-2 h-9 sm:h-10">
          <TabsTrigger value="posts" className="text-xs sm:text-sm">
            Posts
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs sm:text-sm">
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2">
          {users.length === 0 && query.length >= 2 && !isSearching && (
            <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">No users found</p>
          )}
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <Link href={`/profile/${user.id}`}>
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                  <AvatarImage src={user.avatar_url || ""} />
                  <AvatarFallback className="text-sm">{user.display_name?.[0] || "U"}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/profile/${user.id}`}
                  className="font-semibold text-xs sm:text-sm hover:underline truncate block"
                >
                  {user.username}
                </Link>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.display_name}</p>
              </div>
              <Button
                variant={following.has(user.id) ? "outline" : "default"}
                size="sm"
                onClick={() => handleFollow(user.id)}
                className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3"
              >
                {following.has(user.id) ? "Following" : "Follow"}
              </Button>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="posts" className="mt-3 sm:mt-4">
          {posts.length === 0 && query.length >= 2 && !isSearching && (
            <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">No posts found</p>
          )}
          <div className="grid grid-cols-3 gap-0.5 sm:gap-1 md:gap-2">
            {posts.map((post) => (
              <button
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="relative aspect-square group overflow-hidden rounded-none sm:rounded-sm md:rounded-lg bg-muted"
              >
                {post.image_url ? (
                  <img
                    src={post.image_url || "/placeholder.svg"}
                    alt=""
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-1 sm:p-2">
                    <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-3 sm:line-clamp-4 text-center">
                      {post.content}
                    </p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 sm:gap-4">
                  <span className="flex items-center gap-0.5 sm:gap-1 text-white font-semibold text-xs sm:text-sm">
                    {post.likes_count}
                  </span>
                  <span className="flex items-center gap-0.5 sm:gap-1 text-white font-semibold text-xs sm:text-sm">
                    <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 fill-white" />
                    {post.comments_count}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {query.length < 2 && (
        <p className="text-center text-muted-foreground py-6 sm:py-8 text-xs sm:text-sm">
          Type at least 2 characters to search
        </p>
      )}

      {selectedPost && (
        <PostDetailDialog
          post={selectedPost as any}
          currentUserId={userId}
          open={!!selectedPost}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedPost(null)
            }
          }}
        />
      )}
    </div>
  )
}
