import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { EditProfileForm } from "@/components/profile/edit-profile-form"

export default async function EditProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      <h1 className="text-2xl font-semibold mb-6">Edit Profile</h1>
      <EditProfileForm profile={profile} userId={user.id} />
    </div>
  )
}
