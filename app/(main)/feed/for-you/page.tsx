import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ForYouFeed } from "@/components/feed/for-you-feed"

export default async function ForYouPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (!user || error) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      <div className="w-full mx-auto px-2 sm:px-3 lg:px-4 py-4 sm:py-6 lg:py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-clip-text text-transparent bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 mb-2">For You</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Personalized recommendations based on your activity</p>
          </div>
          <ForYouFeed userId={user.id} />
        </div>
      </div>
    </div>
  )
}
