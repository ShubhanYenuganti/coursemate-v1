import React, { useState, useEffect } from 'react';
import { messageService, Conversation } from '../../../lib/api/messageService';
import { Send, X, MessageSquare } from 'lucide-react';

export interface UnreadMessage {
  id: string;
  conversationId: string;
  senderName: string;
  senderId: string;
  content: string;
  timestamp: string;
  unreadCount: number;
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';

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

interface NotificationsCenterProps {
  onFilterChange?: (filter: string) => void;
  onActivityClick?: (activity: any) => void;
}

const NotificationsCenter: React.FC<NotificationsCenterProps> = ({
  onFilterChange,
  onActivityClick,
}) => {
  const [unreadMessages, setUnreadMessages] = useState<UnreadMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<UnreadMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Fetch unread messages
  const fetchUnreadMessages = async () => {
    try {
      setIsLoading(true);
      const conversations = await messageService.getConversations();
      
      // Filter conversations with unread messages
      const unreadConversations = conversations.filter(conv => conv.unread_count > 0);
      
      // Transform to UnreadMessage format
      const messages: UnreadMessage[] = unreadConversations.map(conv => ({
        id: conv.id,
        conversationId: conv.id,
        senderName: conv.participant_name,
        senderId: conv.id,
        content: conv.last_message,
        timestamp: conv.last_message_time,
        unreadCount: conv.unread_count
      }));
      
      setUnreadMessages(messages);
    } catch (error) {
      console.error('Error fetching unread messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadMessages();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadMessages, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMessageClick = (message: UnreadMessage) => {
    setSelectedMessage(message);
    setReplyText('');
  };

  const handleCloseModal = () => {
    setSelectedMessage(null);
    setReplyText('');
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;

    try {
      setIsSending(true);
      await messageService.sendMessage({
        receiver_id: selectedMessage.senderId,
        message_content: replyText.trim()
      });
      
      // Remove the message from unread list since user has responded
      setUnreadMessages(prev => prev.filter(msg => msg.id !== selectedMessage.id));
      handleCloseModal();
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-semibold text-gray-800">Notifications</h2>
        </div>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-semibold text-gray-800">Notifications</h2>
        {unreadMessages.length > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            {unreadMessages.length}
          </span>
        )}
      </div>

      {/* Unread Messages List */}
      {unreadMessages.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="mb-2">No new messages</p>
          <p className="text-xs">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {unreadMessages.map(message => (
            <div
              key={message.id}
              onClick={() => handleMessageClick(message)}
              className="flex items-start py-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg"
            >
              {/* Avatar */}
              <div className={`w-8 h-8 ${getAvatarColor(message.senderName)} rounded-full flex items-center justify-center text-white text-xs font-bold mr-3 flex-shrink-0`}>
                {getInitials(message.senderName)}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {message.senderName}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 truncate">
                    {message.content}
                  </p>
                  {message.unreadCount > 0 && (
                    <span className="ml-2 flex-shrink-0 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {message.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Message Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
              onClick={handleCloseModal}
            >
              <X className="w-6 h-6" />
            </button>
            
            {/* Message Header */}
            <div className="flex items-center mb-4">
              <div className={`w-10 h-10 ${getAvatarColor(selectedMessage.senderName)} rounded-full flex items-center justify-center text-white text-lg font-bold mr-4`}>
                {getInitials(selectedMessage.senderName)}
              </div>
              <div>
                <div className="font-semibold text-gray-800 text-lg">
                  {selectedMessage.senderName}
                </div>
                <div className="text-xs text-gray-500">
                  {formatTime(selectedMessage.timestamp)}
                  {modalActivity.user}
                </div>
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

export default NotificationsCenter;
