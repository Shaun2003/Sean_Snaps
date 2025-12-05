"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import { User, Bell, Lock, Palette, LogOut, Trash2 } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import type { Profile, UserSettings } from "@/lib/types"

interface Props {
  user: SupabaseUser
  profile: Profile | null
  settings: UserSettings | null
}

export function SettingsContent({ user, profile, settings }: Props) {
  const [notifyLikes, setNotifyLikes] = useState(settings?.notify_likes ?? true)
  const [notifyComments, setNotifyComments] = useState(settings?.notify_comments ?? true)
  const [notifyFollows, setNotifyFollows] = useState(settings?.notify_follows ?? true)
  const [notifyMessages, setNotifyMessages] = useState(settings?.notify_messages ?? true)
  const [privateAccount, setPrivateAccount] = useState(settings?.private_account ?? false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  async function saveSettings() {
    setSaving(true)
    await supabase.from("user_settings").upsert({
      id: user.id,
      user_id: user.id,
      notify_likes: notifyLikes,
      notify_comments: notifyComments,
      notify_follows: notifyFollows,
      notify_messages: notifyMessages,
      private_account: privateAccount,
      theme,
    })
    setSaving(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  async function handleDeleteAccount() {
    await supabase.from("profiles").delete().eq("id", user.id)
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-4">
      <h1 className="text-xl sm:text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <User className="size-4 sm:size-5" />
            Account
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Manage your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm">Email</Label>
            <Input value={user.email || ""} disabled className="text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm">Username</Label>
            <Input value={profile?.username || ""} disabled className="text-sm" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">Change your username in Edit Profile</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Bell className="size-4 sm:size-5" />
            Notifications
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Configure your notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <Label className="text-xs sm:text-sm">Likes</Label>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                Get notified when someone likes your posts
              </p>
            </div>
            <Switch checked={notifyLikes} onCheckedChange={setNotifyLikes} />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <Label className="text-xs sm:text-sm">Comments</Label>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                Get notified when someone comments
              </p>
            </div>
            <Switch checked={notifyComments} onCheckedChange={setNotifyComments} />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <Label className="text-xs sm:text-sm">Follows</Label>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                Get notified when someone follows you
              </p>
            </div>
            <Switch checked={notifyFollows} onCheckedChange={setNotifyFollows} />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <Label className="text-xs sm:text-sm">Messages</Label>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Get notified for new messages</p>
            </div>
            <Switch checked={notifyMessages} onCheckedChange={setNotifyMessages} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Lock className="size-4 sm:size-5" />
            Privacy
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Control your privacy settings</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <Label className="text-xs sm:text-sm">Private Account</Label>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                Only approved followers can see your posts
              </p>
            </div>
            <Switch checked={privateAccount} onCheckedChange={setPrivateAccount} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Palette className="size-4 sm:size-5" />
            Appearance
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Customize how the app looks</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs sm:text-sm">Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-28 sm:w-32 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end px-1">
        <Button onClick={saveSettings} disabled={saving} size="sm" className="sm:size-default">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <Separator />

      <Card className="border-destructive/50">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-destructive text-base sm:text-lg">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <Label className="text-xs sm:text-sm">Sign Out</Label>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Sign out on this device</p>
            </div>
            <Button variant="outline" onClick={handleSignOut} size="sm">
              <LogOut className="size-3 sm:size-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">Sign Out</span>
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <Label className="text-xs sm:text-sm">Delete Account</Label>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Permanently delete your account</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="size-3 sm:size-4 mr-1 sm:mr-2" />
                  <span className="text-xs sm:text-sm">Delete</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Account</AlertDialogTitle>
                  <AlertDialogDescription className="text-xs sm:text-sm">
                    This action cannot be undone. This will permanently delete your account and all data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
