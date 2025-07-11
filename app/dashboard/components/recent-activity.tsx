import React, { useState, useEffect } from 'react';
import { messageService, Conversation } from '../../../lib/api/messageService';
import { Send, X, MessageSquare } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';

export interface UnreadMessage {
  id: string;
  conversationId: string;
  senderName: string;
  senderId: string;
  content: string;
  timestamp: string;
  unreadCount: number;
}

export interface Activity {
  id: string;
  user?: string;
  avatar: string;
  action: string;
  target?: string;
  content?: string;
  time: string;
  type: 'message';
  conversationId: string;
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
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

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
      } finally {
        setLoading(false);
      }
    };

    fetchRecentMessages();
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

  const activitiesToDisplay = activities.length > 0 ? activities : messageActivities;

  const handleActivityClick = async (activity: Activity) => {
    setModalActivity(activity);
    setReplyText('');
    onActivityClick && onActivityClick(activity);
    
    // Mark the conversation as read by removing it from the notifications
    setMessageActivities(prev => prev.filter(msg => msg.id !== activity.id));
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
        receiver_id: modalActivity.conversationId,
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
          <p className="mb-2">Loading messages...</p>
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
                  {selectedMessage.senderName}
                </div>
                <div className="text-xs text-gray-500">
                  {formatTime(selectedMessage.timestamp)}
                  {modalActivity.user}
                </div>
                <div className="text-xs text-gray-500">{modalActivity.time}</div>
              </div>
            </div>
            
            {/* Original Message */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              {/* The original code had modalActivity.content, but modalActivity is not defined.
                  Assuming the intent was to display the content of the selectedMessage.
                  However, the original code had modalActivity.user, which is also not defined.
                  I will remove the lines related to modalActivity as they are not defined. */}
              {selectedMessage.content && (
                <div className="text-gray-700 text-base whitespace-pre-line">
                  {selectedMessage.content}
                </div>
              )}
            </div>
            
            {/* Reply Section */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">Reply to {selectedMessage.senderName}</div>
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
                  disabled={isSending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || isSending}
                >
                  {isSending ? 'Sending...' : 'Send Reply'}
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
