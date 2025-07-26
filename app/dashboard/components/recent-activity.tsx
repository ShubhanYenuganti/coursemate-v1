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
  const [showModal, setShowModal] = useState(false);
  const activitiesToShow = activities.length > 0 ? activities : [...messageActivities, ...notificationActivities];
  const visibleActivities = activitiesToShow.slice(0, 2);

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

  // Only show the most recent 10 activities for the horizontal feed
  const activitiesToDisplay = activities.length > 0 ? activities : allActivities.slice(0, 10);

  const totalPages = Math.ceil(activitiesToDisplay.length / CARDS_PER_PAGE);
  const paginatedActivities = activitiesToDisplay.slice(page * CARDS_PER_PAGE, (page + 1) * CARDS_PER_PAGE);

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

  const pastelAvatarColors = ['bg-[#E0D7FB]', 'bg-[#D0E7FB]', 'bg-[#D0FBE7]'];

  return (
    <div className="bg-indigo-100 w-full rounded-2xl shadow-lg border border-[#ECE6FA] bg-[#F3F0FF] flex flex-col justify-center min-h-[180px] max-h-[220px] p-0 relative">
      <div className="flex flex-row items-center justify-between px-6 pt-4 pb-1">
        <h2 className="text-base font-bold text-gray-800">Recent Activity</h2>
        <button
          className="text-gray-400 hover:text-gray-700 text-xl px-2 py-1 rounded transition"
          aria-label="Show all recent activity"
          onClick={() => setShowModal(true)}
        >
          &#8230;
        </button>
      </div>
      <div className="flex flex-col gap-0.5 px-6 pb-4 h-full items-start">
        {visibleActivities.length === 0 ? (
          <div className="flex items-center justify-center text-gray-400 w-full h-20">
            <span className="text-2xl">🕒</span>
            <span className="ml-2">No recent activity</span>
          </div>
        ) : (
          visibleActivities.map((activity, idx, arr) => {
            const avatarBg = pastelAvatarColors[idx % pastelAvatarColors.length];
            return (
              <div key={activity.id} className="flex flex-row items-start w-full gap-3 py-1.5 relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[#6C4AB6] text-sm shadow ${avatarBg}`}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {activity.avatar}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span className="text-[11px] text-gray-400 mb-0.5">{activity.time}</span>
                  <div className="text-[15px] text-gray-900 font-bold truncate">
                    {activity.user && <span className="font-bold text-gray-900">{activity.user}</span>}
                    {activity.action && <span className="font-normal text-gray-700 ml-1">{activity.action}</span>}
                    {activity.target && <span className="font-medium text-blue-600 ml-1 underline cursor-pointer">{activity.target}</span>}
                  </div>
                  {activity.content && (
                    <div className="text-xs text-gray-500 truncate mt-0.5">{activity.content}</div>
                  )}
                </div>
                {/* Divider except for last item */}
                {idx < arr.length - 1 && <div className="absolute left-11 right-0 bottom-0 border-b border-[#ECE6FA]" />}
              </div>
            );
          })
        )}
      </div>
      {/* Modal for all activities */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">All Recent Activity</h2>
              <button
                className="text-gray-400 hover:text-gray-700 text-2xl px-2 py-1 rounded transition"
                aria-label="Close activity modal"
                onClick={() => setShowModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2">
              {activitiesToShow.length === 0 ? (
                <div className="flex items-center justify-center text-gray-400 w-full h-20">
                  <span className="text-2xl">🕒</span>
                  <span className="ml-2">No recent activity</span>
                </div>
              ) : (
                activitiesToShow.map((activity, idx) => {
                  const avatarColors = ['bg-purple-400', 'bg-blue-400', 'bg-green-400'];
                  const avatarBg = avatarColors[idx % avatarColors.length];
                  return (
                    <div key={activity.id} className="flex flex-row items-start w-full gap-3 py-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm shadow ${avatarBg}`}
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        {activity.avatar}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <span className="text-xs text-gray-400 mb-0.5">{activity.time}</span>
                        <div className="text-sm text-gray-900 font-semibold truncate">
                          {activity.user && <span className="font-semibold text-gray-900">{activity.user}</span>}
                          {activity.action && <span className="font-normal text-gray-700 ml-1">{activity.action}</span>}
                          {activity.target && <span className="font-medium text-blue-600 ml-1 underline cursor-pointer">{activity.target}</span>}
                        </div>
                        {activity.content && (
                          <div className="text-xs text-gray-500 truncate mt-0.5">{activity.content}</div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityActivity;
