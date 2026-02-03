"use client"

import { createClient } from "@/lib/supabase/client"

export interface RTCSignal {
  type: "offer" | "answer" | "ice-candidate"
  data: RTCSessionDescriptionInit | RTCIceCandidate | any
}

export class CallSignalingManager {
  private peerConnection: RTCPeerConnection | null = null
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null
  private callId: string
  private currentUserId: string
  private remoteUserId: string
  private supabase = createClient()
  private signalChannel: ReturnType<typeof this.supabase.channel> | null = null

  constructor(callId: string, currentUserId: string, remoteUserId: string) {
    this.callId = callId
    this.currentUserId = currentUserId
    this.remoteUserId = remoteUserId
  }

  async initialize(constraints: MediaStreamConstraints): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)

      const config: RTCConfiguration = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
        ],
      }

      this.peerConnection = new RTCPeerConnection(config)

      // Add local tracks
      this.localStream.getTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream)
        }
      })

      // Handle remote tracks
      this.peerConnection.ontrack = (event) => {
        console.log("[WebRTC] Received remote track:", event.track.kind)
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream()
        }
        this.remoteStream.addTrack(event.track)
      }

      // Handle ICE candidates
      this.peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          await this.sendSignal({
            type: "ice-candidate",
            data: event.candidate,
          })
        }
      }

      // Setup signaling channel
      this.setupSignalingChannel()
      console.log(`[WebRTC] Signaling channel setup for call: ${this.callId}`)

      return this.localStream
    } catch (error) {
      console.error("[WebRTC] Error initializing media:", error)
      throw error
    }
  }

  private setupSignalingChannel() {
    if (!this.signalChannel) {
      // Create a deterministic channel name that both parties will subscribe to
      // Sort user IDs to ensure same channel name from both sides
      const [user1, user2] = [this.currentUserId, this.remoteUserId].sort()
      const channelName = `call:${this.callId}:${user1}:${user2}`
      
      console.log(`[WebRTC] Setting up channel: ${channelName}`)
      this.signalChannel = this.supabase
        .channel(channelName)
        .on("broadcast", { event: "signal" }, async (message: any) => {
          console.log("[WebRTC] Received signal:", message.payload.type)
          await this.handleSignal(message.payload as RTCSignal)
        })
        .subscribe((status: string) => {
          console.log(`[WebRTC] Channel subscription status: ${status}`)
        })
    }
  }

  async sendSignal(signal: RTCSignal) {
    try {
      // Save to database for persistence
      const { error: dbError } = await this.supabase.from("call_signals").insert({
        call_id: this.callId,
        from_user_id: this.currentUserId,
        to_user_id: this.remoteUserId,
        signal_type: signal.type,
        signal_data: signal.data,
      })

      if (dbError) {
        console.error("[WebRTC] Error saving signal to database:", dbError)
      }

      // Also broadcast for real-time delivery
      if (this.signalChannel) {
        const { error: broadcastError } = await this.signalChannel.send({
          type: "broadcast",
          event: "signal",
          payload: signal,
        })
        
        if (broadcastError) {
          console.error("[WebRTC] Error broadcasting signal:", broadcastError)
        }
      }
    } catch (error) {
      console.error("[WebRTC] Error sending signal:", error)
    }
  }

  private async handleSignal(signal: RTCSignal) {
    if (!this.peerConnection) return

    try {
      switch (signal.type) {
        case "offer":
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data))
          const answer = await this.peerConnection.createAnswer()
          await this.peerConnection.setLocalDescription(answer)
          await this.sendSignal({
            type: "answer",
            data: answer,
          })
          break

        case "answer":
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data))
          break

        case "ice-candidate":
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.data))
          } catch (error) {
            console.log("[WebRTC] Error adding ICE candidate:", error)
          }
          break
      }
    } catch (error) {
      console.error("[WebRTC] Error handling signal:", error)
    }
  }

  async createOffer(): Promise<void> {
    if (!this.peerConnection) throw new Error("PeerConnection not initialized")

    try {
      const offer = await this.peerConnection.createOffer()
      await this.peerConnection.setLocalDescription(offer)
      await this.sendSignal({
        type: "offer",
        data: offer,
      })
    } catch (error) {
      console.error("[WebRTC] Error creating offer:", error)
      throw error
    }
  }

  async createAnswer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) throw new Error("PeerConnection not initialized")

    try {
      console.log("[WebRTC] Creating answer for offer")
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)
      await this.sendSignal({
        type: "answer",
        data: answer,
      })
    } catch (error) {
      console.error("[WebRTC] Error creating answer:", error)
      throw error
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream
  }

  getPeerConnection(): RTCPeerConnection | null {
    return this.peerConnection
  }

  async cleanup() {
    // Stop local tracks
    this.localStream?.getTracks().forEach((track) => track.stop())

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close()
    }

    // Unsubscribe from signal channel
    if (this.signalChannel) {
      await this.supabase.removeChannel(this.signalChannel)
    }

    this.localStream = null
    this.remoteStream = null
    this.peerConnection = null
  }
}
