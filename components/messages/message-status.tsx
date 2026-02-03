"use client"

import { Check, CheckCheck, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface MessageStatusProps {
  status: "sending" | "sent" | "delivered" | "read"
  className?: string
}

export function MessageStatus({ status, className }: MessageStatusProps) {
  switch (status) {
    case "sending":
      return (
        <div title="Sending..." className={cn("text-muted-foreground", className)}>
          <Clock className="h-3 w-3" />
        </div>
      )
    case "sent":
      return (
        <div title="Sent" className={cn("text-muted-foreground", className)}>
          <Check className="h-3 w-3" />
        </div>
      )
    case "delivered":
      return (
        <div title="Delivered" className={cn("text-muted-foreground", className)}>
          <CheckCheck className="h-3 w-3" />
        </div>
      )
    case "read":
      return (
        <div title="Read" className={cn("text-primary", className)}>
          <CheckCheck className="h-3 w-3" />
        </div>
      )
    default:
      return null
  }
}
