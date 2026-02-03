"use client"

export interface VoiceRecordingResult {
  blob: Blob
  duration: number
  mimeType: string
}

export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private startTime: number = 0
  private pauseTime: number = 0
  private pausedDuration: number = 0
  private isRecording: boolean = false
  private isPaused: boolean = false

  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = this.getSupportedMimeType()

      this.mediaRecorder = new MediaRecorder(stream, { mimeType })
      this.audioChunks = []
      this.startTime = Date.now()
      this.pausedDuration = 0
      this.isRecording = true
      this.isPaused = false

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.start()
    } catch (error) {
      console.error("[VoiceRecorder] Error starting recording:", error)
      throw error
    }
  }

  pauseRecording(): void {
    if (this.mediaRecorder && this.isRecording && !this.isPaused) {
      this.mediaRecorder.pause()
      this.pauseTime = Date.now()
      this.isPaused = true
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder && this.isRecording && this.isPaused) {
      this.pausedDuration += Date.now() - this.pauseTime
      this.mediaRecorder.resume()
      this.isPaused = false
    }
  }

  async stopRecording(): Promise<VoiceRecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error("Recording not started"))
        return
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || "audio/webm"
        const blob = new Blob(this.audioChunks, { type: mimeType })
        const duration = this.getDuration()

        // Stop all tracks
        this.mediaRecorder?.stream?.getTracks().forEach((track) => track.stop())

        this.isRecording = false
        this.isPaused = false

        resolve({
          blob,
          duration,
          mimeType,
        })
      }

      this.mediaRecorder.stop()
    })
  }

  cancel(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop()
      this.mediaRecorder.stream.getTracks().forEach((track) => track.stop())
    }
    this.audioChunks = []
    this.isRecording = false
    this.isPaused = false
  }

  getDuration(): number {
    if (!this.isRecording && !this.isPaused) {
      return 0
    }

    const now = this.isPaused ? this.pauseTime : Date.now()
    const elapsed = now - this.startTime - this.pausedDuration
    return Math.floor(elapsed / 1000) // Return seconds
  }

  isActive(): boolean {
    return this.isRecording
  }

  private getSupportedMimeType(): string {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/mpeg",
      "audio/wav",
    ]

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }

    return "audio/webm" // Fallback
  }

  static async uploadVoiceNote(
    blob: Blob,
    supabase: any,
    userId: string,
    conversationId?: string
  ): Promise<string> {
    const filename = `voice-notes/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.webm`

    const { error, data } = await supabase.storage
      .from("messages")
      .upload(filename, blob, {
        contentType: "audio/webm",
        upsert: false,
      })

    if (error) {
      throw new Error(`Upload failed: ${error.message}`)
    }

    const { data: urlData } = supabase.storage
      .from("messages")
      .getPublicUrl(filename)

    return urlData.publicUrl
  }
}

export function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}
