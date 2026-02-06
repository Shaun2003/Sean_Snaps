import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { ProfileContent } from "@/components/profile/profile-content"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ username: string }>
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username)

  let profile
  if (isUUID) {
    const { data } = await supabase.from("profiles").select("*").eq("id", username).single()
    profile = data
  } else {
    const { data } = await supabase.from("profiles").select("*").eq("username", username).single()
    profile = data
  }

  if (!profile) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      <div className="w-full mx-auto px-2 sm:px-3 lg:px-4 py-4 sm:py-6 lg:py-8">
        <ProfileContent profile={profile} currentUserId={user.id} />
      </div>
    </div>
  )
}
