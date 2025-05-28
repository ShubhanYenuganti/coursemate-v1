import type React from "react"
import { ColorSchemeInitializer } from "@/app/color-scheme-initializer"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ColorSchemeInitializer />
      {children}
    </>
  )
}
