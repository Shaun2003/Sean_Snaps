"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import type { Profile, Story } from "@/lib/types"
import { StoryViewer } from "./story-viewer"

interface StoriesBarProps {
  storiesByUser: Record<string, { user: Profile; stories: Story[] }>
  currentUserId: string
}

export function StoriesBar({ storiesByUser, currentUserId }: StoriesBarProps) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  const userStories = Object.entries(storiesByUser)
  const hasOwnStory = storiesByUser[currentUserId]

  return (
    <>
      <div className="border-b border-border py-4">
        <div className="flex gap-4 overflow-x-auto px-4 scrollbar-hide">
          {/* Add story button */}
          <Link href="/stories/create" className="shrink-0 flex flex-col items-center gap-1">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
                {hasOwnStory ? (
                  <img
                    src={hasOwnStory.user.avatar_url || "/placeholder.svg?height=64&width=64&query=user avatar"}
                    alt="Your story"
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <Plus className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                <Plus className="h-3 w-3 text-primary-foreground" />
              </div>
            </div>
            <span className="text-xs text-muted-foreground">Your story</span>
          </Link>

          {/* Other users' stories */}
          {userStories
            .filter(([userId]) => userId !== currentUserId)
            .map(([userId, { user, stories }]) => (
              <button
                key={userId}
                onClick={() => setSelectedUser(userId)}
                className="shrink-0 flex flex-col items-center gap-1"
              >
                <div className="p-0.5 rounded-full story-ring">
                  <div className="h-[60px] w-[60px] rounded-full overflow-hidden border-2 border-background">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url || "/placeholder.svg"}
                        alt={user.username || "User"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-secondary flex items-center justify-center text-sm font-semibold text-muted-foreground">
                        {(user.username || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-xs max-w-16 truncate">{user.username}</span>
              </button>
            ))}
        </div>
      </div>

      {/* Story viewer modal */}
      {selectedUser && storiesByUser[selectedUser] && (
        <StoryViewer
          stories={storiesByUser[selectedUser].stories}
          user={storiesByUser[selectedUser].user}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </>
  )
}
