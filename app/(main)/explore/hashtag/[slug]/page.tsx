import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { HashtagPage } from "@/components/explore/hashtag-page"

export const dynamic = "force-dynamic"

export default async function TagPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <HashtagPage slug={params.slug} userId={user.id} />
      </div>
    </div>
  )
}
