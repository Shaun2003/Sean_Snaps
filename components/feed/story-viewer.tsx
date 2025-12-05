"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Story, Profile } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface StoryViewerProps {
  stories: Story[]
  user: Profile
  currentUserId: string
  onClose: () => void
}

export function StoryViewer({ stories, user, currentUserId, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const shouldCloseRef = useRef(false)

  const currentStory = stories[currentIndex]

  const markAsViewed = useCallback(
    async (storyId: string) => {
      const supabase = createClient()
      await supabase.from("story_views").upsert({ story_id: storyId, user_id: currentUserId })
    },
    [currentUserId],
  )

  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setProgress(0)
    } else {
      shouldCloseRef.current = true
    }
  }, [currentIndex, stories.length])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      setProgress(0)
    }
  }, [currentIndex])

  useEffect(() => {
    if (shouldCloseRef.current) {
      shouldCloseRef.current = false
      onClose()
    }
  })

  useEffect(() => {
    if (currentStory) {
      markAsViewed(currentStory.id)
    }
  }, [currentStory, markAsViewed])

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setTimeout(() => goNext(), 0)
          return 0
        }
        return prev + 2
      })
    }, 100)

    return () => clearInterval(timer)
  }, [currentIndex, goNext])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev()
      if (e.key === "ArrowRight") goNext()
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [goNext, goPrev, onClose])

  if (!currentStory) return null

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <div className="relative w-full max-w-md h-full max-h-[90vh] bg-black rounded-lg overflow-hidden">
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
          {stories.map((_, index) => (
            <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100"
                style={{
                  width: index < currentIndex ? "100%" : index === currentIndex ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-0 right-0 z-10 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white">
              <AvatarImage src={user.avatar_url || ""} />
              <AvatarFallback>{user.display_name?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-medium text-sm">{user.username}</p>
              <p className="text-white/70 text-xs">
                {formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Story Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          {currentStory.image_url ? (
            <img
              src={currentStory.image_url || "/placeholder.svg"}
              alt="Story"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex items-center justify-center p-8">
              <p className="text-white text-xl text-center">{currentStory.content}</p>
            </div>
          )}
        </div>

        {/* Text overlay on image */}
        {currentStory.image_url && currentStory.content && (
          <div className="absolute bottom-20 left-0 right-0 p-4">
            <p className="text-white text-center text-lg shadow-lg">{currentStory.content}</p>
          </div>
        )}

        {/* Navigation */}
        <button onClick={goPrev} className="absolute left-0 top-1/2 -translate-y-1/2 w-1/3 h-2/3" />
        <button onClick={goNext} className="absolute right-0 top-1/2 -translate-y-1/2 w-1/3 h-2/3" />

        {currentIndex > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
        )}

        {currentIndex < stories.length - 1 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        )}
      </div>
    </div>
  )
}
