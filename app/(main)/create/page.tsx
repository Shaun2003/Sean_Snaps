import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CreatePostForm } from "@/components/create/create-post-form"

export default async function CreatePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Create Post</h1>
      <CreatePostForm userId={user.id} />
    </div>
  )
}
