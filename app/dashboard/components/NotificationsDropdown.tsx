import React, { useState, useEffect } from 'react';
import { Bell, Check, X, User, BookOpen } from 'lucide-react';
import { notificationService, Notification } from '../../../lib/api/notificationService';
import { messageService, Conversation } from '../../../lib/api/messageService';
import { friendService } from '../../../lib/api/friendService';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/app/context/SocketContext';

export interface Activity {
  id: string;
  user?: string;
  avatar: string;
  action: string;
  target?: string;
  content?: string;
  time: string;
  type: 'message' | 'notification';
  conversationId?: string;
  notificationData?: Notification;
}

const NotificationsDropdown: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messageActivities, setMessageActivities] = useState<Activity[]>([]);
  const [notificationActivities, setNotificationActivities] = useState<Activity[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
  const { socket } = useSocket();

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = (data: { notification: any }) => {
      // Prepend the new notification to the list and reload notifications
      setNotifications(prev => [data.notification, ...prev]);
      loadNotifications();
    };
    socket.on('new_notification', handleNewNotification);
    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      // Fetch notifications
      const allNotifications = await notificationService.getNotifications(false, 20);
      setNotifications(allNotifications);
      
      // Fetch recent messages and convert them to activities
      const conversations = await messageService.getConversations();
      const unreadConversations = conversations.filter(conv => conv.unread_count > 0);
      
      const messageActivities: Activity[] = unreadConversations.slice(0, 5).map((conv: Conversation) => ({
        id: conv.id,
        user: conv.participant_name,
        avatar: conv.participant_name.charAt(0).toUpperCase(),
        action: 'sent you a message',
        content: conv.last_message,
        time: formatTimeAgo(conv.last_message_time),
        type: 'message',
        conversationId: conv.id,
      }));
      
      setMessageActivities(messageActivities);
      
      // Convert notifications to activities
      const notificationActivities: Activity[] = allNotifications.map((notification: Notification) => ({
        id: notification.id,
        user: notification.sender_name || 'System',
        avatar: getNotificationAvatar(notification.type),
        action: getNotificationAction(notification.type),
        content: notification.message,
        time: formatTimeAgo(notification.created_at),
        type: 'notification',
        notificationData: notification,
      }));
      
      setNotificationActivities(notificationActivities);
      
      // Calculate total unread count
      const totalUnread = allNotifications.filter(n => !n.is_read).length + messageActivities.length;
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hour${Math.floor(diffInMinutes / 60) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInMinutes / 1440)} day${Math.floor(diffInMinutes / 1440) > 1 ? 's' : ''} ago`;
  };

  const getNotificationAvatar = (type: string) => {
    switch (type) {
      case 'course_invite':
        return '📚';
      case 'friend_request':
        return '👥';
      case 'course_invite_accepted':
        return '✅';
      default:
        return '🔔';
    }
  };

  const getNotificationAction = (type: string) => {
    switch (type) {
      case 'course_invite':
        return 'invited you to a course';
      case 'friend_request':
        return 'sent you a friend request';
      case 'course_invite_accepted':
        return 'accepted your course invitation';
      default:
        return 'sent you a notification';
    }
  };

  const getAvatarColor = (avatar: string) => {
    if (avatar === '📺') return 'bg-indigo-500';
    if (avatar === '📚') return 'bg-blue-500';
    if (avatar === '👥') return 'bg-green-500';
    if (avatar === '✅') return 'bg-emerald-500';
    if (avatar === '🔔') return 'bg-yellow-500';
    return 'bg-indigo-500';
  };

  const getTimeDiff = (timeString: string) => {
    const match = timeString.match(/(\d+)\s*(min|hour|day)/);
    if (!match) return 0;
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case 'min': return value * 60 * 1000;
      case 'hour': return value * 60 * 60 * 1000;
      case 'day': return value * 24 * 60 * 60 * 1000;
      default: return 0;
    }
  };

  // Combine messages and notifications, sort by time
  const allActivities = [...messageActivities, ...notificationActivities].sort((a, b) => {
    const timeA = new Date(a.time.includes('ago') ? Date.now() - getTimeDiff(a.time) : a.time).getTime();
    const timeB = new Date(b.time.includes('ago') ? Date.now() - getTimeDiff(b.time) : b.time).getTime();
    return timeB - timeA;
  });

  const handleActivityClick = async (activity: Activity) => {
    if (activity.type === 'message') {
      // Navigate to chat page
      router.push('/chat');
      // Mark the conversation as read by removing it from the notifications
      setMessageActivities(prev => prev.filter(msg => msg.id !== activity.id));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } else if (activity.type === 'notification') {
      // Handle notification click based on type
      if (activity.notificationData) {
        await handleNotificationAction(activity.notificationData);
      }
    }
  };

  const handleNotificationAction = async (notification: Notification) => {
    try {
      // Mark notification as read
      await notificationService.markNotificationRead(notification.id);
      
      // Remove from local state
      setNotificationActivities(prev => prev.filter(n => n.id !== notification.id));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Handle specific notification types
      if (notification.type === 'course_invite') {
        // Navigate to courses page or show course invite modal
        router.push('/courses');
      } else if (notification.type === 'friend_request') {
        // Navigate to messages page to handle friend request
        router.push('/chat');
      } else if (notification.type === 'friend_request_accepted') {
        // Navigate to messages page to see the new friend
        router.push('/chat');
      }
    } catch (error) {
      console.error('Error handling notification action:', error);
    }
  };

  const handleFriendRequestResponse = async (notificationId: string, action: 'accept' | 'reject') => {
    try {
      const notification = notificationActivities.find(n => n.id === notificationId);
      if (!notification || !notification.notificationData) return;

      const requestId = notification.notificationData.data.request_id;
      await friendService.respondToFriendRequest(requestId, action);
      
      // Remove the notification from the list
      setNotificationActivities(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      if (action === 'accept') {
        router.push('/chat');
      }
    } catch (error) {
      console.error('Failed to respond to friend request:', error);
    }
  };

  const handleCourseInviteResponse = async (notificationId: string, action: 'accept' | 'decline') => {
    try {
      await notificationService.respondToCourseInvite(notificationId, action);
      // Remove the notification from the list
      setNotificationActivities(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      if (action === 'accept') {
        router.push('/courses');
      }
    } catch (error) {
      console.error('Failed to respond to course invite:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllNotificationsRead();
      setNotificationActivities(prev => prev.map(n => ({ ...n, notificationData: { ...n.notificationData!, is_read: true } })));
      setUnreadCount(messageActivities.length); // Only count unread messages
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="p-2">
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : allActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No new notifications</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allActivities.slice(0, 8).map((activity) => (
                  <div
                    key={activity.id}
                    onClick={() => handleActivityClick(activity)}
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${
                      activity.type === 'message' ? 'bg-blue-50 border-blue-200' : 
                      activity.notificationData?.is_read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 ${getAvatarColor(activity.avatar)} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {activity.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-sm text-gray-700 mb-1">
                              <strong>{activity.user}</strong> {activity.action}
                            </div>
                            {activity.content && (
                              <div className="text-xs text-gray-600 mb-1 italic">
                                {activity.content}
                              </div>
                            )}
                            <div className="text-xs text-gray-500">{activity.time}</div>
                          </div>
                        </div>

                        {/* Course Invite Actions */}
                        {activity.type === 'notification' && 
                         activity.notificationData?.type === 'course_invite' && 
                         !activity.notificationData.is_read && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCourseInviteResponse(activity.notificationData!.id, 'accept');
                              }}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCourseInviteResponse(activity.notificationData!.id, 'decline');
                              }}
                              className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                            >
                              Decline
                            </button>
                          </div>
                        )}

                        {/* Friend Request Actions */}
                        {activity.type === 'notification' && 
                         activity.notificationData?.type === 'friend_request' && 
                         !activity.notificationData.is_read && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFriendRequestResponse(activity.notificationData!.id, 'accept');
                              }}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFriendRequestResponse(activity.notificationData!.id, 'reject');
                              }}
                              className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationsDropdown; 