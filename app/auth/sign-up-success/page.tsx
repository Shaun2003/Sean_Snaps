import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Camera, Mail } from "lucide-react"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 via-fuchsia-500 to-amber-500">
              <Camera className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold">Pictura</span>
          </div>

          <div className="mx-auto w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
            <Mail className="h-8 w-8 text-muted-foreground" />
          </div>

          <h1 className="text-2xl font-semibold text-foreground">Check your email</h1>
          <p className="text-muted-foreground">
            We&apos;ve sent you a confirmation link. Please check your email to verify your account before signing in.
          </p>
        </div>

        <Button asChild variant="outline" className="w-full h-11 bg-transparent">
          <Link href="/auth/login">Back to Sign In</Link>
        </Button>
      </div>
    </div>
  )
}
