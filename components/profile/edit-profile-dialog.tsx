"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Loader2 } from "lucide-react"
import type { Profile } from "@/lib/types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: Profile
  onProfileUpdated: () => void
}

async function compressImage(file: File, maxSizeMB = 2): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.onload = () => {
      let { width, height } = img
      const maxDimension = 800

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension
          width = maxDimension
        } else {
          width = (width / height) * maxDimension
          height = maxDimension
        }
      }

      canvas.width = width
      canvas.height = height
      ctx?.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: "image/jpeg" }))
          } else {
            resolve(file)
          }
        },
        "image/jpeg",
        0.8,
      )
    }

    img.src = URL.createObjectURL(file)
  })
}

export function EditProfileDialog({ open, onOpenChange, profile, onProfileUpdated }: Props) {
  const [displayName, setDisplayName] = useState(profile.display_name || "")
  const [username, setUsername] = useState(profile.username)
  const [bio, setBio] = useState(profile.bio || "")
  const [website, setWebsite] = useState(profile.website || "")
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "")
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClient()

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError("")

    try {
      const compressedFile = await compressImage(file, 2)

      const fileExt = "jpg"
      const filePath = `${profile.id}/avatar-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, compressedFile, { upsert: true })

      if (uploadError) {
        console.log("[v0] Avatar upload error:", uploadError)
        if (uploadError.message?.includes("Bucket not found") || uploadError.message?.includes("bucket")) {
          setError("Storage not configured. Please run the storage bucket script (003_create_storage_buckets.sql).")
        } else {
          setError(`Failed to upload: ${uploadError.message}`)
        }
        setUploading(false)
        return
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)
      setAvatarUrl(data.publicUrl)
    } catch (err) {
      console.log("[v0] Avatar upload exception:", err)
      setError("An unexpected error occurred during upload")
    }

    setUploading(false)
  }

  async function handleSave() {
    setSaving(true)
    setError("")

    if (username !== profile.username) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .neq("id", profile.id)
        .single()

      if (existing) {
        setError("Username is already taken")
        setSaving(false)
        return
      }
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName || null,
        username,
        bio: bio || null,
        website: website || null,
        avatar_url: avatarUrl || null,
      })
      .eq("id", profile.id)

    if (updateError) {
      console.log("[v0] Profile update error:", updateError)
      setError(`Failed to update profile: ${updateError.message}`)
      setSaving(false)
      return
    }

    onProfileUpdated()
    onOpenChange(false)
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="size-16 sm:size-20">
                <AvatarImage src={avatarUrl || "/placeholder.svg"} />
                <AvatarFallback className="text-lg sm:text-2xl">{displayName?.[0] || username[0]}</AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 p-1 sm:p-1.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90">
                {uploading ? (
                  <Loader2 className="size-3 sm:size-4 animate-spin" />
                ) : (
                  <Camera className="size-3 sm:size-4" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-1">
              <Label htmlFor="displayName" className="text-xs">
                Display Name
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                className="text-sm h-9"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="username" className="text-xs">
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="username"
                className="text-sm h-9"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="bio" className="text-xs">
                Bio
              </Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself"
                rows={2}
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="website" className="text-xs">
                Website
              </Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="text-sm h-9"
              />
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || uploading || !username} size="sm">
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
