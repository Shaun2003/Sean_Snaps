import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, Mail } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SignUpSuccessPage() {
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
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
                <Mail className="h-8 w-8" />
              </div>
              <CardTitle className="text-xl">Check your email</CardTitle>
              <CardDescription>{"We've sent you a confirmation link"}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-6">
                Please check your email and click the confirmation link to activate your account.
              </p>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/auth/login">Back to Sign in</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
