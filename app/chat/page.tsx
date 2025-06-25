import { Sidebar } from '../dashboard/components/sidebar';
import Messages from './components/Messages';

export default function ChatPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <Messages />
      </div>
    </div>
  );
} 