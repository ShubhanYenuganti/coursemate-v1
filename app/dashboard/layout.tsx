"use client";

import type React from "react";
import { Sidebar } from "./components/sidebar";
import { Header } from "./components/header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-y-auto bg-gray-50">
        <div className="sticky top-0 z-20 w-full bg-white shadow-sm">
          <Header />
        </div>
        <div className="flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}
