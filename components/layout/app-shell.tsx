"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, PlusSquare, MessageCircle, User, Camera, Heart } from "lucide-react"
import { cn } from "@/lib/utils"

interface AppShellProps {
  children: React.ReactNode
  userId?: string
}

export function AppShell({ children, userId }: AppShellProps) {
  const pathname = usePathname()

  const navItems = [
    { href: "/feed", icon: Home, label: "Home" },
    { href: "/explore", icon: Search, label: "Explore" },
    { href: "/create", icon: PlusSquare, label: "Create" },
    { href: "/notifications", icon: Heart, label: "Notifications" },
    { href: "/messages", icon: MessageCircle, label: "Messages" },
    { href: "/profile", icon: User, label: "Profile" },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop header */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Link href="/feed" className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-500 via-fuchsia-500 to-amber-500">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">Sean Snap</span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "p-3 rounded-lg transition-colors",
                    isActive
                      ? "text-foreground bg-secondary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                  )}
                >
                  <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="sr-only">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="pb-20 md:pb-0 md:pt-16">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="flex items-center justify-around h-full px-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-12 h-14 rounded-xl transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
                <span className="sr-only">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
