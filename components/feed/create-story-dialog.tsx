"use client"

import type React from "react"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ImagePlus, X, Loader2, Smile, Camera } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import data from "@emoji-mart/data"
import Picker from "@emoji-mart/react"
import { CameraDialog } from "@/components/create/camera-dialog"
import { cn } from "@/lib/utils"

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
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

  const handleEmojiSelect = (emoji: { native: string }) => {
    setContent((prev) => prev + emoji.native)
    setShowEmojiPicker(false)
  }

  const handleCameraCapture = async (file: File) => {
    const compressed = await compressImage(file)
    setImageFile(compressed)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(compressed)
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-blue-500 via-purple-500 to-pink-500">
              Create Story
            </DialogTitle>
          </DialogHeader>

          {/* If media selected, show preview and content side by side */}
          {imagePreview ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 min-h-96">
              {/* Media Preview - Left Side */}
              <div className="bg-black flex items-center justify-center relative overflow-hidden group rounded-l-lg">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Remove button */}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-4 right-4 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-10 w-10 bg-red-500 hover:bg-red-600"
                  onClick={removeImage}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Content Editor - Right Side */}
              <div className="p-6 flex flex-col bg-linear-to-br from-card to-card/80 rounded-r-lg animate-in slide-in-from-right duration-500">
                {/* Textarea Section */}
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold block">Caption (optional)</label>
                    <div className="relative">
                      <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Add a caption..."
                        className="min-h-24 resize-none text-sm p-3 rounded-xl transition-all duration-300 border-2 border-transparent hover:border-primary/30 focus:border-primary"
                      />
                      <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                        <PopoverTrigger asChild suppressHydrationWarning>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-2 rounded-lg hover:bg-primary/10"
                          >
                            <Smile className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end" suppressHydrationWarning>
                          <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-border/50 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="flex-1 h-10 rounded-lg font-semibold transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading || (!content && !imageFile)}
                    className="flex-1 h-10 rounded-lg font-bold bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white disabled:opacity-50 transition-all duration-200"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Share Story"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* No Media Selected - Show Media Selection */
            <div className="space-y-6">
              {/* Text Content Section */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold">Add text (optional)</label>
                <div className="relative">
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What's on your mind?"
                    className="min-h-24 resize-none text-sm p-3 rounded-xl transition-all duration-300 border-2 border-transparent hover:border-primary/30 focus:border-primary"
                  />
                  <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                    <PopoverTrigger asChild suppressHydrationWarning>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 rounded-lg hover:bg-primary/10"
                      >
                        <Smile className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end" suppressHydrationWarning>
                      <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Media Selection Grid */}
              <div className="space-y-4">
                <label className="block text-sm font-semibold">Add media (optional)</label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Photo Button */}
                  <Button
                    variant="outline"
                    className="h-40 border-2 border-dashed rounded-xl hover:border-primary hover:bg-primary/5 transition-all duration-300 flex flex-col items-center justify-center gap-3 bg-linear-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/30 dark:to-blue-950/20 group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="rounded-lg bg-blue-100 dark:bg-blue-900/50 p-3 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                      <ImagePlus className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-sm">Photo</div>
                      <div className="text-xs text-muted-foreground">JPG, PNG, GIF</div>
                    </div>
                  </Button>

                  {/* Camera Button */}
                  <Button
                    variant="outline"
                    className="h-40 border-2 border-dashed rounded-xl hover:border-primary hover:bg-primary/5 transition-all duration-300 flex flex-col items-center justify-center gap-3 bg-linear-to-br from-green-50 to-green-50/50 dark:from-green-950/30 dark:to-green-950/20 group"
                    onClick={() => setShowCamera(true)}
                  >
                    <div className="rounded-lg bg-green-100 dark:bg-green-900/50 p-3 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                      <Camera className="h-7 w-7 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-sm">Camera</div>
                      <div className="text-xs text-muted-foreground">Take now</div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-border/50">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 h-10 rounded-lg font-semibold transition-all duration-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading || (!content && !imageFile)}
                  className="flex-1 h-10 rounded-lg font-bold bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white disabled:opacity-50 transition-all duration-200"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Share Story"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CameraDialog open={showCamera} onOpenChange={setShowCamera} onCapture={(file) => handleCameraCapture(file)} />
    </>
  )
}
