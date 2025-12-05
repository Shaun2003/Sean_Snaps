"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2, VolumeX, ScreenShare } from "lucide-react"
import type { Profile } from "@/lib/types"

interface CallDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participant: Profile
  participants: Profile[]
  callType: "voice" | "video"
  onEndCall: (duration: number) => void
  currentUserId: string
  conversationId: string
}

export function CallDialog({
  open,
  onOpenChange,
  participant,
  participants,
  callType,
  onEndCall,
  currentUserId,
  conversationId,
}: CallDialogProps) {
  const [callState, setCallState] = useState<"connecting" | "ringing" | "connected" | "ended">("connecting")
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isSpeaker, setIsSpeaker] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  // WebRTC refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  const isGroupCall = participants.length > 1

  // Initialize WebRTC
  const initializeMedia = useCallback(async () => {
    try {
      const constraints = {
        audio: true,
        video: callType === "video" ? { width: 1280, height: 720 } : false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStreamRef.current = stream

      if (localVideoRef.current && callType === "video") {
        localVideoRef.current.srcObject = stream
      }

      // Create peer connection with STUN servers
      const config: RTCConfiguration = {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
      }

      peerConnectionRef.current = new RTCPeerConnection(config)

      // Add local tracks to peer connection
      stream.getTracks().forEach((track) => {
        peerConnectionRef.current?.addTrack(track, stream)
      })

      // Handle incoming tracks
      peerConnectionRef.current.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0]
        }
      }

      // Handle ICE candidates
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          // In production, send this to signaling server
          console.log("[v0] ICE candidate:", event.candidate)
        }
      }

      // Handle connection state changes
      peerConnectionRef.current.onconnectionstatechange = () => {
        const state = peerConnectionRef.current?.connectionState
        if (state === "connected") {
          setCallState("connected")
        } else if (state === "disconnected" || state === "failed") {
          setCallState("ended")
        }
      }

      // Simulate call connection for demo (in production, use signaling server)
      setTimeout(() => setCallState("ringing"), 1000)
      setTimeout(() => setCallState("connected"), 3000)
    } catch (error) {
      console.error("[v0] Failed to get media:", error)
      // Fallback to demo mode if permissions denied
      setTimeout(() => setCallState("ringing"), 1000)
      setTimeout(() => setCallState("connected"), 3000)
    }
  }, [callType])

  useEffect(() => {
    if (!open) {
      // Cleanup
      localStreamRef.current?.getTracks().forEach((track) => track.stop())
      peerConnectionRef.current?.close()
      setCallState("connecting")
      setDuration(0)
      setIsMuted(false)
      setIsVideoOff(false)
      setIsScreenSharing(false)
      return
    }

    initializeMedia()
  }, [open, initializeMedia])

  useEffect(() => {
    if (callState !== "connected") return

    const interval = setInterval(() => {
      setDuration((d) => d + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [callState])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleEndCall = () => {
    setCallState("ended")
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    peerConnectionRef.current?.close()
    onEndCall(duration)
    setTimeout(() => onOpenChange(false), 1000)
  }

  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = isMuted
      setIsMuted(!isMuted)
    } else {
      setIsMuted(!isMuted)
    }
  }

  const toggleVideo = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = isVideoOff
      setIsVideoOff(!isVideoOff)
    } else {
      setIsVideoOff(!isVideoOff)
    }
  }

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen share and switch back to camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      const videoTrack = stream.getVideoTracks()[0]

      const sender = peerConnectionRef.current?.getSenders().find((s) => s.track?.kind === "video")
      sender?.replaceTrack(videoTrack)

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      setIsScreenSharing(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const screenTrack = stream.getVideoTracks()[0]

        const sender = peerConnectionRef.current?.getSenders().find((s) => s.track?.kind === "video")
        sender?.replaceTrack(screenTrack)

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }

        screenTrack.onended = () => {
          toggleScreenShare()
        }

        setIsScreenSharing(true)
      } catch (error) {
        console.error("[v0] Screen share failed:", error)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-gradient-to-b from-zinc-900 to-black text-white border-0">
        <div className="relative min-h-[600px]">
          {/* Video feeds */}
          {callType === "video" && callState === "connected" && (
            <>
              {/* Remote video (main) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Local video (picture-in-picture) */}
              <div className="absolute top-4 right-4 w-32 h-24 sm:w-48 sm:h-36 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isVideoOff ? "hidden" : ""}`}
                />
                {isVideoOff && (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                    <VideoOff className="size-8 text-white/50" />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Audio call or connecting state */}
          {(callType === "voice" || callState !== "connected") && (
            <div className="flex flex-col items-center justify-center min-h-[600px] p-8">
              {/* Participant info */}
              <div className="text-center mb-8">
                {isGroupCall ? (
                  <div className="flex -space-x-4 justify-center mb-4">
                    {participants.slice(0, 3).map((p, i) => (
                      <Avatar key={p.id} className="size-20 border-4 border-zinc-900" style={{ zIndex: 3 - i }}>
                        <AvatarImage src={p.avatar_url || ""} />
                        <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-purple-600">
                          {p.display_name?.[0] || p.username?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {participants.length > 3 && (
                      <div className="size-20 rounded-full bg-zinc-700 border-4 border-zinc-900 flex items-center justify-center">
                        <span className="text-lg font-semibold">+{participants.length - 3}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative inline-block mb-4">
                    <Avatar className="size-28 border-4 border-white/20">
                      <AvatarImage src={participant.avatar_url || ""} />
                      <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-purple-600">
                        {participant.display_name?.[0] || participant.username?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {callState === "ringing" && (
                      <div className="absolute inset-0 rounded-full animate-ping bg-primary/30" />
                    )}
                  </div>
                )}

                <h2 className="text-xl font-semibold">
                  {isGroupCall
                    ? `Group Call (${participants.length + 1})`
                    : participant.display_name || participant.username}
                </h2>
                <p className="text-white/60 text-sm mt-1">
                  {callState === "connecting" && "Connecting..."}
                  {callState === "ringing" && "Ringing..."}
                  {callState === "connected" && formatDuration(duration)}
                  {callState === "ended" && "Call ended"}
                </p>
              </div>

              {/* Call type indicator */}
              <div className="flex items-center gap-2 mb-8 text-white/60 text-sm">
                {callType === "video" ? <Video className="size-4" /> : <Phone className="size-4" />}
                <span>{callType === "video" ? "Video Call" : "Voice Call"}</span>
              </div>
            </div>
          )}

          {/* Call controls - always visible at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                size="icon"
                className={`size-12 sm:size-14 rounded-full ${isMuted ? "bg-red-500/80 hover:bg-red-500" : "bg-white/10 hover:bg-white/20"}`}
                onClick={toggleMute}
              >
                {isMuted ? <MicOff className="size-5 sm:size-6" /> : <Mic className="size-5 sm:size-6" />}
              </Button>

              {callType === "video" && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`size-12 sm:size-14 rounded-full ${isVideoOff ? "bg-red-500/80 hover:bg-red-500" : "bg-white/10 hover:bg-white/20"}`}
                    onClick={toggleVideo}
                  >
                    {isVideoOff ? <VideoOff className="size-5 sm:size-6" /> : <Video className="size-5 sm:size-6" />}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className={`size-12 sm:size-14 rounded-full ${isScreenSharing ? "bg-primary/80 hover:bg-primary" : "bg-white/10 hover:bg-white/20"}`}
                    onClick={toggleScreenShare}
                  >
                    <ScreenShare className="size-5 sm:size-6" />
                  </Button>
                </>
              )}

              <Button
                variant="ghost"
                size="icon"
                className={`size-12 sm:size-14 rounded-full ${!isSpeaker ? "bg-red-500/80 hover:bg-red-500" : "bg-white/10 hover:bg-white/20"}`}
                onClick={() => setIsSpeaker(!isSpeaker)}
              >
                {isSpeaker ? <Volume2 className="size-5 sm:size-6" /> : <VolumeX className="size-5 sm:size-6" />}
              </Button>

              <Button
                size="icon"
                className="size-12 sm:size-14 rounded-full bg-red-500 hover:bg-red-600"
                onClick={handleEndCall}
              >
                <PhoneOff className="size-5 sm:size-6" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
