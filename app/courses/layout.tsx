"use client";

import type React from "react";
import { Sidebar } from "../dashboard/components/sidebar";

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-y-auto bg-gray-50">
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
} 