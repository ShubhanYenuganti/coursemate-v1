"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { jwtDecode } from "jwt-decode"

type JWTPayload = {
  exp: number // expiration timestamp in seconds
  [key: string]: any
}

export default function useAuthRedirect() {
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const accessToken = localStorage.getItem("token")
      const refreshToken = localStorage.getItem("refresh_token")

      let isValid = false

      // Step 1: check access token expiry
      if (accessToken) {
        try {
          const decoded: JWTPayload = jwtDecode(accessToken)
          const now = Math.floor(Date.now() / 1000)
          isValid = decoded.exp > now
        } catch (err) {
          console.warn("Access token decoding failed:", err)
        }
      }

      if (isValid) {
        setChecking(false)
        return
      }

      // Step 2: try refresh if access token expired
      if (refreshToken) {
        try {
          const res = await fetch("/api/refresh", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${refreshToken}`,
            },
          })

          if (res.ok) {
            const data = await res.json()
            if (data.access_token) {
              localStorage.setItem("token", data.access_token)
              if (data.refresh_token) {
                localStorage.setItem("refresh_token", data.refresh_token)
              }
              setChecking(false)
              return
            }
          }
        } catch (err) {
          console.error("Token refresh failed:", err)
        }
      }

      // Step 3: no valid token, redirect
      localStorage.removeItem("token")
      localStorage.removeItem("refresh_token")
      router.replace("/login")
    }

    checkAuth()
  }, [router])

  return checking
}
