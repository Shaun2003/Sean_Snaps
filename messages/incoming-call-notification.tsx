"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Phone, PhoneOff, Video } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface IncomingCall {
  id: string
  initiator_id: string
  conversation_id: string
  call_type: "voice" | "video"
  initiator?: Profile
}

interface IncomingCallNotificationProps {
  userId: string
  onCallAccept?: (call: IncomingCall) => void
}

export function IncomingCallNotification({
  userId,
  onCallAccept,
}: IncomingCallNotificationProps) {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const [callerInfo, setCallerInfo] = useState<Profile | null>(null)
  const [isDeciding, setIsDeciding] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const ringtonePlaying = useRef(false)

  // Listen for incoming calls using polling + realtime
  useEffect(() => {
    if (!userId) return

    console.log(`[Incoming Call] Setting up listener for user: ${userId}`)

    // First, set up realtime listener on calls table
    const setupRealtimeListener = async () => {
      try {
        // Subscribe to the main calls channel
        const channel = supabase
          .channel("calls-channel")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "calls",
            },
            async (payload: any) => {
              const call = payload.new
              console.log("[Incoming Call] New call inserted:", call)

              // Check if this call is for the current user
              if (call.recipient_id === userId && (call.status === "initiating" || call.status === "ringing")) {
                console.log("[Incoming Call] Call is for current user! Fetching caller info...")

                // Fetch caller info
                const { data: caller, error } = await supabase
                  .from("profiles")
                  .select("*")
                  .eq("id", call.initiator_id)
                  .single()

                if (error) {
                  console.error("[Incoming Call] Error fetching caller:", error)
                  return
                }

                if (caller) {
                  console.log("[Incoming Call] Caller info retrieved:", caller.username)
                  setCallerInfo(caller)
                  setIncomingCall({
                    id: call.id,
                    initiator_id: call.initiator_id,
                    conversation_id: call.conversation_id,
                    call_type: call.call_type,
                    initiator: caller,
                  })

                  // Play ringtone
                  playRingtone()
                  toast({
                    title: "Incoming Call",
                    description: `${caller.display_name || caller.username} is calling...`,
                  })
                }
              }
            },
          )
          .subscribe((status: string) => {
            console.log(`[Incoming Call] Channel status: ${status}`)
          })

        channelRef.current = channel
      } catch (error) {
        console.error("[Incoming Call] Error setting up realtime:", error)
      }
    }

    setupRealtimeListener()

    // Also poll the calls table every 3 seconds as a fallback
    const pollInterval = setInterval(async () => {
      try {
        const { data: calls, error } = await supabase
          .from("calls")
          .select("*")
          .eq("recipient_id", userId)
          .in("status", ["initiating", "ringing"])
          .order("created_at", { ascending: false })
          .limit(1)

        if (error) {
          console.error("[Incoming Call] Error polling calls:", error)
          return
        }

        if (calls && calls.length > 0) {
          const call = calls[0]
          
          // Only show notification if we don't already have one
          if (!incomingCall || incomingCall.id !== call.id) {
            console.log("[Incoming Call] Found incoming call via polling:", call.id)

            // Fetch caller info
            const { data: caller } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", call.initiator_id)
              .single()

            if (caller) {
              setCallerInfo(caller)
              setIncomingCall({
                id: call.id,
                initiator_id: call.initiator_id,
                conversation_id: call.conversation_id,
                call_type: call.call_type,
                initiator: caller,
              })
              playRingtone()
            }
          }
        }
      } catch (error) {
        console.error("[Incoming Call] Poll error:", error)
      }
    }, 3000)

    return () => {
      // Cleanup
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
      clearInterval(pollInterval)
      ringtonePlaying.current = false
    }
  }, [userId, supabase, incomingCall, toast])

  const playRingtone = useCallback(() => {
    if (ringtonePlaying.current) return

    ringtonePlaying.current = true
    try {
      // Create a simple ringtone using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      const playTone = (freq: number, duration: number) => {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.value = freq
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + duration)
      }

      // Ring tone pattern - two short beeps
      let time = 0
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          if (ringtonePlaying.current) {
            playTone(520, 0.3)
          }
        }, i * 600)
      }
    } catch (error) {
      console.log("[Ringtone] Audio playback not available:", error)
    }
  }, [])

  const handleAccept = useCallback(async () => {
    console.log("[Incoming Call] Accept button clicked, current incomingCall:", incomingCall?.id)
    
    if (!incomingCall) {
      console.error("[Incoming Call] No incoming call to accept")
      return
    }

    setIsDeciding(true)
    console.log("[Incoming Call] Accepting call:", incomingCall.id)
    
    const callToAccept = incomingCall // Capture the call data immediately
    
    try {
      // Stop ringtone
      ringtonePlaying.current = false

      console.log("[Incoming Call] Updating call status in database...")
      // Update call status to connected
      const { error } = await supabase
        .from("calls")
        .update({ status: "connected" })
        .eq("id", callToAccept.id)

      if (error) {
        console.error("[Incoming Call] Error accepting:", error)
        toast({
          title: "Error",
          description: "Failed to accept call",
          variant: "destructive",
        })
        setIsDeciding(false)
        return
      }

      console.log("[Incoming Call] Call status updated to connected:", callToAccept.id)

      toast({
        title: "Call Accepted",
        description: `Connecting with ${callerInfo?.display_name || callerInfo?.username || "user"}...`,
      })

      // Notify parent component - THIS IS CRITICAL
      console.log("[Incoming Call] About to call onCallAccept with:", callToAccept.id)
      if (onCallAccept) {
        console.log("[Incoming Call] Calling onCallAccept callback with call data")
        onCallAccept(callToAccept)
        console.log("[Incoming Call] onCallAccept callback executed")
      } else {
        console.error("[Incoming Call] No onCallAccept callback provided!")
      }

      // Clear the notification after a slight delay to allow callback to execute
      setTimeout(() => {
        console.log("[Incoming Call] Clearing notification state")
        setIncomingCall(null)
        setCallerInfo(null)
        setIsDeciding(false)
      }, 500)
    } catch (error) {
      console.error("[Incoming Call] Exception in handleAccept:", error)
      toast({
        title: "Error",
        description: "Failed to accept call",
        variant: "destructive",
      })
    } finally {
      setIsDeciding(false)
    }
  }, [incomingCall, onCallAccept, supabase, toast, callerInfo])

  const handleReject = useCallback(async () => {
    if (!incomingCall) return

    setIsDeciding(true)
    ringtonePlaying.current = false

    try {
      // Update call status to ended
      await supabase
        .from("calls")
        .update({ status: "ended" })
        .eq("id", incomingCall.id)

      console.log("[Incoming Call] Call rejected:", incomingCall.id)

      toast({
        title: "Call Declined",
        description: "You declined the call",
      })

      // Clear the notification
      setIncomingCall(null)
      setCallerInfo(null)
    } catch (error) {
      console.error("[Incoming Call] Error rejecting call:", error)
      toast({
        title: "Error",
        description: "Failed to decline call",
        variant: "destructive",
      })
    } finally {
      setIsDeciding(false)
    }
  }, [incomingCall, supabase, toast])

  if (!incomingCall || !callerInfo) return null

  return (
    <Dialog open={!!incomingCall} onOpenChange={() => !isDeciding && handleReject()}>
      <DialogContent className="sm:max-w-md bg-linear-to-br from-card to-card/80 border-border/50 shadow-2xl">
        <VisuallyHidden>
          <DialogTitle>Incoming Call</DialogTitle>
          <DialogDescription>
            Incoming {incomingCall?.call_type === "video" ? "video" : "voice"} call from {callerInfo?.display_name || callerInfo?.username || "Unknown"}
          </DialogDescription>
        </VisuallyHidden>
        <div className="flex flex-col items-center gap-6 py-8 px-4">
          {/* Caller Avatar */}
          <div className="relative">
            <Avatar className="w-24 h-24 border-4 border-primary/20 animate-pulse">
              <AvatarImage src={callerInfo.avatar_url || undefined} />
              <AvatarFallback className="text-2xl bg-linear-to-br from-primary/80 to-primary">
                {callerInfo.display_name?.[0] || callerInfo.username?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
          </div>

          {/* Caller Info */}
          <div className="text-center space-y-2">
            <p className="text-2xl font-bold text-foreground">
              {callerInfo.display_name || callerInfo.username || "Unknown User"}
            </p>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              {incomingCall.call_type === "video" && <Video className="h-4 w-4" />}
              {incomingCall.call_type === "video" ? "Video Call" : "Voice Call"} Incoming
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 w-full">
            <Button
              variant="destructive"
              size="lg"
              className="flex-1 h-14 rounded-full text-base font-semibold gap-2"
              onClick={handleReject}
              disabled={isDeciding}
            >
              <PhoneOff className="h-5 w-5" />
              Decline
            </Button>
            <Button
              size="lg"
              className="flex-1 h-14 rounded-full text-base font-semibold bg-green-500 hover:bg-green-600 text-white gap-2"
              onClick={handleAccept}
              disabled={isDeciding}
            >
              <Phone className="h-5 w-5" />
              Answer
            </Button>
          </div>

          {/* Status Text */}
          <p className="text-xs text-muted-foreground">
            {isDeciding ? "Processing..." : "Tap to answer or decline"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
