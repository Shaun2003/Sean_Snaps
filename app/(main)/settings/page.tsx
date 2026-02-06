import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SettingsContent } from "@/components/settings/settings-content"

export const dynamic = "force-dynamic"

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

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      <div className="w-full mx-auto px-2 sm:px-3 lg:px-4 py-4 sm:py-6 lg:py-8 max-w-2xl">
        <SettingsContent user={user} profile={profile} settings={settings} />
      </div>
    </div>
  )
}
