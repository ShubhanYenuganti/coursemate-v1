"use client";
import React, { useState, useEffect, useRef } from 'react';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import AddChatModal from './AddChatModal';
import AddFriendModal from './AddFriendModal';
import FriendRequestsDropdown from './FriendRequestsDropdown';
import { ChatWithPreview, Message, Chat, User } from '../types';
import { messageService, Conversation as ApiConversation, Message as ApiMessage } from '../../../lib/api/messageService';
import { friendService, Friend, PendingRequest } from '../../../lib/api/friendService';
// @ts-ignore
import { io, Socket } from 'socket.io-client';

const socketUrl = "http://localhost:5173";

interface NewMessageEvent {
  conversation_id: string;
  // add other fields if needed
}

interface ConversationDeletedEvent {
  conversation_id: string;
}

interface FriendRequestAcceptedEvent {
    friend_id: string;
    friend_name: string;
    message: string;
}

const Messages: React.FC = () => {
  const [chats, setChats] = useState<ChatWithPreview[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>();
  const selectedChatIdRef = useRef<string | undefined>(selectedChatId);
  const [isAddChatModalOpen, setIsAddChatModalOpen] = useState(false);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [isFriendRequestsOpen, setIsFriendRequestsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [addChatUsers, setAddChatUsers] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const [localUserId, setLocalUserId] = useState<string | undefined>(undefined);

  // Fetch users for add chat functionality
  const fetchFriendsForNewChat = async () => {
    try {
      const friends = await friendService.getFriendsForNewChat();
      const transformedUsers: User[] = friends.map((friend: Friend) => ({
        id: friend.id,
        name: friend.name,
        email: friend.email,
        status: 'online', // Default status, can be improved
        avatar: '', // Default avatar
      }));
      setAddChatUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching friends for new chat:', error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const requests = await friendService.getPendingRequests();
      setPendingRequests(requests);
    } catch (error) {
      console.error("Failed to fetch pending requests:", error);
    }
  };

  const handleAcceptFriendRequest = async (requestId: string) => {
    try {
      await friendService.respondToFriendRequest(requestId, 'accept');
      setPendingRequests(prev => prev.filter(req => req.request_id !== requestId));
      // Refresh the list of friends available for a new chat
      fetchFriendsForNewChat(); 
    } catch (error) {
      console.error("Failed to accept friend request:", error);
    }
  };

  const handleDeclineFriendRequest = async (requestId: string) => {
    try {
      await friendService.respondToFriendRequest(requestId, 'reject');
      setPendingRequests(prev => prev.filter(req => req.request_id !== requestId));
    } catch (error) {
      console.error("Failed to decline friend request:", error);
    }
  };

  const handleOpenAddChatModal = () => {
    fetchFriendsForNewChat(); // Refetch the list of friends you can chat with
    setIsAddChatModalOpen(true);
  };

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const apiConversations = await messageService.getConversations();
      
      // Transform conversations to ChatWithPreview format
      const transformedChats: ChatWithPreview[] = apiConversations.map((conv: ApiConversation) => ({
        id: conv.id,
        participants: [
          { id: 'current', name: 'Current User', email: '', status: 'online' as const },
          { id: conv.id, name: conv.participant_name, email: '', status: 'offline' as const }
        ],
        lastMessage: {
          id: 'temp',
          chatId: conv.id,
          senderId: 'current',
          content: conv.last_message,
          timestamp: conv.last_message_time,
          type: 'text' as const,
          status: 'read' as const,
          isOwn: false
        },
        unreadCount: conv.unread_count,
        isActive: conv.is_active,
        createdAt: conv.last_message_time,
        updatedAt: conv.last_message_time,
        preview: conv.last_message,
        lastMessageTime: conv.last_message_time,
      }));
      setChats(transformedChats);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a specific conversation
  const fetchMessages = async (otherUserId: string) => {
    try {
      const apiMessages = await messageService.getMessages(otherUserId);
      
      // Transform messages to Message format
      const transformedMessages: Message[] = apiMessages.map((msg: ApiMessage) => ({
        id: msg.id,
        chatId: otherUserId,
        senderId: msg.is_own ? 'current' : otherUserId,
        content: msg.content,
        timestamp: msg.timestamp,
        type: 'text' as const,
        status: 'read' as const,
        isOwn: msg.is_own,
      }));
      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Send a message
  const sendMessage = async (content: string) => {
    if (!selectedChatId) return;

    try {
      const response = await messageService.sendMessage({
        receiver_id: selectedChatId,
        message_content: content,
      });

      // Add the new message to the current messages
      const newMessage: Message = {
        id: response.message.id,
        chatId: selectedChatId,
        senderId: 'current',
        content: content,
        timestamp: response.message.timestamp,
        type: 'text',
        status: 'sent',
        isOwn: true,
      };

      setMessages(prev => [...prev, newMessage]);

      // Refresh conversations to update the last message
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Handle chat selection
  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
    fetchMessages(chatId);
  };

  // Handle starting a new chat
  const handleStartChat = async (userId: string) => {
    try {
      // Create a new conversation with an initial message
      const response = await messageService.createConversation({
        receiver_id: userId,
        initial_message: 'Hello! I started a new conversation with you.',
      });

      // Set the selected chat to the new conversation
      setSelectedChatId(userId);
      
      // Add the initial message to the messages list
      const initialMessage: Message = {
        id: response.message.id,
        chatId: userId,
        senderId: 'current',
        content: 'Hello! I started a new conversation with you.',
        timestamp: response.message.timestamp,
        type: 'text',
        status: 'sent',
        isOwn: true,
      };
      
      setMessages([initialMessage]);
      
      // Refresh conversations to show the new conversation
      await fetchConversations();
      
      // Close the modal
      setIsAddChatModalOpen(false);
    } catch (error) {
      console.error('Error creating conversation:', error);
      // If conversation already exists, just select it
      setSelectedChatId(userId);
      fetchMessages(userId);
      setIsAddChatModalOpen(false);
    }
  };

  // Handle adding a friend
  const handleAddFriend = (email: string) => {
    console.log('Friend request sent to:', email);
    // TODO: Implement friend request functionality
  };

  // Handle deleting a chat
  const handleDeleteChat = async () => {
    if (!selectedChatId) return;
    try {
      await messageService.deleteConversation(selectedChatId);
      // Remove the chat from the list
      setChats(prev => prev.filter(chat => chat.id !== selectedChatId));
      // Clear selected chat and messages
      setSelectedChatId(undefined);
      setMessages([]);
      // Optionally, refresh conversations from backend
      fetchConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchFriendsForNewChat();
    fetchConversations();
    fetchPendingRequests();
  }, []);

  // Ensure user_id is set in localStorage before connecting socket
  useEffect(() => {
    const ensureUserId = async () => {
      let userId = localStorage.getItem('user_id');
      if (!userId) {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const res = await fetch('/api/users/me', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              const data = await res.json();
              userId = data.id;
              if (typeof userId === 'string') {
                localStorage.setItem('user_id', userId);
              }
            }
          } catch (err) {
            console.error('Failed to fetch user_id:', err);
          }
        }
      }
      setLocalUserId(typeof userId === 'string' ? userId : undefined);
    };
    ensureUserId();
  }, []);

  useEffect(() => {
    if (!localUserId || typeof localUserId !== 'string') return; // Wait until user_id is set and is a string
    const socket = io(socketUrl, { transports: ["websocket"] });
    socket.emit("join", { user_id: localUserId });

    socket.on("new_message", (data: NewMessageEvent) => {
      console.log("Received new_message event:", data, "selectedChatIdRef:", selectedChatIdRef.current);
      fetchConversations();
      if (data.conversation_id === selectedChatIdRef.current) {
        fetchMessages(selectedChatIdRef.current!);
      }
    });

    socket.on("conversation_deleted", (data: ConversationDeletedEvent) => {
      console.log("Received conversation_deleted event:", data);
      // Remove the chat from the list
      setChats(prevChats => prevChats.filter(chat => chat.id !== data.conversation_id));
      
      // If the deleted chat is the currently open one, clear the view
      if (selectedChatIdRef.current === data.conversation_id) {
        setSelectedChatId(undefined);
        setMessages([]);
      }
    });

    socket.on('new_friend_request', (data: PendingRequest) => {
      console.log('Received new_friend_request event:', data);
      setPendingRequests(prev => [data, ...prev]);
    });
    
    socket.on('friend_request_accepted', (data: FriendRequestAcceptedEvent) => {
        console.log('Friend request accepted event:', data);
        // Maybe show a toast notification here in the future
        fetchFriendsForNewChat(); // Refresh list of friends you can chat with
    });

    socket.on('connect', () => {
      console.log('WebSocket connected!');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected!');
    });

    socket.onAny((event: string, ...args: any[]) => {
      console.log("[SOCKET EVENT]", event, args);
    });

    // Only disconnect on unmount
    return () => {
      console.log('Cleaning up WebSocket connection...');
      socket.disconnect();
    };
  }, [localUserId]); // Re-run if user_id changes

  // Keep the ref in sync with state
  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  // Get the selected chat object
  const selectedChat = selectedChatId ? chats.find(chat => chat.id === selectedChatId) : undefined;

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 relative">
      <ChatList
        chats={chats}
        selectedChatId={selectedChatId}
        pendingRequestCount={pendingRequests.length}
        onChatSelect={handleChatSelect}
        onAddChat={handleOpenAddChatModal}
        onAddFriend={() => setIsAddFriendModalOpen(true)}
        onToggleFriendRequests={() => setIsFriendRequestsOpen(prev => !prev)}
      />
      
      <ChatWindow
        chat={selectedChat}
        messages={messages}
        onSendMessage={sendMessage}
        onDeleteChat={handleDeleteChat}
      />

      <AddChatModal
        isOpen={isAddChatModalOpen}
        onClose={() => setIsAddChatModalOpen(false)}
        onStartChat={handleStartChat}
        users={addChatUsers}
      />

      <AddFriendModal
        isOpen={isAddFriendModalOpen}
        onClose={() => setIsAddFriendModalOpen(false)}
        onFriendRequestSent={(user) => {
          console.log(`Friend request sent to ${user.name}`);
          // You could add a toast notification here
        }}
      />

      <FriendRequestsDropdown
        isOpen={isFriendRequestsOpen}
        requests={pendingRequests}
        onAccept={handleAcceptFriendRequest}
        onDecline={handleDeclineFriendRequest}
        onClose={() => setIsFriendRequestsOpen(false)}
      />
    </div>
  );
};

export default Messages; 