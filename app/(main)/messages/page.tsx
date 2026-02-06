import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MessagesLayout } from "@/components/messages/messages-layout"

export const dynamic = "force-dynamic"

export default async function MessagesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      <MessagesLayout userId={user.id} />
    </div>
  )
}
