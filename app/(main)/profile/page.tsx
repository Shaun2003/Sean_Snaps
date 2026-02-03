"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export default function ProfileRedirect() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const redirectToProfile = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/auth/login")
        return
      }

      // Fetch the user's profile to get their username
      const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single()

      if (profile?.username) {
        router.replace(`/profile/${profile.username}`)
      } else {
        // If no username, redirect to settings to set one up
        router.replace("/settings")
      }
    }

    redirectToProfile()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}
