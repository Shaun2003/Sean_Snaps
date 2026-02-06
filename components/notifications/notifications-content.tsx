"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, MessageCircle, UserPlus, AtSign, Bell, Trash2 } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Notification, Profile } from "@/lib/types"

interface NotificationWithActor extends Notification {
  actor: Profile | null
}

export function NotificationsContent({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<NotificationWithActor[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchNotifications()
    markAllAsRead()

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => fetchNotifications(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  async function fetchNotifications() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100)

    if (data && data.length > 0) {
      const actorIds = [...new Set(data.map((n) => n.actor_id).filter((id): id is string => !!id))]

      let actorsMap: Record<string, Profile> = {}

      if (actorIds.length > 0) {
        const { data: actors } = await supabase.from("profiles").select("*").in("id", actorIds)

        if (actors) {
          actorsMap = Object.fromEntries(actors.map((a) => [a.id, a]))
        }
      }

      const enrichedNotifications = data.map((n) => ({
        ...n,
        actor: n.actor_id ? actorsMap[n.actor_id] || null : null,
      }))

      setNotifications(enrichedNotifications as NotificationWithActor[])
    } else {
      setNotifications([])
    }
    setLoading(false)
  }

  async function markAllAsRead() {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false)
  }

  async function deleteNotification(id: string) {
    await supabase.from("notifications").delete().eq("id", id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  async function clearAll() {
    await supabase.from("notifications").delete().eq("user_id", userId)
    setNotifications([])
  }

  const handleNotificationClick = (notification: NotificationWithActor) => {
    if (notification.reference_type === "post" && notification.reference_id) {
      router.push(`/feed#post-${notification.reference_id}`)
    } else if (notification.type === "follow" && notification.actor) {
      router.push(`/profile/${notification.actor.id}`)
    }
  }

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "all") return true
    if (activeTab === "likes") return n.type === "like"
    if (activeTab === "comments") return n.type === "comment"
    if (activeTab === "follows") return n.type === "follow"
    if (activeTab === "mentions") return n.type === "mention"
    return true
  })

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="size-4 text-rose-500 fill-rose-500 shrink-0" />
      case "comment":
        return <MessageCircle className="size-4 text-blue-500 shrink-0" />
      case "follow":
        return <UserPlus className="size-4 text-green-500 shrink-0" />
      case "mention":
        return <AtSign className="size-4 text-purple-500 shrink-0" />
      default:
        return <Bell className="size-4 text-muted-foreground shrink-0" />
    }
  }

  const getNotificationText = (notification: NotificationWithActor) => {
    switch (notification.type) {
      case "like":
        return "liked your post"
      case "comment":
        return "commented on your post"
      case "follow":
        return "started following you"
      case "mention":
        return "mentioned you"
      case "share":
        return "shared a post with you"
      default:
        return notification.content || "sent you a notification"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full size-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-2 sm:px-4">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Notifications</h1>
        {notifications.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs sm:text-sm">
            <Trash2 className="size-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Clear all</span>
            <span className="sm:hidden">Clear</span>
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full mb-4 flex overflow-x-auto">
          <TabsTrigger value="all" className="flex-1 text-xs sm:text-sm">
            All
          </TabsTrigger>
          <TabsTrigger value="likes" className="flex-1 text-xs sm:text-sm">
            Likes
          </TabsTrigger>
          <TabsTrigger value="comments" className="flex-1 text-xs sm:text-sm">
            Comments
          </TabsTrigger>
          <TabsTrigger value="follows" className="flex-1 text-xs sm:text-sm">
            Follows
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="size-12 mx-auto mb-4 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer ${
                    !notification.is_read ? "bg-primary/5" : ""
                  }`}
                >
                  <Link href={notification.actor ? `/profile/${notification.actor.id}` : "#"} className="shrink-0">
                    <Avatar className="size-8 sm:size-10">
                      <AvatarImage src={notification.actor?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs sm:text-sm bg-linear-to-br from-primary/60 to-primary">
                        {notification.actor?.display_name?.[0] || notification.actor?.username?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                  </Link>

                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-start gap-1.5 sm:gap-2">
                      {getNotificationIcon(notification.type)}
                      <p className="text-xs sm:text-sm leading-snug">
                        <Link
                          href={notification.actor ? `/profile/${notification.actor.id}` : "#"}
                          className="font-semibold hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {notification.actor?.display_name || notification.actor?.username || "Someone"}
                        </Link>{" "}
                        <span className="text-muted-foreground">{getNotificationText(notification)}</span>
                      </p>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      {format(new Date(notification.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity size-7 sm:size-8 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNotification(notification.id)
                    }}
                  >
                    <Trash2 className="size-3 sm:size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
