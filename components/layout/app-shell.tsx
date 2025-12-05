"use client"

import type React from "react"

import { MainNav } from "./main-nav"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    const fetchUnreadCounts = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { count: notifCount } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)

      setUnreadNotifications(notifCount || 0)

      const { data: participations } = await supabase
        .from("conversation_participants")
        .select("conversation_id, last_read_at")
        .eq("user_id", user.id)

      if (participations && participations.length > 0) {
        let totalUnread = 0
        for (const p of participations) {
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", p.conversation_id)
            .neq("user_id", user.id)
            .gt("created_at", p.last_read_at)

          totalUnread += count || 0
        }
        setUnreadMessages(totalUnread)
      }
    }

    fetchUnreadCounts()

    const notifChannel = supabase
      .channel("notifications-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => fetchUnreadCounts())
      .subscribe()

    const msgChannel = supabase
      .channel("messages-count")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => fetchUnreadCounts())
      .subscribe()

    return () => {
      supabase.removeChannel(notifChannel)
      supabase.removeChannel(msgChannel)
    }
  }, [])

  return (
    <div className="min-h-dvh bg-background">
      <MainNav unreadMessages={unreadMessages} unreadNotifications={unreadNotifications} />
      <main className="md:ml-56 lg:ml-64 pb-16 md:pb-0">{children}</main>
    </div>
  )
}
