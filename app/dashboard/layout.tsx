"use client";

import type React from "react";
import { Sidebar } from "./components/sidebar";
import { Header } from "./components/header";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const checkOnboarded = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setChecking(false);
        return;
      }
      const res = await fetch("/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setChecking(false);
        return;
      }
      const user = await res.json();
      if (user.onboarded === false) {
        setRedirecting(true);
        setTimeout(() => {
          router.replace("/onboarding");
        }, 1200);
      } else {
        setChecking(false);
      }
    };
    checkOnboarded();
  }, [router]);

  if (checking || redirecting) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-gray-50">
        <div className="w-12 h-12 border-4 border-muted border-t-foreground rounded-full animate-spin"></div>
        <p className="text-muted-foreground text-lg font-medium">
          {redirecting ? "Redirecting to onboarding..." : "Checking onboarding status..."}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingGuard>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-y-auto bg-gray-50">
          <div className="sticky top-0 z-20 w-full bg-white shadow-sm">
            <Header />
          </div>
          <div className="flex-1 p-6">{children}</div>
        </div>
      </div>
    </OnboardingGuard>
  );
}
