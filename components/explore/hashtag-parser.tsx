"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

interface ParseHashtagsProps {
  text: string
  className?: string
  linkClassName?: string
}

export function ParseHashtags({ text, className = "text-sm", linkClassName = "text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300" }: ParseHashtagsProps) {
  const hashtagRegex = /#[\w]+/g
  const parts = text.split(hashtagRegex)
  const hashtags = text.match(hashtagRegex) || []

  return (
    <span className={className}>
      {parts.map((part, index) => (
        <span key={index}>
          {part}
          {hashtags[index] && (
            <Link
              href={`/explore/hashtag/${hashtags[index].substring(1)}`}
              className={linkClassName}
              onClick={(e) => e.stopPropagation()}
            >
              {hashtags[index]}
            </Link>
          )}
        </span>
      ))}
    </span>
  )
}

// Extract hashtags from text
export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#[\w]+/g
  const matches = text.match(hashtagRegex) || []
  return matches.map((tag) => tag.substring(1).toLowerCase())
}
