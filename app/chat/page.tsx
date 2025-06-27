"use client"

import { Sidebar } from '../dashboard/components/sidebar';
import useAuthRedirect from "@/hooks/useAuthRedirect"
import Messages from './components/Messages';

export default function ChatPage() {
  const loading = useAuthRedirect()

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <Messages />
      </div>
    </div>
  );
} 