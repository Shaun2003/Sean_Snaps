"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Button } from "@/components/ui/button"
import { User, Eye } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface ProfileAvatarProps {
  profile: {
    id: string
    avatar_url?: string | null
    display_name?: string | null
    username?: string | null
  }
  hasStory?: boolean
  size?: "sm" | "md" | "lg"
  onClick?: () => void
}

export function ProfileAvatar({ profile, hasStory = false, size = "md", onClick }: ProfileAvatarProps) {
  const [showOptions, setShowOptions] = useState(false)

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14",
  }

  const handleClick = () => {
    if (hasStory) {
      setShowOptions(true)
    } else if (onClick) {
      onClick()
    }
  }

  return (
    <>
      <button onClick={handleClick} className="relative">
        <Avatar
          className={cn(
            sizeClasses[size],
            hasStory &&
              "ring-2 ring-offset-2 bg-linear-to-r from-rose-500 via-purple-500 to-amber-500 p-0.5",
          )}
        >
          <AvatarImage src={profile.avatar_url || ""} />
          <AvatarFallback>{profile.display_name?.[0] || profile.username?.[0] || "U"}</AvatarFallback>
        </Avatar>
      </button>

      <Dialog open={showOptions} onOpenChange={setShowOptions}>
        <DialogContent className="sm:max-w-md">
          <VisuallyHidden>
            <DialogTitle>Story Options</DialogTitle>
          </VisuallyHidden>
          <div className="flex flex-col gap-3 py-4">
            <Button
              variant="outline"
              className="w-full justify-start bg-transparent"
              onClick={onClick}
              asChild={!onClick}
            >
              <div>
                <Eye className="h-4 w-4 mr-2" />
                View Story
              </div>
            </Button>
            <Link href={`/profile/${profile.id}`}>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <User className="h-4 w-4 mr-2" />
                View Profile
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
