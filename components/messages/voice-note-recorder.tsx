"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, Play, Pause, Trash2, Send } from "lucide-react"
import { VoiceRecorder, formatSeconds } from "@/lib/voice-recorder"
import { cn } from "@/lib/utils"

interface VoiceNoteRecorderProps {
  onSend: (audioBlob: Blob, duration: number, mimeType?: string) => Promise<void>
  onCancel?: () => void
  disabled?: boolean
}

export function VoiceNoteRecorder({ onSend, onCancel, disabled }: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null)
  const [isPlayingPreview, setIsPlayingPreview] = useState(false)
  const [isSending, setIsSending] = useState(false)
  
  const recorderRef = useRef<VoiceRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Update duration timer
  useEffect(() => {
    if (!isRecording) return

    timerRef.current = setInterval(() => {
      if (recorderRef.current) {
        setDuration(recorderRef.current.getDuration())
      }
    }, 100)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRecording])

  const startRecording = async () => {
    try {
      const recorder = new VoiceRecorder()
      await recorder.startRecording()
      recorderRef.current = recorder
      setIsRecording(true)
      setDuration(0)
      setRecordingBlob(null)
      setIsPaused(false)
    } catch (error) {
      console.error("[VoiceNoteRecorder] Error starting recording:", error)
    }
  }

  const stopRecording = async () => {
    if (!recorderRef.current) return

    try {
      const result = await recorderRef.current.stopRecording()
      setRecordingBlob(result.blob)
      setDuration(result.duration)
      setIsRecording(false)
      setIsPaused(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    } catch (error) {
      console.error("[VoiceNoteRecorder] Error stopping recording:", error)
    }
  }

  const pauseRecording = () => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.pauseRecording()
      setIsPaused(true)
    }
  }

  const resumeRecording = () => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.resumeRecording()
      setIsPaused(false)
    }
  }

  const cancelRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.cancel()
    }
    setIsRecording(false)
    setIsPaused(false)
    setDuration(0)
    setRecordingBlob(null)
    if (timerRef.current) clearInterval(timerRef.current)
    onCancel?.()
  }

  const togglePlayPreview = () => {
    if (!audioRef.current || !recordingBlob) return

    if (isPlayingPreview) {
      audioRef.current.pause()
      setIsPlayingPreview(false)
    } else {
      const url = URL.createObjectURL(recordingBlob)
      audioRef.current.src = url
      audioRef.current.play()
      setIsPlayingPreview(true)
    }
  }

  const handleSend = async () => {
    if (!recordingBlob) return

    setIsSending(true)
    try {
      console.log("[VoiceNoteRecorder] Sending voice note blob - Size:", recordingBlob.size, "bytes, Type:", recordingBlob.type)
      await onSend(recordingBlob, duration, recordingBlob.type)
      setRecordingBlob(null)
      setDuration(0)
      setIsPlayingPreview(false)
    } catch (error) {
      console.error("[VoiceNoteRecorder] Error sending voice note:", error)
    } finally {
      setIsSending(false)
    }
  }

  // Recording UI
  if (isRecording) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
        <div className="flex-1 flex items-center gap-3">
          <div className="animate-pulse">
            <Mic className="h-5 w-5 text-red-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{formatSeconds(duration)}</p>
          </div>
        </div>

        {isPaused ? (
          <Button
            size="icon"
            variant="ghost"
            onClick={resumeRecording}
            className="h-8 w-8 text-blue-500 hover:text-blue-600"
          >
            <Play className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            onClick={pauseRecording}
            className="h-8 w-8 text-blue-500 hover:text-blue-600"
          >
            <Pause className="h-4 w-4" />
          </Button>
        )}

        <Button
          size="icon"
          variant="ghost"
          onClick={stopRecording}
          className="h-8 w-8 text-green-500 hover:text-green-600"
        >
          <Square className="h-4 w-4" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={cancelRecording}
          className="h-8 w-8 text-red-500 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // Preview UI
  if (recordingBlob) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
        <audio ref={audioRef} onEnded={() => setIsPlayingPreview(false)} />

        <Button
          size="icon"
          variant="ghost"
          onClick={togglePlayPreview}
          className="h-8 w-8"
        >
          {isPlayingPreview ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Voice note • {formatSeconds(duration)}
          </p>
        </div>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => setRecordingBlob(null)}
          className="h-8 w-8"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        <Button
          size="icon"
          onClick={handleSend}
          disabled={isSending}
          className="h-8 w-8"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // Start recording button
  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={startRecording}
      disabled={disabled}
      className={cn(
        "h-8 w-8 text-muted-foreground hover:text-foreground",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      title="Record voice note"
    >
      <Mic className="h-4 w-4" />
    </Button>
  )
}
