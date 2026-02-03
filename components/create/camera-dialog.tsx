"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Button } from "@/components/ui/button"
import { Camera, Video, X, RotateCcw, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

interface CameraDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCapture: (file: File, type: "image" | "video") => void
}

export function CameraDialog({ open, onOpenChange, onCapture }: CameraDialogProps) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [mode, setMode] = useState<"photo" | "video">("photo")
  const [isRecording, setIsRecording] = useState(false)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    if (open) {
      startCamera()
      // Hide the dialog overlay for full screen camera view
      const overlay = document.querySelector('[data-slot="dialog-overlay"]')
      if (overlay) {
        (overlay as HTMLElement).style.display = 'none'
      }
    } else {
      stopCamera()
      // Show the overlay again
      const overlay = document.querySelector('[data-slot="dialog-overlay"]')
      if (overlay) {
        (overlay as HTMLElement).style.display = ''
      }
    }

    return () => {
      stopCamera()
      // Cleanup: show the overlay again
      const overlay = document.querySelector('[data-slot="dialog-overlay"]')
      if (overlay) {
        (overlay as HTMLElement).style.display = ''
      }
    }
  }, [open, facingMode])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: mode === "video",
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      alert("Unable to access camera. Please grant camera permissions.")
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current) return

    const canvas = document.createElement("canvas")
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(videoRef.current, 0, 0)
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" })
        onCapture(file, "image")
        onOpenChange(false)
      }
    }, "image/jpeg")
  }

  const startRecording = () => {
    if (!stream) return

    chunksRef.current = []
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" })

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data)
      }
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" })
      const file = new File([blob], `video_${Date.now()}.webm`, { type: "video/webm" })
      onCapture(file, "video")
      onOpenChange(false)
    }

    mediaRecorderRef.current = mediaRecorder
    mediaRecorder.start()
    setIsRecording(true)
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="fixed inset-0 top-0! left-0! translate-x-0! translate-y-0! max-w-none w-screen! h-screen! p-0! rounded-none! border-0! bg-black! overflow-hidden! z-9999!"
        showCloseButton={false}
        suppressHydrationWarning
      >
        <VisuallyHidden>
          <DialogTitle>Camera</DialogTitle>
        </VisuallyHidden>
        <div className="relative bg-black w-screen h-screen flex items-center justify-center overflow-hidden animate-in fade-in duration-300">
          {/* Video stream - positioned to cover the entire area */}
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="absolute inset-0 w-screen h-screen object-contain bg-black"
            style={{
              aspectRatio: 'auto',
              width: '100%',
              height: '100%',
            }}
          />
          
          {/* Gradient overlays for better button visibility */}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

          {/* Top Section */}
          <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 md:p-8 flex items-center justify-between z-30 animate-in slide-in-from-top duration-500">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="rounded-full bg-white/20 backdrop-blur text-white hover:bg-white/30 border border-white/30 transition-all duration-200 h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12"
            >
              <X className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6" />
            </Button>

            {/* Recording Indicator */}
            {isRecording && (
              <div className="flex items-center gap-2 bg-red-500 text-white px-3 sm:px-4 md:px-6 py-2 sm:py-2 md:py-3 rounded-full shadow-lg border border-red-400 font-bold text-xs sm:text-xs md:text-sm animate-pulse">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full animate-pulse" />
                <span className="hidden sm:inline">RECORDING</span>
                <span className="sm:hidden">REC</span>
              </div>
            )}

            {/* Mode Selector */}
            <div className="flex gap-1 sm:gap-2 bg-black/60 backdrop-blur-md rounded-full p-1 sm:p-1.5 border border-white/20">
              <Button
                variant={mode === "photo" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMode("photo")}
                className={cn(
                  "rounded-full transition-all duration-300 font-bold text-xs sm:text-sm px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5",
                  mode === "photo"
                    ? "bg-white text-black shadow-lg"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )}
              >
                <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-1" />
                <span className="hidden sm:inline">Photo</span>
              </Button>
              <Button
                variant={mode === "video" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMode("video")}
                className={cn(
                  "rounded-full transition-all duration-300 font-bold text-xs sm:text-sm px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5",
                  mode === "video"
                    ? "bg-white text-black shadow-lg"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )}
              >
                <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-1" />
                <span className="hidden sm:inline">Video</span>
              </Button>
            </div>
          </div>

          {/* Bottom Controls Section */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 z-30 animate-in slide-in-from-bottom duration-500">
            <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-8">
              {/* Flip Camera */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFacingMode}
                className="rounded-full bg-white/20 backdrop-blur text-white hover:bg-white/30 border border-white/30 transition-all duration-200 h-11 w-11 sm:h-12 sm:w-12 md:h-14 md:w-14 hover:scale-110"
                title="Flip camera"
              >
                <RotateCcw className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
              </Button>

              {/* Capture/Record Button - Center */}
              {mode === "photo" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={capturePhoto}
                  className="rounded-full w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-white hover:bg-white/90 border-4 border-white shadow-2xl hover:shadow-xl transition-all duration-200 hover:scale-105"
                  title="Take photo"
                >
                  <Circle className="h-8 w-8 sm:h-9 sm:w-9 md:h-12 md:w-12 fill-white" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={cn(
                    "rounded-full w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 border-4 border-white shadow-2xl transition-all duration-200 hover:scale-105",
                    isRecording
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-white hover:bg-white/90"
                  )}
                  title={isRecording ? "Stop recording" : "Start recording"}
                >
                  {isRecording ? (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 bg-white rounded-sm animate-pulse" />
                  ) : (
                    <Circle className="h-8 w-8 sm:h-9 sm:w-9 md:h-12 md:w-12 fill-red-500 text-red-500" />
                  )}
                </Button>
              )}

              {/* Spacer */}
              <div className="w-11 sm:w-12 md:w-14" />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
