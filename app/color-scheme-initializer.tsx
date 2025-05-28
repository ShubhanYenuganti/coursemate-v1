"use client"

import { useEffect } from "react"

export function ColorSchemeInitializer() {
  useEffect(() => {
    // Apply saved color scheme on initial load
    const savedScheme = localStorage.getItem("coursemate-color-scheme")
    if (savedScheme) {
      document.documentElement.classList.add(`color-${savedScheme}`)
    }
  }, [])

  return null
}
