"use client"

import { Sidebar } from '../dashboard/components/sidebar';
import useAuthRedirect from "@/hooks/useAuthRedirect"

export default function StudyPlanPage() {
  const loading = useAuthRedirect()

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <h1 className="text-3xl font-bold mb-4">Study Plan</h1>
        <p className="text-gray-600">This is the Study Plan page. More features coming soon!</p>
      </div>
    </div>
  );
} 