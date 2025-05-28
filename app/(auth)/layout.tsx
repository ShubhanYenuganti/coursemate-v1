import type React from "react"
import { ColorSchemeInitializer } from "@/app/color-scheme-initializer"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ColorSchemeInitializer />
      {children}
    </>
  )
}
