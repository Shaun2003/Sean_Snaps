"use client"

import { PostCard } from "@/components/post/post-card"
import type { Post } from "@/lib/types"

interface FeedViewProps {
  posts: Post[]
  currentUserId: string
}

export function FeedView({ posts, currentUserId }: FeedViewProps) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <p className="text-lg font-medium mb-2">No posts yet</p>
        <p className="text-muted-foreground">Follow other users or create your first post to see content here.</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} />
      ))}
    </div>
  )
}
