"use client"

import { useState } from "react"
import type { PostMedia } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CarouselPostProps {
  media: PostMedia[]
  onMediaClick?: () => void
}

export function CarouselPost({ media, onMediaClick }: CarouselPostProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!media || media.length === 0) {
    return null
  }

  const currentMedia = media[currentIndex]
  const isVideo = currentMedia.media_type === "video"
  const hasMultiple = media.length > 1

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1))
  }

  return (
    <div className="relative bg-black rounded-lg overflow-hidden group">
      {/* Media container */}
      <div className="relative aspect-square bg-black" onClick={onMediaClick}>
        {isVideo ? (
          <video
            src={currentMedia.media_url}
            controls
            className="w-full h-full object-contain"
          />
        ) : (
          <img
            src={currentMedia.media_url}
            alt={`Post media ${currentIndex + 1}`}
            className="w-full h-full object-contain cursor-pointer hover:opacity-95 transition-opacity"
          />
        )}
      </div>

      {/* Navigation arrows */}
      {hasMultiple && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleNext}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Indicators */}
      {hasMultiple && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {media.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "h-2 rounded-full transition-all",
                index === currentIndex ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/75",
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Counter */}
      {hasMultiple && (
        <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full font-medium">
          {currentIndex + 1}/{media.length}
        </div>
      )}

      {/* Video badge */}
      {isVideo && (
        <div className="absolute top-3 left-3 bg-red-500 text-white text-xs px-2 py-1 rounded font-medium">
          VIDEO
        </div>
      )}
    </div>
  )
}
