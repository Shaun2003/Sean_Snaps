import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MessagesLayout } from "@/components/messages/messages-layout"

export default async function MessagesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return <MessagesLayout userId={user.id} />
}
