import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { NotificationsView } from "@/components/notifications/notifications-view"

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: notifications } = await supabase
    .from("notifications")
    .select(`
      *,
      actor:profiles!notifications_actor_id_fkey (
        id,
        username,
        full_name,
        avatar_url
      ),
      post:posts (
        id,
        image_url,
        caption
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  // Mark all as read
  await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false)

  return <NotificationsView notifications={notifications || []} currentUserId={user.id} />
}
