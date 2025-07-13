import { useSocket } from '@/app/context/SocketContext';
import { useEffect, useState } from 'react';

interface Notification {
  id: string;
  type: 'message' | 'request' | 'system';
  sender: string;
  content: string;
  timestamp: string;
}

const NotificationsDropdown: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = (data: { notification: any }) => {
      setNotifications(prev => [data.notification, ...prev]);
    };
    socket.on('new_notification', handleNewNotification);
    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket]);

  return (
    <div className="relative">
      <button className="p-2 text-gray-600 hover:text-gray-800">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V8.25A6 6 0 006 8.25V6.75A8.967 8.967 0 0112.546 3c2.309 0 4.49.978 6.003 2.583a23.848 23.848 0 005.454 1.31"
          />
        </svg>
      </button>

      {notifications.length > 0 && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          <div className="p-3">
            <h3 className="text-lg font-semibold mb-2">Notifications</h3>
            <ul>
              {notifications.map((notification) => (
                <li key={notification.id} className="flex items-center justify-between p-2 border-b last:border-b-0">
                  <span>{notification.content}</span>
                  <span className="text-xs text-gray-500">{notification.timestamp}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown; 