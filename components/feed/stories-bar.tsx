"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { Story, Profile } from "@/lib/types"
import { StoryViewer } from "./story-viewer"
import { CreateStoryDialog } from "./create-story-dialog"
import { cn } from "@/lib/utils"

interface StoriesBarProps {
  userId: string
}

interface StoryGroup {
  user: Profile
  stories: Story[]
  hasUnviewed: boolean
}

export function StoriesBar({ userId }: StoriesBarProps) {
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([])
  const [myStories, setMyStories] = useState<Story[]>([])
  const [selectedGroup, setSelectedGroup] = useState<StoryGroup | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const fetchStories = async () => {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single()
      if (profile) setCurrentProfile(profile)

      const { data: following } = await supabase.from("followers").select("following_id").eq("follower_id", userId)

      const followingIds = following?.map((f) => f.following_id) || []

      const { data: stories } = await supabase
        .from("stories")
        .select(`
          *,
          profiles (*),
          story_views (*)
        `)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })

      if (!stories) return

      const mine = stories.filter((s) => s.user_id === userId)
      setMyStories(mine)

      const groupsMap = new Map<string, StoryGroup>()

      stories
        .filter((s) => s.user_id !== userId && followingIds.includes(s.user_id))
        .forEach((story) => {
          const existingGroup = groupsMap.get(story.user_id)
          const isViewed = story.story_views?.some((v: { user_id: string }) => v.user_id === userId)

          if (existingGroup) {
            existingGroup.stories.push(story)
            if (!isViewed) existingGroup.hasUnviewed = true
          } else {
            groupsMap.set(story.user_id, {
              user: story.profiles as Profile,
              stories: [story],
              hasUnviewed: !isViewed,
            })
          }
        })

      setStoryGroups(Array.from(groupsMap.values()))
    }

    fetchStories()
  }, [userId])

  const handleRefreshStories = () => {
    // Trigger re-fetch by updating state
    const supabase = createClient()
    const fetchStories = async () => {
      const { data: stories } = await supabase
        .from("stories")
        .select(`*, profiles (*), story_views (*)`)
        .eq("user_id", userId)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })

      if (stories) setMyStories(stories)
    }
    fetchStories()
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4 mb-4 scrollbar-hide">
        {/* Your Story */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <button
            onClick={() =>
              myStories.length > 0
                ? setSelectedGroup({ user: currentProfile!, stories: myStories, hasUnviewed: false })
                : setShowCreateDialog(true)
            }
            className="relative"
          >
            <div
              className={cn(
                "rounded-full p-[2px]",
                myStories.length > 0 ? "bg-gradient-to-tr from-primary to-pink-500" : "bg-muted",
              )}
            >
              <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-background">
                <AvatarImage src={currentProfile?.avatar_url || ""} />
                <AvatarFallback>{currentProfile?.display_name?.[0] || "Y"}</AvatarFallback>
              </Avatar>
            </div>
            {myStories.length === 0 && (
              <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              </div>
            )}
          </button>
          <span className="text-[10px] sm:text-xs text-muted-foreground">Your story</span>
        </div>

        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowCreateDialog(true)}
            className="h-14 w-14 sm:h-16 sm:w-16 rounded-full border-dashed border-2 hover:border-primary hover:bg-primary/5"
          >
            <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
          <span className="text-[10px] sm:text-xs text-muted-foreground">Add story</span>
        </div>

        {/* Other Stories - only from followed users */}
        {storyGroups.map((group) => (
          <div key={group.user.id} className="flex flex-col items-center gap-1 flex-shrink-0">
            <button onClick={() => setSelectedGroup(group)}>
              <div
                className={cn(
                  "rounded-full p-[2px]",
                  group.hasUnviewed ? "bg-gradient-to-tr from-primary to-pink-500" : "bg-muted",
                )}
              >
                <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-background">
                  <AvatarImage src={group.user.avatar_url || ""} />
                  <AvatarFallback>{group.user.display_name?.[0] || "U"}</AvatarFallback>
                </Avatar>
              </div>
            </button>
            <span className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[56px] sm:max-w-[64px]">
              {group.user.username}
            </span>
          </div>
        ))}
      </div>

      {selectedGroup && (
        <StoryViewer
          stories={selectedGroup.stories}
          user={selectedGroup.user}
          currentUserId={userId}
          onClose={() => setSelectedGroup(null)}
        />
      )}

      <CreateStoryDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        userId={userId}
        onStoryCreated={handleRefreshStories}
      />
    </>
  )
}
