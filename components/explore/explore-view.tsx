"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Search, Heart, MessageCircle, X } from "lucide-react"
import type { Post, Profile } from "@/lib/types"
import { useDebounce } from "@/hooks/use-debounce"

interface ExploreViewProps {
  posts: Post[]
  currentUserId: string
}

export function ExploreView({ posts, currentUserId }: ExploreViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debouncedQuery = useDebounce(searchQuery, 300)

  const searchUsers = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      const supabase = createClient()

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", currentUserId)
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(10)

      setSearchResults(data || [])
      setIsSearching(false)
    },
    [currentUserId],
  )

  useEffect(() => {
    searchUsers(debouncedQuery)
  }, [debouncedQuery, searchUsers])

  const clearSearch = () => {
    setSearchQuery("")
    setSearchResults([])
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-4">
      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users..."
          className="pl-10 pr-10 h-11"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search results */}
      {searchQuery && (
        <div className="mb-6">
          {isSearching ? (
            <div className="py-8 text-center text-muted-foreground">Searching...</div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Users</h2>
              {searchResults.map((user) => (
                <Link
                  key={user.id}
                  href={`/profile/${user.username}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors"
                >
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-secondary">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url || "/placeholder.svg"}
                        alt={user.username || "User"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-lg font-semibold text-muted-foreground">
                        {(user.username || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{user.username}</p>
                    {user.full_name && <p className="text-sm text-muted-foreground">{user.full_name}</p>}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">No users found for &quot;{searchQuery}&quot;</div>
          )}
        </div>
      )}

      {/* Posts grid (shown when not searching) */}
      {!searchQuery && (
        <>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Explore</h2>
          {posts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No posts to explore yet</div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {posts.map((post, index) => (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  className={`relative bg-secondary overflow-hidden group ${
                    // Make some posts span 2 columns for visual interest
                    index % 10 === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"
                  }`}
                >
                  {post.image_url ? (
                    <img
                      src={post.image_url || "/placeholder.svg"}
                      alt={post.caption || "Post"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center p-2 bg-gradient-to-br from-secondary to-muted">
                      <p className="text-xs text-muted-foreground line-clamp-3 text-center">{post.caption}</p>
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <div className="flex items-center gap-1 text-background font-semibold">
                      <Heart className="h-5 w-5 fill-background" />
                      <span>{post.likes_count}</span>
                    </div>
                    <div className="flex items-center gap-1 text-background font-semibold">
                      <MessageCircle className="h-5 w-5 fill-background" />
                      <span>{post.comments_count}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
