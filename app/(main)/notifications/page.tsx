import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { NotificationsContent } from "@/components/notifications/notifications-content"

export const dynamic = "force-dynamic"

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      <div className="w-full mx-auto px-2 sm:px-3 lg:px-4 py-4 sm:py-6 lg:py-8 max-w-2xl">
        <NotificationsContent userId={user.id} />
      </div>
    </div>
  )
}
