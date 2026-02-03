"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Palette } from "lucide-react"
import { cn } from "@/lib/utils"

interface PostThemeSelectorProps {
  onSelect: (theme: string) => void
  selectedTheme: string | null
}

const themes = [
  { id: "gradient-sunset", name: "Sunset", class: "bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600" },
  { id: "gradient-ocean", name: "Ocean", class: "bg-gradient-to-br from-blue-400 via-cyan-500 to-teal-600" },
  { id: "gradient-forest", name: "Forest", class: "bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600" },
  { id: "gradient-royal", name: "Royal", class: "bg-gradient-to-br from-purple-400 via-pink-500 to-rose-600" },
]

export function PostThemeSelector({ onSelect, selectedTheme }: PostThemeSelectorProps) {
  const [open, setOpen] = useState(false)

  const selectedThemeData = themes.find((t) => t.id === selectedTheme)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn(
            "gap-2 bg-transparent",
            selectedThemeData && selectedThemeData.class + " text-white border-transparent hover:opacity-90"
          )}
        >
          <Palette className="h-4 w-4" />
          {selectedThemeData ? selectedThemeData.name : "Add Theme"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="space-y-2">
          <p className="text-sm font-medium">Choose a theme</p>
          <div className="grid grid-cols-2 gap-2">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => {
                  onSelect(theme.id)
                  setOpen(false)
                }}
                className={cn(
                  "h-20 rounded-lg transition-all hover:scale-105",
                  theme.class,
                  selectedTheme === theme.id && "ring-2 ring-primary ring-offset-2",
                )}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-white font-medium drop-shadow-lg">{theme.name}</span>
                </div>
              </button>
            ))}
          </div>
          {selectedTheme && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onSelect("")
                setOpen(false)
              }}
            >
              Remove Theme
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
