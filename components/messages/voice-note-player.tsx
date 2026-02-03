"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, Download, AlertCircle } from "lucide-react"
import { formatSeconds } from "@/lib/voice-recorder"
import { cn } from "@/lib/utils"

interface VoiceNotePlayerProps {
  audioUrl: string
  duration?: number
  className?: string
}

export function VoiceNotePlayer({ audioUrl, duration = 0, className }: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(duration)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Validate URL on mount
  useEffect(() => {
    if (!audioUrl) {
      setError("No audio URL provided")
      return
    }

    // Check if it's a valid URL
    try {
      new URL(audioUrl)
    } catch {
      setError("Invalid audio URL format")
      console.error("[VoiceNotePlayer] Invalid URL:", audioUrl)
      return
    }

    // Test if URL is accessible
    const testAudio = new Audio()
    testAudio.crossOrigin = "anonymous"
    
    const timeoutId = setTimeout(() => {
      testAudio.src = ""
      console.warn("[VoiceNotePlayer] Audio URL took too long to respond:", audioUrl)
    }, 5000)

    testAudio.addEventListener("canplay", () => {
      clearTimeout(timeoutId)
      testAudio.src = ""
      // URL is accessible
    })

    testAudio.addEventListener("error", () => {
      clearTimeout(timeoutId)
      const code = testAudio.error?.code
      let msg = "Audio URL not accessible"
      if (code === 2) {
        msg = "Network error - voice_notes bucket may not exist"
      }
      console.error("[VoiceNotePlayer] URL validation failed:", {
        url: audioUrl,
        code,
        message: msg,
      })
      // Don't set error state here, wait for actual play attempt
    })

    testAudio.src = audioUrl

    return () => {
      clearTimeout(timeoutId)
      testAudio.src = ""
    }
  }, [audioUrl])

  const handlePlayPause = async () => {
    if (!audioRef.current) {
      // Create audio element
      const audio = new Audio()
      audioRef.current = audio

      audio.addEventListener("timeupdate", () => {
        setCurrentTime(Math.floor(audio.currentTime))
      })

      audio.addEventListener("loadedmetadata", () => {
        setTotalDuration(Math.floor(audio.duration))
        setError(null)
      })

      audio.addEventListener("ended", () => {
        setIsPlaying(false)
        setCurrentTime(0)
      })

      audio.addEventListener("play", () => {
        setIsPlaying(true)
        setError(null)
      })

      audio.addEventListener("pause", () => setIsPlaying(false))

      audio.addEventListener("canplay", () => {
        // Audio can start playing
        setError(null)
      })

      audio.addEventListener("error", () => {
        let errorMessage = "Failed to load audio"
        const errorCode = audio.error?.code
        
        if (errorCode) {
          switch (errorCode) {
            case 1: // MEDIA_ERR_ABORTED
              errorMessage = "Audio loading was aborted"
              break
            case 2: // MEDIA_ERR_NETWORK
              errorMessage = "Network error - check if voice_notes bucket exists in Supabase"
              break
            case 3: // MEDIA_ERR_DECODE
              errorMessage = "Audio format not supported or file is corrupted"
              break
            case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
              errorMessage = "Audio source not supported"
              break
          }
        }
        
        console.error("[VoiceNotePlayer] Audio error details:", {
          errorCode,
          errorMessage,
          url: audioUrl,
          audioError: audio.error,
        })
        setError(errorMessage)
        setIsPlaying(false)
        setIsLoading(false)
      })

      // Set source with crossOrigin for CORS
      audio.crossOrigin = "anonymous"
      audio.src = audioUrl
      
      // Try to load the audio
      audio.load()
    }

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      setIsLoading(true)
      try {
        await audioRef.current.play()
      } catch (err) {
        console.error("[VoiceNotePlayer] Error playing audio:", err)
        setError("Failed to play audio - check browser console")
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value)
    setCurrentTime(newTime)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(audioUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `voice-note-${Date.now()}.webm`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("[VoiceNotePlayer] Error downloading:", error)
    }
  }

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0

  if (error) {
    return (
      <div className={cn("flex items-center gap-2 p-3 bg-red-500/10 rounded-lg border border-red-200 dark:border-red-800", className)}>
        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2 p-3 bg-muted/30 rounded-lg", className)}>
      <Button
        size="icon"
        variant="ghost"
        onClick={handlePlayPause}
        disabled={isLoading}
        className="h-8 w-8 shrink-0"
      >
        {isLoading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatSeconds(currentTime)}
        </span>

        <div className="flex-1 relative h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <input
            type="range"
            min="0"
            max={totalDuration || 100}
            value={currentTime}
            onChange={handleSliderChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatSeconds(totalDuration || duration)}
        </span>
      </div>

      <Button
        size="icon"
        variant="ghost"
        onClick={handleDownload}
        className="h-8 w-8 shrink-0"
        title="Download voice note"
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  )
}
