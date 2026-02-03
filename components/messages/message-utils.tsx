"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Trash2, Archive, Pin, Bell, BellOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface MessageSearchProps {
  onSearch: (query: string) => void
  onFilter: (filter: "all" | "unread" | "archived") => void
  currentFilter: "all" | "unread" | "archived"
}

export function MessageSearchBar({
  onSearch,
  onFilter,
  currentFilter,
}: MessageSearchProps) {
  const [search, setSearch] = useState("")

  const handleSearchChange = (value: string) => {
    setSearch(value)
    onSearch(value)
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 rounded-full"
        />
      </div>
      <div className="flex gap-2">
        <Button
          variant={currentFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => onFilter("all")}
        >
          All
        </Button>
        <Button
          variant={currentFilter === "unread" ? "default" : "outline"}
          size="sm"
          onClick={() => onFilter("unread")}
        >
          Unread
        </Button>
        <Button
          variant={currentFilter === "archived" ? "default" : "outline"}
          size="sm"
          onClick={() => onFilter("archived")}
        >
          Archived
        </Button>
      </div>
    </div>
  )
}

interface MessageActionsDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onArchive?: () => void
  onMute?: () => void
  onDelete?: () => void
  isMuted?: boolean
}

export function MessageActionsDialog({
  isOpen,
  onOpenChange,
  onArchive,
  onMute,
  onDelete,
  isMuted = false,
}: MessageActionsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-100">
        <DialogHeader>
          <DialogTitle>Conversation Options</DialogTitle>
          <DialogDescription>Manage this conversation</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {onArchive && (
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => {
                onArchive()
                onOpenChange(false)
              }}
            >
              <Archive className="h-4 w-4" />
              Archive Conversation
            </Button>
          )}

          {onMute && (
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => {
                onMute()
                onOpenChange(false)
              }}
            >
              {isMuted ? (
                <>
                  <Bell className="h-4 w-4" />
                  Unmute Notifications
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4" />
                  Mute Notifications
                </>
              )}
            </Button>
          )}

          {onDelete && (
            <Button
              variant="destructive"
              className="w-full justify-start gap-2"
              onClick={() => {
                if (window.confirm("Delete this conversation? This cannot be undone.")) {
                  onDelete()
                  onOpenChange(false)
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete Conversation
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface MessageReactionPickerProps {
  onReactionSelect: (reaction: string) => void
  reactions?: string[]
}

export function MessageReactionPicker({
  onReactionSelect,
  reactions = ["👍", "❤️", "😂", "😮", "😢", "😡"],
}: MessageReactionPickerProps) {
  return (
    <div className="flex gap-1 bg-card border rounded-full p-1 shadow-lg">
      {reactions.map((reaction) => (
        <button
          key={reaction}
          onClick={() => onReactionSelect(reaction)}
          className="hover:bg-muted rounded-full p-2 transition-colors text-lg"
          title={reaction}
        >
          {reaction}
        </button>
      ))}
    </div>
  )
}

interface TypingIndicatorProps {
  username: string
  className?: string
}

export function TypingIndicator({ username, className }: TypingIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <span>{username} is typing</span>
      <div className="flex gap-1">
        <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  )
}
