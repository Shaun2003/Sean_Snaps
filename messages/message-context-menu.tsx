"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Copy, Edit2, Trash2, Heart, MessageCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface MessageContextMenuProps {
  messageId: string
  content: string | null
  isOwn: boolean
  isEdited: boolean
  onEdit?: () => void
  onDelete: (messageId: string) => Promise<void>
  className?: string
}

export function MessageContextMenu({
  messageId,
  content,
  isOwn,
  isEdited,
  onEdit,
  onDelete,
  className,
}: MessageContextMenuProps) {
  const { toast } = useToast()

  const handleCopy = () => {
    if (!content) return
    navigator.clipboard.writeText(content)
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
      duration: 2000,
    })
  }

  const handleDelete = async () => {
    const confirmed = window.confirm("Delete this message?")
    if (!confirmed) return

    try {
      await onDelete(messageId)
      toast({
        title: "Message deleted",
        description: "Your message has been removed",
        duration: 2000,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      })
    }
  }

  if (!isOwn && !content) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity", className)}
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isOwn ? "end" : "start"} className="w-40">
        {isOwn ? (
          <>
            {content && (
              <>
                <DropdownMenuItem onClick={handleCopy} className="cursor-pointer">
                  <Copy className="h-4 w-4 mr-2" />
                  <span>Copy</span>
                </DropdownMenuItem>
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                    <Edit2 className="h-4 w-4 mr-2" />
                    <span>Edit</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              <span>Delete</span>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            {content && (
              <>
                <DropdownMenuItem onClick={handleCopy} className="cursor-pointer">
                  <Copy className="h-4 w-4 mr-2" />
                  <span>Copy</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem className="text-muted-foreground cursor-pointer hover:bg-accent">
              <Heart className="h-4 w-4 mr-2" />
              <span>React</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-muted-foreground cursor-pointer hover:bg-accent">
              <MessageCircle className="h-4 w-4 mr-2" />
              <span>Reply</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
