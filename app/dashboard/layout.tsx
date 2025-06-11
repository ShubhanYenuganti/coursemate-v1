"use client";

import type React from "react";
import { Sidebar } from "./components/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">{children}</div>
    </div>
  );
}
