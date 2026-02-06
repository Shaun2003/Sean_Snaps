import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { FeedContent } from "@/components/feed/feed-content"
import { StoriesBar } from "@/components/feed/stories-bar"

export const dynamic = "force-dynamic"

export default async function FeedPage() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error,
    } = await Promise.race([
      supabase.auth.getUser(),
      new Promise<{ data: { user: null }; error: Error }>((_, reject) =>
        setTimeout(() => reject(new Error("Auth timeout")), 5000),
      ),
    ]).catch(() => ({ data: { user: null }, error: new Error("Auth failed") }))

    if (!user || error) {
      redirect("/auth/login")
    }

  return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
        <div className="w-full mx-auto px-2 sm:px-3 lg:px-4 py-4 sm:py-6 lg:py-8">
          <div className="max-w-2xl mx-auto">
            <StoriesBar userId={user.id} />
            <FeedContent userId={user.id} />
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error("[v0] Feed page error:", error)
    redirect("/auth/login")
  }
}
