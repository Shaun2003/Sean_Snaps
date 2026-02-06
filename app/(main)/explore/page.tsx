import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ExploreContent } from "@/components/explore/explore-content"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ExplorePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      <div className="w-full mx-auto px-2 sm:px-3 lg:px-4 py-4 sm:py-6 lg:py-8 max-w-4xl">
        <div className="mb-6 sm:mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between gap-2 sm:gap-4 mb-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-clip-text text-transparent bg-linear-to-r from-blue-500 via-purple-500 to-pink-500">
              Explore
            </h1>
            {/* For You link - visible on all screen sizes */}
            <Link href="/feed/for-you">
              <Button variant="outline" size="sm" className="flex gap-1 sm:gap-2 text-xs sm:text-sm">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">For You</span>
              </Button>
            </Link>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">Discover new content and trends</p>
        </div>
        <ExploreContent userId={user.id} />
      </div>
    </div>
  )
}
