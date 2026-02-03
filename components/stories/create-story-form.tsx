"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ImagePlus, X, Loader2, Type } from "lucide-react"
import { cn } from "@/lib/utils"

interface CreateStoryFormProps {
  userId: string
}

type StoryType = "image" | "text"

export function CreateStoryForm({ userId }: CreateStoryFormProps) {
  const [storyType, setStoryType] = useState<StoryType>("image")
  const [textContent, setTextContent] = useState("")
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

    if (storyType === "image" && !imageFile) {
      setError("Please select an image")
      return
    }

    if (storyType === "text" && !textContent.trim()) {
      setError("Please enter some text")
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
        const filePath = `stories/${userId}/${fileName}`

        const { error: uploadError } = await supabase.storage.from("media").upload(filePath, imageFile)

        if (uploadError) throw uploadError

        const {
          data: { publicUrl },
        } = supabase.storage.from("media").getPublicUrl(filePath)

        imageUrl = publicUrl
      }

      const { error: insertError } = await supabase.from("stories").insert({
        user_id: userId,
        image_url: imageUrl,
        text_content: storyType === "text" ? textContent.trim() : null,
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
      {/* Story type selector */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={storyType === "image" ? "default" : "outline"}
          onClick={() => setStoryType("image")}
          className="flex-1"
        >
          <ImagePlus className="h-4 w-4 mr-2" />
          Image
        </Button>
        <Button
          type="button"
          variant={storyType === "text" ? "default" : "outline"}
          onClick={() => setStoryType("text")}
          className="flex-1"
        >
          <Type className="h-4 w-4 mr-2" />
          Text
        </Button>
      </div>

      {storyType === "image" ? (
        <div className="space-y-2">
          {imagePreview ? (
            <div className="relative aspect-[9/16] max-h-[60vh] rounded-xl overflow-hidden bg-secondary">
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
              className="w-full aspect-[9/16] max-h-[60vh] rounded-xl border-2 border-dashed border-border hover:border-muted-foreground/50 transition-colors flex flex-col items-center justify-center gap-4 text-muted-foreground"
            >
              <ImagePlus className="h-12 w-12" />
              <span>Click to add a photo</span>
            </button>
          )}
          <input ref={inputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
        </div>
      ) : (
        <div
          className={cn(
            "aspect-[9/16] max-h-[60vh] rounded-xl p-6 flex items-center justify-center",
            "bg-gradient-to-br from-rose-500 via-fuchsia-500 to-amber-500",
          )}
        >
          <Textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Write something..."
            className="bg-transparent border-0 text-white text-center text-2xl font-medium placeholder:text-white/60 resize-none focus-visible:ring-0 h-full"
            maxLength={200}
          />
        </div>
      )}

      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1 h-11 bg-transparent" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1 h-11" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sharing...
            </>
          ) : (
            "Share Story"
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">Your story will be visible for 24 hours</p>
    </form>
  )
}
