"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { X, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import type { Profile, Story } from "@/lib/types"

interface StoryViewerProps {
  stories: Story[]
  user: Profile
  onClose: () => void
}

export function StoryViewer({ stories, user, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const shouldAdvanceRef = useRef(false)

  const currentStory = stories[currentIndex]
  const storyDuration = 5000 // 5 seconds per story

  const goToNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setProgress(0)
    } else {
      onClose()
    }
  }, [currentIndex, stories.length, onClose])

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      setProgress(0)
    }
  }, [currentIndex])

  useEffect(() => {
    if (shouldAdvanceRef.current) {
      shouldAdvanceRef.current = false
      goToNext()
    }
  }, [progress, goToNext])

  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          shouldAdvanceRef.current = true
          return 0
        }
        return prev + 100 / (storyDuration / 100)
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isPaused, storyDuration])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goToNext()
      if (e.key === "ArrowLeft") goToPrevious()
      if (e.key === "Escape") onClose()
      if (e.key === " ") {
        e.preventDefault()
        setIsPaused((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [goToNext, goToPrevious, onClose])

  return (
    <div className="fixed inset-0 z-50 bg-foreground/95">
      <div className="h-full w-full max-w-lg mx-auto flex flex-col">
        {/* Progress bars */}
        <div className="flex gap-1 p-2 pt-4">
          {stories.map((_, index) => (
            <div key={index} className="flex-1 h-0.5 bg-background/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-background transition-all duration-100 ease-linear"
                style={{
                  width: index < currentIndex ? "100%" : index === currentIndex ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full overflow-hidden bg-background/20">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url || "/placeholder.svg"}
                  alt={user.username || "User"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-sm font-semibold text-background">
                  {(user.username || "U").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-background">{user.username}</p>
              <p className="text-xs text-background/70">
                {formatDistanceToNow(new Date(currentStory.created_at), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPaused(!isPaused)}
              className="text-background hover:bg-background/20"
            >
              {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-background hover:bg-background/20">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Story content */}
        <div
          className="flex-1 flex items-center justify-center relative px-4"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            if (x < rect.width / 2) {
              goToPrevious()
            } else {
              goToNext()
            }
          }}
        >
          {currentStory.image_url ? (
            <img
              src={currentStory.image_url || "/placeholder.svg"}
              alt="Story"
              className="max-h-full max-w-full object-contain rounded-xl"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-8">
              <p className="text-2xl text-background text-center font-medium">{currentStory.text_content}</p>
            </div>
          )}

          {/* Navigation hints */}
          {currentIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                goToPrevious()
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/20 flex items-center justify-center text-background hover:bg-background/30 transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {currentIndex < stories.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                goToNext()
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/20 flex items-center justify-center text-background hover:bg-background/30 transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Text overlay if both image and text */}
        {currentStory.image_url && currentStory.text_content && (
          <div className="absolute bottom-20 left-0 right-0 p-4">
            <p className="text-center text-background text-lg font-medium drop-shadow-lg">
              {currentStory.text_content}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
