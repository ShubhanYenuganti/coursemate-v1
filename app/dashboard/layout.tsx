"use client";

import type React from "react";
import { Sidebar } from "./components/sidebar";
import { Header } from "./components/header";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const checkOnboarded = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch("/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const user = await res.json();
      if (user.onboarded === false) {
        setRedirecting(true);
        setTimeout(() => {
          router.replace("/onboarding");
        }, 1200);
      }
    };
    checkOnboarded();
  }, [router]);

  if (redirecting) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-gray-50">
        <div className="w-12 h-12 border-4 border-muted border-t-foreground rounded-full animate-spin"></div>
        <p className="text-muted-foreground text-lg font-medium">
          Redirecting to onboarding...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch("/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const user = await res.json();
      const firstName = user.name ? user.name.split(' ')[0] : "User";
      setUserName(firstName);
    };
    fetchUser();
  }, []);

  return (
    <OnboardingGuard>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-y-auto bg-gray-50">
          <div className="sticky top-0 z-20 w-full bg-white shadow-sm">
            <Header userName={userName} />
          </div>
          <div className="flex-1">{children}</div>
        </div>
      </div>
    </OnboardingGuard>
  );
}
