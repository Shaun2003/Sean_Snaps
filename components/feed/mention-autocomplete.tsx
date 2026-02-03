"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface MentionAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onMentionSelect: (user: Profile) => void
}

export function MentionAutocomplete({ value, onChange, onMentionSelect }: MentionAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const currentMentionRef = useRef<string>("")

  useEffect(() => {
    const atIndex = value.lastIndexOf("@")
    if (atIndex === -1) {
      setOpen(false)
      return
    }

    const mentionText = value.substring(atIndex + 1)
    currentMentionRef.current = mentionText

    if (mentionText.length < 1) {
      setOpen(false)
      return
    }

    const searchUsers = async () => {
      setIsLoading(true)
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .or(`username.ilike.%${mentionText}%,display_name.ilike.%${mentionText}%`)
          .limit(5)

        setSuggestions(data || [])
        setOpen(true)
      } finally {
        setIsLoading(false)
      }
    }

    const timer = setTimeout(searchUsers, 300)
    return () => clearTimeout(timer)
  }, [value])

  const handleSelect = (user: Profile) => {
    const atIndex = value.lastIndexOf("@")
    const beforeMention = value.substring(0, atIndex)
    const newValue = `${beforeMention}@${user.username} `
    onChange(newValue)
    onMentionSelect(user)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="hidden" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandList>
            {isLoading && <CommandEmpty>Searching...</CommandEmpty>}
            {!isLoading && suggestions.length === 0 && <CommandEmpty>No users found</CommandEmpty>}
            {suggestions.length > 0 && (
              <CommandGroup>
                {suggestions.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.username || ""}
                    onSelect={() => handleSelect(user)}
                    className="cursor-pointer"
                  >
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={user.avatar_url || ""} />
                      <AvatarFallback>{user.display_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{user.display_name || user.username}</p>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Parse mentions in text
export function ParseMentions({ text, className = "text-sm" }: { text: string; className?: string }) {
  const mentionRegex = /@[\w]+/g
  const parts = text.split(mentionRegex)
  const mentions = text.match(mentionRegex) || []

  return (
    <span className={className}>
      {parts.map((part, index) => (
        <span key={index}>
          {part}
          {mentions[index] && (
            <a
              href={`/profile/${mentions[index].substring(1)}`}
              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {mentions[index]}
            </a>
          )}
        </span>
      ))}
    </span>
  )
}

// Extract mentions from text
export function extractMentions(text: string): string[] {
  const mentionRegex = /@[\w]+/g
  const matches = text.match(mentionRegex) || []
  return matches.map((mention) => mention.substring(1))
}
