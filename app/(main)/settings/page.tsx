import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SettingsView } from "@/components/settings/settings-view"

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("is_private").eq("id", user.id).single()

  return <SettingsView userEmail={user.email || ""} userId={user.id} initialIsPrivate={profile?.is_private || false} />
}
