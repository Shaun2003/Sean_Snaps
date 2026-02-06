"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, Volume2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface VoiceNotePlayerProps {
  audioUrl: string | null | undefined
  duration?: number | null
  className?: string
}

export function VoiceNotePlayer({ audioUrl, duration, className }: VoiceNotePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(duration || 0)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Validate audio URL
  const isValidUrl = audioUrl && typeof audioUrl === 'string' && (audioUrl.startsWith('http') || audioUrl.startsWith('blob:'))

  const togglePlay = () => {
    if (!audioRef.current || error) return
    
    try {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        const playPromise = audioRef.current.play()
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            setError("Unable to play audio")
          })
        }
      }
      setIsPlaying(!isPlaying)
    } catch (err) {
      setError("Playback error")
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setTotalDuration(audioRef.current.duration || duration || 0)
      setIsLoading(false)
      setError(null)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handleError = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget
    const errorCode = audio.error?.code
    let errorMsg = "Unable to load audio"
    
    switch (errorCode) {
      case 1:
        errorMsg = "Audio loading aborted"
        break
      case 2:
        errorMsg = "Network error"
        break
      case 3:
        errorMsg = "Audio decoding failed"
        break
      case 4:
        errorMsg = "Audio format not supported"
        break
    }
    
    setError(errorMsg)
    setIsLoading(false)
  }

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00"
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    setIsPlaying(false)
    setCurrentTime(0)
  }, [audioUrl])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
      }
    }
  }, [])

  if (!isValidUrl) {
    return (
      <div className={cn(
        "flex items-center gap-2 bg-destructive/10 rounded-lg px-3 py-2 text-destructive text-sm",
        className
      )}>
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>Invalid audio source</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn(
        "flex items-center gap-2 bg-destructive/10 rounded-lg px-3 py-2 text-destructive text-sm",
        className
      )}>
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex items-center gap-2 bg-muted rounded-lg px-3 py-2 max-w-xs",
      className
    )}>
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
        crossOrigin="anonymous"
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={togglePlay}
        className="h-8 w-8 p-0 shrink-0"
        disabled={isLoading || error !== null}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      <div className="flex items-center gap-1 flex-1 min-w-0">
        <Volume2 className="h-3 w-3 text-muted-foreground shrink-0" />
        <div className="flex-1 bg-muted-foreground/20 rounded h-1 cursor-pointer"
          onClick={(e) => {
            if (!isLoading && !error && audioRef.current) {
              const rect = e.currentTarget.getBoundingClientRect()
              const percent = (e.clientX - rect.left) / rect.width
              audioRef.current.currentTime = Math.max(0, percent * totalDuration)
            }
          }}
        >
          <div
            className="bg-primary h-full rounded transition-all"
            style={{
              width: totalDuration ? `${(currentTime / totalDuration) * 100}%` : "0%"
            }}
          />
        </div>
      </div>

      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatTime(currentTime)} / {formatTime(totalDuration)}
      </span>
    </div>
  )
}
