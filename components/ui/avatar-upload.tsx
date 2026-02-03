"use client"

import type React from "react"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Camera, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface AvatarUploadProps {
  currentAvatarUrl?: string | null
  onUpload: (url: string) => void
  size?: "sm" | "md" | "lg"
}

export function AvatarUpload({ currentAvatarUrl, onUpload, size = "lg" }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null)
  const inputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const supabase = createClient()

    try {
      // Create preview
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)

      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage.from("media").upload(filePath, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from("media").getPublicUrl(filePath)

      onUpload(publicUrl)
    } catch (error) {
      console.error("Error uploading avatar:", error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "relative rounded-full overflow-hidden bg-secondary flex items-center justify-center group",
          sizeClasses[size],
        )}
      >
        {previewUrl ? (
          <img src={previewUrl || "/placeholder.svg"} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <Camera className="h-8 w-8 text-muted-foreground" />
        )}
        <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </div>
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
    </div>
  )
}
