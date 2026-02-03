"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AvatarUpload } from "@/components/ui/avatar-upload"
import type { Profile } from "@/lib/types"

interface EditProfileFormProps {
  profile: Profile | null
  userId: string
}

export function EditProfileForm({ profile, userId }: EditProfileFormProps) {
  const [username, setUsername] = useState(profile?.username || "")
  const [fullName, setFullName] = useState(profile?.full_name || "")
  const [bio, setBio] = useState(profile?.bio || "")
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: username.toLowerCase().replace(/\s+/g, ""),
          full_name: fullName,
          bio,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)

      if (error) throw error

      router.push("/profile")
      router.refresh()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-center">
        <AvatarUpload currentAvatarUrl={avatarUrl} onUpload={setAvatarUrl} size="lg" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username"
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="John Doe"
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell us about yourself..."
          rows={4}
          className="resize-none"
        />
      </div>

      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1 h-11 bg-transparent" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1 h-11" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  )
}
