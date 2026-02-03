import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CreateStoryForm } from "@/components/stories/create-story-form"

export default async function CreateStoryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      <h1 className="text-2xl font-semibold mb-6">Create Story</h1>
      <CreateStoryForm userId={user.id} />
    </div>
  )
}
