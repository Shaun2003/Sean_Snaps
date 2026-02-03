import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Camera } from "lucide-react"

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/feed")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-500 via-fuchsia-500 to-amber-500">
                <Camera className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Pictura</h1>
            <p className="text-lg text-muted-foreground max-w-sm mx-auto">
              Share your moments, connect with friends, and discover amazing content from around the world.
            </p>
          </div>

          <div className="space-y-4 pt-4">
            <Button asChild size="lg" className="w-full h-12 text-base font-medium">
              <Link href="/auth/sign-up">Create Account</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full h-12 text-base font-medium bg-transparent">
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground pt-8">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </main>
    </div>
  )
}
