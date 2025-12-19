"use client";

import type React from "react";
import { CoursesSidebar } from "../../components/courses-sidebar";

export default function CoursesLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <CoursesSidebar />
      <div className="flex-1 flex flex-col overflow-y-auto bg-gray-50">
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
} 