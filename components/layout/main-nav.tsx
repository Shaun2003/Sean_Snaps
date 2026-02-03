"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Search, PlusSquare, MessageCircle, Bell, User, Camera, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface MainNavProps {
  unreadMessages?: number
  unreadNotifications?: number
}

export function MainNav({ unreadMessages = 0, unreadNotifications = 0 }: MainNavProps) {
  const pathname = usePathname()

  const navItems = [
    { href: "/feed", label: "Home", icon: Home },
    { href: "/explore", label: "Explore", icon: Search },
    { href: "/create", label: "Create", icon: PlusSquare },
    { href: "/messages", label: "Messages", icon: MessageCircle, badge: unreadMessages },
    { href: "/notifications", label: "Notifications", icon: Bell, badge: unreadNotifications },
    { href: "/profile", label: "Profile", icon: User },
  ]

  return (
    <>
      {/* Desktop Sidebar - Narrower on md, wider on lg */}
      <aside className="hidden md:flex fixed left-0 top-0 z-40 h-screen w-56 lg:w-64 flex-col border-r bg-background px-2 lg:px-3 py-4">
        <Link href="/feed" className="flex items-center gap-2 px-2 lg:px-3 py-2 mb-4 lg:mb-6">
          <div className="flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Camera className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
          </div>
          <span className="text-lg lg:text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-blue-500 via-purple-500 to-pink-500">Sean Snaps</span>
        </Link>

        <nav className="flex flex-col gap-0.5 lg:gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 lg:gap-3 rounded-lg px-2 lg:px-3 py-2.5 lg:py-3 text-xs lg:text-sm font-medium transition-colors hover:bg-accent",
                  isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                )}
              >
                <div className="relative">
                  <item.icon className="h-4 w-4 lg:h-5 lg:w-5" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -right-1.5 -top-1.5 lg:-right-2 lg:-top-2 h-4 w-4 lg:h-5 lg:w-5 rounded-full p-0 text-[9px] lg:text-xs flex items-center justify-center"
                    >
                      {item.badge > 9 ? "9+" : item.badge}
                    </Badge>
                  )}
                </div>
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Mobile Bottom Nav - Better sizing */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background safe-area-pb">
        <div className="flex items-center justify-around py-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1.5 text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rounded-full p-0 text-[8px] flex items-center justify-center"
                    >
                      {item.badge > 9 ? "+" : item.badge}
                    </Badge>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
