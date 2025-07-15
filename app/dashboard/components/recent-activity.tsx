import React, { useState, useEffect } from 'react';
import { messageService, Conversation } from '../../../lib/api/messageService';
import { notificationService, Notification } from '../../../lib/api/notificationService';
import { friendService } from '../../../lib/api/friendService';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { BookOpen, User, Bell, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
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

interface CommunityActivityProps {
  activities?: Activity[];
  onFilterChange?: (filter: string) => void;
  onActivityClick?: (activity: Activity) => void;
}

const defaultActivities: Activity[] = [
  {
    id: '1',
    user: 'Priya Patel',
    avatar: 'PP',
    action: 'posted in',
    target: 'Calculus Study Group',
    content: 'Anyone else stuck on problem 5 of the latest assignment? Would love some hints!',
    time: '25 min ago',
    type: 'message',
  },
  {
    id: '2',
    user: 'David Lee',
    avatar: 'DL',
    action: 'shared a resource in',
    target: 'Physics Help Forum',
    content: 'Check out this great summary PDF!',
    time: '1 hour ago',
    type: 'message',
  },
  {
    id: '3',
    user: 'You',
    avatar: 'Y',
    action: 'completed subtask',
    target: 'Biology Chapter 3',
    content: 'Finished reading section 3.2',
    time: '2 hours ago',
    type: 'notification',
  },
  {
    id: '4',
    user: 'Ava Chen',
    avatar: 'AC',
    action: 'joined',
    target: 'General Biology',
    content: '',
    time: '3 hours ago',
    type: 'notification',
  },
  {
    id: '5',
    user: 'Ava Chen',
    avatar: 'AC',
    action: 'joined',
    target: 'General Biology',
    content: '',
    time: '3 hours ago',
    type: 'notification',
  },
];

const CARDS_PER_PAGE = 4;

const CommunityActivity: React.FC<CommunityActivityProps> = ({
  activities = defaultActivities,
  onFilterChange,
  onActivityClick,
}) => {
  const [modalActivity, setModalActivity] = useState<Activity | null>(null);
  const [messageActivities, setMessageActivities] = useState<Activity[]>([]);
  const [notificationActivities, setNotificationActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const router = useRouter();
  const { socket } = useSocket();
  const [page, setPage] = useState(0);

  // Fetch recent messages and convert them to activities
  useEffect(() => {
    const fetchRecentMessages = async () => {
      try {
        const conversations = await messageService.getConversations();
        
        // Filter out conversations with no unread messages
        const unreadConversations = conversations.filter(conv => conv.unread_count > 0);
        
        // Convert conversations to activities
        const activities: Activity[] = unreadConversations.slice(0, 5).map((conv: Conversation) => ({
          id: conv.id,
          user: conv.participant_name,
          avatar: conv.participant_name.charAt(0).toUpperCase(),
          action: 'sent you a message',
          content: conv.last_message,
          time: formatTimeAgo(conv.last_message_time),
          type: 'message',
          conversationId: conv.id,
        }));
        
        setMessageActivities(activities);
      } catch (error) {
        console.error('Error fetching recent messages:', error);
        setMessageActivities([]);
      }
    };

    fetchRecentMessages();
  }, []);

  // Fetch recent notifications and convert them to activities
  useEffect(() => {
    const fetchRecentNotifications = async () => {
      try {
        const notifications = await notificationService.getNotifications(false, 10);
        
        // Convert notifications to activities
        const activities: Activity[] = notifications.map((notification: Notification) => ({
          id: notification.id,
          user: notification.sender_name || 'System',
          avatar: getNotificationAvatar(notification.type),
          action: getNotificationAction(notification.type),
          content: notification.message,
          time: formatTimeAgo(notification.created_at),
          type: 'notification',
          notificationData: notification,
        }));
        
        setNotificationActivities(activities);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        setNotificationActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentNotifications();
  }, []);

  // Real-time notification updates
  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = (data: { notification: any }) => {
      // Prepend the new notification to the list and reload activities
      setNotificationActivities(prev => [
        {
          id: data.notification.id,
          user: data.notification.sender_name || 'System',
          avatar: getNotificationAvatar(data.notification.type),
          action: getNotificationAction(data.notification.type),
          content: data.notification.message,
          time: formatTimeAgo(data.notification.created_at),
          type: 'notification',
          notificationData: data.notification,
        },
        ...prev,
      ]);
      // Optionally, reload messages as well
      reloadMessageActivities();
    };
    socket.on('new_notification', handleNewNotification);
    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket]);

  // Helper function to format time ago
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

  // Combine messages and notifications, sort by time
  const allActivities = [...messageActivities, ...notificationActivities].sort((a, b) => {
    const timeA = new Date(a.time.includes('ago') ? Date.now() - getTimeDiff(a.time) : a.time).getTime();
    const timeB = new Date(b.time.includes('ago') ? Date.now() - getTimeDiff(b.time) : b.time).getTime();
    return timeB - timeA;
  });

  // Only show the most recent 10 activities for the horizontal feed
  const activitiesToDisplay = activities.length > 0 ? activities : allActivities.slice(0, 10);

  const totalPages = Math.ceil(activitiesToDisplay.length / CARDS_PER_PAGE);
  const paginatedActivities = activitiesToDisplay.slice(page * CARDS_PER_PAGE, (page + 1) * CARDS_PER_PAGE);

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

  const handleActivityClick = async (activity: Activity) => {
    if (activity.type === 'message') {
      setModalActivity(activity);
      setReplyText('');
      onActivityClick && onActivityClick(activity);
      
      // Mark the conversation as read by removing it from the notifications
      setMessageActivities(prev => prev.filter(msg => msg.id !== activity.id));
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
      
      if (action === 'accept') {
        router.push('/courses');
      }
    } catch (error) {
      console.error('Failed to respond to course invite:', error);
    }
  };

  const handleCloseModal = () => {
    setModalActivity(null);
    setReplyText('');
  };

  const handleSendReply = async () => {
    if (!modalActivity || !replyText.trim()) return;

    setSendingReply(true);
    try {
      await messageService.sendMessage({
        receiver_id: modalActivity.conversationId!,
        message_content: replyText.trim(),
      });
      
      // Clear the reply text and close modal
      setReplyText('');
      setModalActivity(null);
      
      // Refresh the message activities to show only unread messages
      const conversations = await messageService.getConversations();
      const unreadConversations = conversations.filter(conv => conv.unread_count > 0);
      const activities: Activity[] = unreadConversations.slice(0, 5).map((conv: Conversation) => ({
        id: conv.id,
        user: conv.participant_name,
        avatar: conv.participant_name.charAt(0).toUpperCase(),
        action: 'sent you a message',
        content: conv.last_message,
        time: formatTimeAgo(conv.last_message_time),
        type: 'message',
        conversationId: conv.id,
      }));
      setMessageActivities(activities);
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setSendingReply(false);
    }
  };

  const getAvatarColor = (avatar: string) => {
    if (avatar === '📺') return 'bg-indigo-500';
    if (avatar === '📚') return 'bg-blue-500';
    if (avatar === '👥') return 'bg-green-500';
    if (avatar === '✅') return 'bg-emerald-500';
    if (avatar === '🔔') return 'bg-yellow-500';
    // You can add more logic here for different avatar colors
    return 'bg-indigo-500';
  };

  // Helper to reload message activities
  const reloadMessageActivities = async () => {
    try {
      const conversations = await messageService.getConversations();
      const unreadConversations = conversations.filter(conv => conv.unread_count > 0);
      const activities: Activity[] = unreadConversations.slice(0, 5).map((conv: Conversation) => ({
        id: conv.id,
        user: conv.participant_name,
        avatar: conv.participant_name.charAt(0).toUpperCase(),
        action: 'sent you a message',
        content: conv.last_message,
        time: formatTimeAgo(conv.last_message_time),
        type: 'message',
        conversationId: conv.id,
      }));
      setMessageActivities(activities);
    } catch (error) {
      console.error('Error fetching recent messages:', error);
      setMessageActivities([]);
    }
  };

  return (
    <div className="w-full group relative">
      <h2 className="text-lg font-bold text-gray-800 mb-3 px-2">Recent Activity</h2>
      {/* Left Arrow */}
      {page > 0 && (
        <button
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-100"
          style={{ pointerEvents: 'auto' }}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft className="w-6 h-6 text-gray-500" />
        </button>
      )}
      {/* Right Arrow */}
      {page < totalPages - 1 && (
        <button
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-100"
          style={{ pointerEvents: 'auto' }}
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight className="w-6 h-6 text-gray-500" />
        </button>
      )}
      <div className="flex gap-4 overflow-x-hidden pb-2 px-2 hide-scrollbar min-h-[120px]">
        {paginatedActivities.length === 0 ? (
          <div className="flex items-center justify-center text-gray-400 w-full h-24">
            <span className="text-2xl">🕒</span>
            <span className="ml-2">No recent activity</span>
          </div>
        ) : (
          paginatedActivities.map((activity) => (
            <div
              key={activity.id}
              className="min-w-[180px] max-w-[210px] h-[110px] bg-white rounded-xl shadow-md border border-gray-100 flex flex-col items-center p-3 hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => handleActivityClick(activity)}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-base font-bold text-indigo-600">
                  {activity.avatar}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">{activity.time}</span>
                </div>
              </div>
              <div className="text-xs text-gray-700 text-center mb-0.5 font-semibold">
                {activity.user} <span className="font-normal">{activity.action}</span>
              </div>
              {activity.content && (
                <div className="text-xs text-gray-500 text-center italic mb-0.5">
                  {activity.content}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommunityActivity;
