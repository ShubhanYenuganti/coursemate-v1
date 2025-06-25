"use client"

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { access } from "fs";

export default function TokenHandlerPage() {
    const router = useRouter()

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken) {
            localStorage.setItem("token", accessToken)
            if (refreshToken) localStorage.setItem("refresh_token", refreshToken)
            router.replace("/dashboard")
        } else {
            router.replace("/login")
        }
    }, [router])

    return (
        <div className="flex flex-col items-center justify-center h-screen gap-4">
          <div className="w-12 h-12 border-4 border-muted border-t-foreground rounded-full animate-spin"></div>
          <p className="text-muted-foreground text-sm">Redirecting...</p>
        </div>
    );

}