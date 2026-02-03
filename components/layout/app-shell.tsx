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
    const fetchUnreadCounts = async () => {
      try {
        const supabase = createClient()

        const {
          data: { user },
          error: authError,
        } = await Promise.race([
          supabase.auth.getUser(),
          new Promise<{ data: { user: null }; error: Error }>((_, reject) =>
            setTimeout(() => reject(new Error("Auth timeout")), 3000),
          ),
        ]).catch(() => ({ data: { user: null }, error: new Error("Auth failed") }))

        if (authError || !user) {
          console.log("[v0] AppShell: Auth not available, skipping unread counts")
          return
        }

        try {
          const { count: notifCount } = await supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false)

          setUnreadNotifications(notifCount || 0)
        } catch (error) {
          console.log("[v0] AppShell: Error fetching notification count", error)
        }

        try {
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
        } catch (error) {
          console.log("[v0] AppShell: Error fetching message count", error)
        }
      } catch (error) {
        console.log("[v0] AppShell: Error in fetchUnreadCounts", error)
      }
    }

    fetchUnreadCounts()

    try {
      const supabase = createClient()

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
    } catch (error) {
      console.log("[v0] AppShell: Error setting up realtime", error)
    }
  }, [])

  return (
    <div className="min-h-dvh bg-background">
      <MainNav unreadMessages={unreadMessages} unreadNotifications={unreadNotifications} />
      <main className="md:ml-56 lg:ml-64 pb-16 md:pb-0">{children}</main>
    </div>
  )
}
