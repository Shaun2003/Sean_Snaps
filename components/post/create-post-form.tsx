"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ImagePlus, X, Loader2 } from "lucide-react"

interface CreatePostFormProps {
  userId: string
}

export function CreatePostForm({ userId }: CreatePostFormProps) {
  const [caption, setCaption] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!caption.trim() && !imageFile) {
      setError("Please add a caption or image")
      return
    }

    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      let imageUrl = null

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `posts/${userId}/${fileName}`

        const { error: uploadError } = await supabase.storage.from("media").upload(filePath, imageFile)

        if (uploadError) throw uploadError

        const {
          data: { publicUrl },
        } = supabase.storage.from("media").getPublicUrl(filePath)

        imageUrl = publicUrl
      }

      const { error: insertError } = await supabase.from("posts").insert({
        user_id: userId,
        image_url: imageUrl,
        caption: caption.trim() || null,
      })

      if (insertError) throw insertError

      router.push("/feed")
      router.refresh()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Image upload area */}
      <div className="space-y-2">
        {imagePreview ? (
          <div className="relative aspect-square rounded-xl overflow-hidden bg-secondary">
            <img src={imagePreview || "/placeholder.svg"} alt="Preview" className="h-full w-full object-cover" />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={removeImage}
              className="absolute top-2 right-2 h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full aspect-square rounded-xl border-2 border-dashed border-border hover:border-muted-foreground/50 transition-colors flex flex-col items-center justify-center gap-4 text-muted-foreground"
          >
            <ImagePlus className="h-12 w-12" />
            <span>Click to add a photo</span>
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
      </div>

      {/* Caption */}
      <div className="space-y-2">
        <Textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption..."
          rows={4}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">{caption.length}/2200</p>
      </div>

      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      <Button type="submit" className="w-full h-11" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Posting...
          </>
        ) : (
          "Share Post"
        )}
      </Button>
    </form>
  )
}
