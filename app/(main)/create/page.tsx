import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CreatePostForm } from "@/components/create/create-post-form"

export const dynamic = "force-dynamic"

export default async function CreatePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-4xl">
        <CreatePostForm userId={user.id} />
      </div>
    </div>
  )
}
