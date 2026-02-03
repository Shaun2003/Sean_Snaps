"use client"

import type React from "react"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ImagePlus, X, Loader2, Smile, Video, Camera } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import data from "@emoji-mart/data"
import Picker from "@emoji-mart/react"
import { PostThemeSelector } from "./post-theme-selector"
import { CameraDialog } from "./camera-dialog"
import { cn } from "@/lib/utils"

interface CreatePostFormProps {
  userId: string
}

const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target?.result as string
      img.onload = () => {
        const canvas = document.createElement("canvas")
        let width = img.width
        let height = img.height
        const maxSize = 1920

        if (width > height && width > maxSize) {
          height = (height * maxSize) / width
          width = maxSize
        } else if (height > maxSize) {
          width = (width * maxSize) / height
          height = maxSize
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/jpeg" }))
            }
          },
          "image/jpeg",
          0.85,
        )
      }
    }
  })
}

export function CreatePostForm({ userId }: CreatePostFormProps) {
  const [content, setContent] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const compressed = await compressImage(file)
      setImageFile(compressed)
      setVideoFile(null)
      setVideoPreview(null)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(compressed)
    }
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setVideoFile(file)
      setImageFile(null)
      setImagePreview(null)
      const reader = new FileReader()
      reader.onloadend = () => {
        setVideoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCameraCapture = async (file: File, type: "image" | "video") => {
    if (type === "image") {
      const compressed = await compressImage(file)
      setImageFile(compressed)
      setVideoFile(null)
      setVideoPreview(null)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(compressed)
    } else {
      setVideoFile(file)
      setImageFile(null)
      setImagePreview(null)
      const reader = new FileReader()
      reader.onloadend = () => {
        setVideoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeMedia = () => {
    setImageFile(null)
    setVideoFile(null)
    setImagePreview(null)
    setVideoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (videoInputRef.current) videoInputRef.current.value = ""
  }

  const handleEmojiSelect = (emoji: { native: string }) => {
    setContent((prev) => prev + emoji.native)
    setShowEmojiPicker(false)
  }

  const handleSubmit = async () => {
    if (!content && !imageFile && !videoFile) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      let mediaUrl = null

      if (imageFile || videoFile) {
        const file = imageFile || videoFile
        if (file) {
          const fileExt = imageFile ? file.name.split(".").pop() : "mp4"
          const fileName = `${userId}/${Date.now()}.${fileExt}`
          
          let uploadFile = file
          if (videoFile && file.type === "video/webm") {
            uploadFile = new File([file], file.name, { type: "video/mp4" })
          }

          const { error: uploadError } = await supabase.storage.from("posts").upload(fileName, uploadFile)

          if (uploadError) throw uploadError

          const {
            data: { publicUrl },
          } = supabase.storage.from("posts").getPublicUrl(fileName)

          mediaUrl = publicUrl
        }
      }

      const { error } = await supabase.from("posts").insert({
        user_id: userId,
        content: content || null,
        image_url: imageFile ? mediaUrl : null,
        video_url: videoFile ? mediaUrl : null,
        theme: selectedTheme || null,
      })

      if (error) throw error

      router.push("/feed")
    } catch (error) {
      console.error("Error creating post:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const themeClass = selectedTheme
    ? {
        "gradient-sunset": "bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 text-white",
        "gradient-ocean": "bg-gradient-to-br from-blue-400 via-cyan-500 to-teal-600 text-white",
        "gradient-forest": "bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 text-white",
        "gradient-royal": "bg-gradient-to-br from-purple-400 via-pink-500 to-rose-600 text-white",
      }[selectedTheme]
    : ""

  return (
    <>
      <div className="w-full min-h-screen bg-linear-to-br from-background via-background to-muted/20 flex items-center justify-center p-2 sm:p-4">
        <div className="w-full max-w-4xl">
          {/* Header with animation */}
          <div className="mb-8 sm:mb-10 text-center animate-in fade-in slide-in-from-top-4 duration-500">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-clip-text text-transparent bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 mb-2">
              Create Post
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">Share what's happening in your world</p>
          </div>

          {/* Main Card - Modern Social Media Style */}
          <Card className="shadow-2xl border-0 overflow-hidden animate-in scale-in-95 fade-in duration-500">
            <CardContent className="p-0">
              {/* If media selected, show preview on left and content on right */}
              {(imagePreview || videoPreview) ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-125 sm:min-h-150 lg:min-h-175">
                  {/* Media Preview - Left Side */}
                  <div className="bg-black flex items-center justify-center relative overflow-hidden group order-2 lg:order-1">
                    {imagePreview && (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                    {videoPreview && (
                      <video
                        src={videoPreview}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        muted
                        loop
                        autoPlay
                      />
                    )}
                    {/* Remove button */}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-4 right-4 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-12 w-12 bg-red-500 hover:bg-red-600"
                      onClick={removeMedia}
                    >
                      <X className="h-6 w-6" />
                    </Button>
                  </div>

                  {/* Content Editor - Right Side */}
                  <div className="p-6 sm:p-8 lg:p-10 flex flex-col bg-linear-to-br from-card to-card/80 order-1 lg:order-2 animate-in slide-in-from-right duration-500">
                    {/* Textarea Section */}
                    <div className="flex-1 space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold block">Caption</label>
                        <div className="relative">
                          <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Add a caption..."
                            className={cn(
                              "min-h-35 resize-none text-base p-4 pr-12 rounded-xl transition-all duration-300 border-2 border-transparent hover:border-primary/30 focus:border-primary",
                              themeClass,
                              themeClass && "placeholder:text-white/70",
                            )}
                          />
                          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                            <PopoverTrigger asChild suppressHydrationWarning>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={cn("absolute right-3 top-3 rounded-lg hover:bg-primary/10", themeClass && "text-white hover:bg-white/20")}
                              >
                                <Smile className="h-5 w-5" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end" suppressHydrationWarning>
                              <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="auto" />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      {/* Theme Selector */}
                      <div className="space-y-3">
                        <label className="text-sm font-semibold block">Theme</label>
                        <PostThemeSelector onSelect={setSelectedTheme} selectedTheme={selectedTheme} />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-6 border-t border-border/50 mt-6">
                      <Button 
                        variant="outline" 
                        onClick={() => router.back()} 
                        className="flex-1 h-11 rounded-lg font-semibold transition-all duration-200 hover:bg-muted"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={isLoading || (!content && !imageFile && !videoFile)}
                        className="flex-1 h-11 rounded-lg font-bold bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white disabled:opacity-50 transition-all duration-200"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Posting...
                          </>
                        ) : (
                          "Share Post"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* No Media Selected - Show Media Selection */
                <div className="p-8 sm:p-12 lg:p-14 animate-in fade-in duration-300">
                  <div className="space-y-8">
                    {/* Text Content Section */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold">What's on your mind?</label>
                      <div className="relative">
                        <Textarea
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="Write something interesting..."
                          className={cn(
                            "min-h-30 resize-none text-base p-4 rounded-xl transition-all duration-300 border-2 border-transparent hover:border-primary/30 focus:border-primary",
                            themeClass,
                            themeClass && "placeholder:text-white/70",
                          )}
                        />
                        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                          <PopoverTrigger asChild suppressHydrationWarning>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn("absolute right-3 top-3 rounded-lg hover:bg-primary/10", themeClass && "text-white hover:bg-white/20")}
                            >
                              <Smile className="h-5 w-5" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end" suppressHydrationWarning>
                            <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="auto" />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* Theme Selector */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold">Choose a theme</label>
                      <PostThemeSelector onSelect={setSelectedTheme} selectedTheme={selectedTheme} />
                    </div>

                    {/* Media Selection Grid */}
                    <div className="space-y-4">
                      <label className="block text-sm font-semibold">Add media</label>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                      <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Photo Button */}
                        <Button
                          variant="outline"
                          className="h-40 border-2 border-dashed rounded-xl hover:border-primary hover:bg-primary/5 transition-all duration-300 flex flex-col items-center justify-center gap-4 bg-linear-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/30 dark:to-blue-950/20 group"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <div className="rounded-xl bg-blue-100 dark:bg-blue-900/50 p-4 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                            <ImagePlus className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-sm">Photo</div>
                            <div className="text-xs text-muted-foreground">JPG, PNG, GIF</div>
                          </div>
                        </Button>

                        {/* Video Button */}
                        <Button
                          variant="outline"
                          className="h-40 border-2 border-dashed rounded-xl hover:border-primary hover:bg-primary/5 transition-all duration-300 flex flex-col items-center justify-center gap-4 bg-linear-to-br from-purple-50 to-purple-50/50 dark:from-purple-950/30 dark:to-purple-950/20 group"
                          onClick={() => videoInputRef.current?.click()}
                        >
                          <div className="rounded-xl bg-purple-100 dark:bg-purple-900/50 p-4 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                            <Video className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-sm">Video</div>
                            <div className="text-xs text-muted-foreground">MP4, WebM</div>
                          </div>
                        </Button>

                        {/* Camera Button */}
                        <Button
                          variant="outline"
                          className="h-40 border-2 border-dashed rounded-xl hover:border-primary hover:bg-primary/5 transition-all duration-300 flex flex-col items-center justify-center gap-4 bg-linear-to-br from-green-50 to-green-50/50 dark:from-green-950/30 dark:to-green-950/20 group"
                          onClick={() => setShowCamera(true)}
                        >
                          <div className="rounded-xl bg-green-100 dark:bg-green-900/50 p-4 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                            <Camera className="h-8 w-8 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-sm">Camera</div>
                            <div className="text-xs text-muted-foreground">Take now</div>
                          </div>
                        </Button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-6 border-t border-border/50">
                      <Button 
                        variant="outline" 
                        onClick={() => router.back()} 
                        className="flex-1 h-11 rounded-lg font-semibold transition-all duration-200 hover:bg-muted"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={isLoading || (!content && !imageFile && !videoFile)}
                        className="flex-1 h-11 rounded-lg font-bold bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white disabled:opacity-50 transition-all duration-200"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Posting...
                          </>
                        ) : (
                          "Share Post"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <CameraDialog open={showCamera} onOpenChange={setShowCamera} onCapture={handleCameraCapture} />
    </>
  )
}

