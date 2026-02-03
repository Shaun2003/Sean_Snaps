"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Bell } from "lucide-react"
import { cn } from "@/lib/utils"

interface NotificationBellProps {
  userId: string
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false)

      setUnreadCount(count || 0)
    }

    fetchUnreadCount()

    // Subscribe to new notifications
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
        () => {
          setUnreadCount((prev) => prev + 1)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  return (
    <Link
      href="/notifications"
      className={cn(
        "relative p-3 rounded-lg transition-colors",
        "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
      )}
    >
      <Bell className="h-6 w-6" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
      <span className="sr-only">Notifications</span>
    </Link>
  )
}
