import React, { useState, useEffect } from 'react';
import { messageService, Conversation } from '../../../lib/api/messageService';
import { notificationService, Notification } from '../../../lib/api/notificationService';
import { friendService } from '../../../lib/api/friendService';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { BookOpen, User, Bell, Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

const defaultActivities: Activity[] = [];

const CommunityActivity: React.FC<CommunityActivityProps> = ({
  activities = [],
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

  const activitiesToDisplay = activities.length > 0 ? activities : allActivities.slice(0, 8);

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

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-semibold text-gray-800">Notifications</h2>
      </div>
      {/* Activity List */}
      {activitiesToDisplay.map(activity => (
        <div
          key={activity.id}
          onClick={() => handleActivityClick(activity)}
          className="flex items-start py-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg"
        >
          {/* Avatar */}
          <div className={`w-8 h-8 ${getAvatarColor(activity.avatar)} rounded-full flex items-center justify-center text-white text-xs font-bold mr-3 flex-shrink-0`}>
            {activity.avatar}
          </div>
          {/* Content */}
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
            
            {/* Course Invite Actions */}
            {activity.type === 'notification' && 
             activity.notificationData?.type === 'course_invite' && 
             !activity.notificationData.is_read && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCourseInviteResponse(activity.notificationData!.id, 'accept');
                  }}
                  className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCourseInviteResponse(activity.notificationData!.id, 'decline');
                  }}
                  className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                >
                  Decline
                </button>
              </div>
            )}

            {/* Friend Request Actions */}
            {activity.type === 'notification' && 
             activity.notificationData?.type === 'friend_request' && 
             !activity.notificationData.is_read && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFriendRequestResponse(activity.notificationData!.id, 'accept');
                  }}
                  className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFriendRequestResponse(activity.notificationData!.id, 'reject');
                  }}
                  className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
      {/* Empty State */}
      {activitiesToDisplay.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📭</div>
          <p className="mb-2">No new notifications</p>
        </div>
      )}
      {loading && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">⏳</div>
          <p className="mb-2">Loading notifications...</p>
        </div>
      )}
            {/* Modal for Activity Details */}
      {modalActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg relative">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={handleCloseModal}
              aria-label="Close"
            >
              &times;
            </button>
            
            {/* Message Header */}
            <div className="flex items-center mb-4">
              <div className={`w-10 h-10 ${getAvatarColor(modalActivity.avatar)} rounded-full flex items-center justify-center text-white text-lg font-bold mr-4`}>
                {modalActivity.avatar}
              </div>
              <div>
                <div className="font-semibold text-gray-800 text-lg">
                  {modalActivity.user}
                </div>
                <div className="text-xs text-gray-500">{modalActivity.time}</div>
              </div>
            </div>
            
            {/* Original Message */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              {modalActivity.content && (
                <div className="text-gray-700 text-base whitespace-pre-line">
                  {modalActivity.content}
                </div>
              )}
            </div>
            
            {/* Reply Section */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">Reply to {modalActivity.user}</div>
              <Textarea
                placeholder="Type your reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[100px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={sendingReply}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sendingReply}
                >
                  {sendingReply ? 'Sending...' : 'Send Reply'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityActivity;
