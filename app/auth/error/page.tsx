import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Camera, AlertCircle } from "lucide-react"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

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

          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>

          <h1 className="text-2xl font-semibold text-foreground">Something went wrong</h1>
          <p className="text-muted-foreground">
            {params?.error || "An error occurred during authentication. Please try again."}
          </p>
        </div>

        <div className="space-y-3">
          <Button asChild className="w-full h-11">
            <Link href="/auth/login">Try Again</Link>
          </Button>
          <Button asChild variant="outline" className="w-full h-11 bg-transparent">
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
