"use client"

import type React from "react"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ImagePlus, X, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CreateStoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onStoryCreated?: () => void
}

async function compressImage(file: File, maxWidth = 1080, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      let width = img.width
      let height = img.height

      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Could not get canvas context"))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error("Could not compress image"))
          }
        },
        "image/jpeg",
        quality,
      )
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export function CreateStoryDialog({ open, onOpenChange, userId, onStoryCreated }: CreateStoryDialogProps) {
  const [content, setContent] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

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

  const handleSubmit = async () => {
    if (!content && !imageFile) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      let imageUrl = null

      if (imageFile) {
        const compressedBlob = await compressImage(imageFile, 1080, 0.85)
        const fileName = `${userId}/${Date.now()}.jpg`

        const { error: uploadError } = await supabase.storage.from("stories").upload(fileName, compressedBlob, {
          contentType: "image/jpeg",
        })

        if (uploadError) throw uploadError

        const {
          data: { publicUrl },
        } = supabase.storage.from("stories").getPublicUrl(fileName)

        imageUrl = publicUrl
      }

      const { error } = await supabase.from("stories").insert({
        user_id: userId,
        content: content || null,
        image_url: imageUrl,
      })

      if (error) throw error

      setContent("")
      removeImage()
      onOpenChange(false)
      toast({ title: "Story created", description: "Your story is now live for 24 hours" })

      onStoryCreated?.()
    } catch (error: any) {
      console.error("Error creating story:", error)
      toast({
        title: "Error creating story",
        description: error.message || "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Add text (optional)</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              className="mt-2 resize-none"
              rows={3}
            />
          </div>

          <div>
            <Label>Add photo (optional)</Label>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />

            {imagePreview ? (
              <div className="relative mt-2">
                <img
                  src={imagePreview || "/placeholder.svg"}
                  alt="Preview"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 rounded-full"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full mt-2 h-40 bg-muted/50 border-dashed"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-2">
                  <ImagePlus className="h-10 w-10 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to add photo</span>
                </div>
              </Button>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading || (!content && !imageFile)}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Share Story
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
