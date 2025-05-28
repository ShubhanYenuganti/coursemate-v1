"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Palette } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export type ColorScheme = "default" | "green" | "purple" | "orange" | "rose" | "indigo"

const colorSchemeConfig = {
  default: {
    name: "Default Blue",
    color: "bg-blue-500",
  },
  green: {
    name: "Green & Teal",
    color: "bg-emerald-500",
  },
  purple: {
    name: "Purple & Violet",
    color: "bg-purple-500",
  },
  orange: {
    name: "Orange & Amber",
    color: "bg-orange-500",
  },
  rose: {
    name: "Rose & Pink",
    color: "bg-rose-500",
  },
  indigo: {
    name: "Indigo & Blue",
    color: "bg-indigo-500",
  },
}

export function ColorSchemeSelector() {
  const [scheme, setScheme] = useState<ColorScheme>("default")

  // Load color scheme from localStorage on initial render
  useEffect(() => {
    const savedScheme = localStorage.getItem("coursemate-color-scheme") as ColorScheme | null
    if (savedScheme && Object.keys(colorSchemeConfig).includes(savedScheme)) {
      applyColorScheme(savedScheme)
    }
  }, [])

  const applyColorScheme = (newScheme: ColorScheme) => {
    // Remove all color scheme classes
    document.documentElement.classList.remove(
      "color-default",
      "color-green",
      "color-purple",
      "color-orange",
      "color-rose",
      "color-indigo",
    )

    // Add the new color scheme class
    document.documentElement.classList.add(`color-${newScheme}`)
    setScheme(newScheme)

    // Save to localStorage
    localStorage.setItem("coursemate-color-scheme", newScheme)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Palette className="h-5 w-5" />
          <span className="sr-only">Change color scheme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(colorSchemeConfig).map(([key, config]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => applyColorScheme(key as ColorScheme)}
            className="flex items-center gap-2"
          >
            <div className={`w-4 h-4 rounded-full ${config.color}`} />
            <span>{config.name}</span>
            {scheme === key && <span className="ml-auto text-xs">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
