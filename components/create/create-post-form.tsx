"use client"

import type React from "react"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ImagePlus, X, Loader2, Smile } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import data from "@emoji-mart/data"
import Picker from "@emoji-mart/react"

interface CreatePostFormProps {
  userId: string
}

export function CreatePostForm({ userId }: CreatePostFormProps) {
  const [content, setContent] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleEmojiSelect = (emoji: { native: string }) => {
    setContent((prev) => prev + emoji.native)
    setShowEmojiPicker(false)
  }

  const handleSubmit = async () => {
    if (!content && !imageFile) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      let imageUrl = null

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop()
        const fileName = `${userId}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage.from("posts").upload(fileName, imageFile)

        if (uploadError) throw uploadError

        const {
          data: { publicUrl },
        } = supabase.storage.from("posts").getPublicUrl(fileName)

        imageUrl = publicUrl
      }

      const { error } = await supabase.from("posts").insert({
        user_id: userId,
        content: content || null,
        image_url: imageUrl,
      })

      if (error) throw error

      router.push("/feed")
    } catch (error) {
      console.error("Error creating post:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="relative">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="min-h-[150px] resize-none text-lg pr-12"
          />
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2">
                <Smile className="h-5 w-5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="auto" />
            </PopoverContent>
          </Popover>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />

        {imagePreview ? (
          <div className="relative">
            <img
              src={imagePreview || "/placeholder.svg"}
              alt="Preview"
              className="w-full max-h-96 object-contain rounded-lg border"
            />
            <Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={removeImage}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full h-32 border-dashed bg-transparent"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-2">
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Add Photo</span>
            </div>
          </Button>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || (!content && !imageFile)}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Post
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
