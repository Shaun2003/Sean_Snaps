import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SettingsContent } from "@/components/settings/settings-content"

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  const { data: settings } = await supabase.from("user_settings").select("*").eq("user_id", user.id).single()

  return <SettingsContent user={user} profile={profile} settings={settings} />
}
