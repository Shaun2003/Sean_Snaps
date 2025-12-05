import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ExploreContent } from "@/components/explore/explore-content"

export default async function ExplorePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <ExploreContent userId={user.id} />
    </div>
  )
}
