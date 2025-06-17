import { Sidebar } from '../dashboard/components/sidebar';

export default function ChatPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <h1 className="text-3xl font-bold mb-4">Chat</h1>
        <p className="text-gray-600">This is the Chat page. More features coming soon!</p>
      </div>
    </div>
  );
} 