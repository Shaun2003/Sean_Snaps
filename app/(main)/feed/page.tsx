import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { FeedContent } from "@/components/feed/feed-content"
import { StoriesBar } from "@/components/feed/stories-bar"

export default async function FeedPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <StoriesBar userId={user.id} />
      <FeedContent userId={user.id} />
    </div>
  )
}
