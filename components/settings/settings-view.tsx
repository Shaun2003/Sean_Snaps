"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ChevronRight, User, Bell, Lock, Moon, Sun, HelpCircle, LogOut, Shield, Monitor } from "lucide-react"
import { useTheme } from "@/components/providers/theme-provider"

interface SettingsViewProps {
  userEmail: string
  userId: string
  initialIsPrivate?: boolean
}

export function SettingsView({ userEmail, userId, initialIsPrivate = false }: SettingsViewProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [notifications, setNotifications] = useState(true)
  const [privateAccount, setPrivateAccount] = useState(initialIsPrivate)
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingPrivate, setIsSavingPrivate] = useState(false)
  const router = useRouter()

  const handlePrivateToggle = async (value: boolean) => {
    setIsSavingPrivate(true)
    setPrivateAccount(value)

    const supabase = createClient()
    const { error } = await supabase.from("profiles").update({ is_private: value }).eq("id", userId)

    if (error) {
      console.error("Error updating private setting:", error)
      setPrivateAccount(!value) // Revert on error
    }
    setIsSavingPrivate(false)
  }

  const handleLogout = async () => {
    setIsLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark")
    else if (theme === "dark") setTheme("system")
    else setTheme("light")
  }

  const getThemeIcon = () => {
    if (theme === "system") return Monitor
    if (theme === "dark") return Moon
    return Sun
  }

  const getThemeLabel = () => {
    if (theme === "system") return "System"
    if (theme === "dark") return "Dark"
    return "Light"
  }

  const ThemeIcon = getThemeIcon()

  const settingsSections = [
    {
      title: "Account",
      items: [
        {
          icon: User,
          label: "Edit Profile",
          href: "/profile/edit",
        },
        {
          icon: Lock,
          label: "Change Password",
          action: () => alert("Password change feature coming soon"),
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          icon: Bell,
          label: "Push Notifications",
          toggle: true,
          value: notifications,
          onChange: setNotifications,
        },
        {
          icon: ThemeIcon,
          label: `Theme: ${getThemeLabel()}`,
          action: cycleTheme,
        },
        {
          icon: Shield,
          label: "Private Account",
          description: "Only followers can see your posts",
          toggle: true,
          value: privateAccount,
          onChange: handlePrivateToggle,
          disabled: isSavingPrivate,
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          icon: HelpCircle,
          label: "Help Center",
          action: () => alert("Help center coming soon"),
        },
      ],
    },
  ]

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>

      <div className="mb-6 p-4 bg-secondary rounded-xl">
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="font-medium">{userEmail}</p>
      </div>

      <div className="space-y-6">
        {settingsSections.map((section) => (
          <div key={section.title}>
            <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">{section.title}</h2>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {section.items.map((item, index) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.label}
                    className={`flex items-center justify-between p-4 ${
                      index !== section.items.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <span>{item.label}</span>
                        {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                      </div>
                    </div>
                    {item.toggle ? (
                      <Switch checked={item.value} onCheckedChange={item.onChange} disabled={item.disabled} />
                    ) : item.href ? (
                      <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                        <a href={item.href}>
                          <ChevronRight className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={item.action} className="h-8 w-8">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <Button variant="destructive" className="w-full mt-8 h-11" onClick={handleLogout} disabled={isLoading}>
        <LogOut className="h-4 w-4 mr-2" />
        {isLoading ? "Signing out..." : "Sign Out"}
      </Button>
    </div>
  )
}
