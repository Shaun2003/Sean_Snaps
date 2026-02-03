"use client"

import { useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Heart, MessageCircle, UserPlus, ArrowLeft } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { Notification } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface NotificationsViewProps {
  notifications: Notification[]
  currentUserId: string
}

export function NotificationsView({ notifications, currentUserId }: NotificationsViewProps) {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to new notifications for real-time updates
    const channel = supabase
      .channel("notifications-page")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          router.refresh()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, router, supabase])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="h-5 w-5 text-rose-500 fill-rose-500" />
      case "comment":
        return <MessageCircle className="h-5 w-5 text-blue-500" />
      case "follow":
        return <UserPlus className="h-5 w-5 text-emerald-500" />
      default:
        return <Heart className="h-5 w-5" />
    }
  }

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case "like":
        return "liked your post"
      case "comment":
        return notification.message ? `commented: "${notification.message}"` : "commented on your post"
      case "follow":
        return "started following you"
      default:
        return "interacted with you"
    }
  }

  const getNotificationLink = (notification: Notification) => {
    if (notification.type === "follow") {
      return `/profile/${notification.actor?.username}`
    }
    if (notification.post_id) {
      return `/post/${notification.post_id}`
    }
    return `/profile/${notification.actor?.username}`
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Notifications</h1>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No notifications yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            When someone likes, comments, or follows you, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((notification) => (
            <Link
              key={notification.id}
              href={getNotificationLink(notification)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-secondary",
                !notification.read && "bg-primary/5",
              )}
            >
              {/* Actor avatar */}
              <div className="relative shrink-0">
                <div className="h-11 w-11 rounded-full overflow-hidden bg-secondary">
                  {notification.actor?.avatar_url ? (
                    <img
                      src={notification.actor.avatar_url || "/placeholder.svg"}
                      alt={notification.actor.username || "User"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                      {(notification.actor?.username || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 p-0.5 bg-background rounded-full">
                  {getNotificationIcon(notification.type)}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-semibold">{notification.actor?.username}</span>{" "}
                  <span className="text-muted-foreground">{getNotificationText(notification)}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </div>

              {/* Post thumbnail */}
              {notification.post?.image_url && (
                <div className="shrink-0 h-11 w-11 rounded overflow-hidden bg-secondary">
                  <img
                    src={notification.post.image_url || "/placeholder.svg"}
                    alt="Post"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
