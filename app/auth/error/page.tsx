import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-gradient-to-br from-background via-background to-muted p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Camera className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Sean Snaps</h1>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-1 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
                <AlertCircle className="h-8 w-8" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              {params?.error ? (
                <p className="text-sm text-muted-foreground mb-6">Error: {params.error}</p>
              ) : (
                <p className="text-sm text-muted-foreground mb-6">An unspecified error occurred.</p>
              )}
              <Button asChild className="w-full">
                <Link href="/auth/login">Try again</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
