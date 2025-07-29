"use client";
import React, { useState, useEffect, useRef } from 'react';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import AddChatModal from './AddChatModal';
import AddFriendModal from './AddFriendModal';
import FriendRequestsDropdown from './FriendRequestsDropdown';
import IncomingCallToast from './IncomingCallToast';
import CallModal from './CallModal';
import GroupChatModal from './GroupChatModal';
import { useSocket } from '@/app/context/SocketContext';
import { ChatWithPreview, Message, User } from '../types';
import { messageService, Conversation as ApiConversation, Message as ApiMessage, SendGroupMessageRequest } from '../../../lib/api/messageService';
// Extend ApiMessage type to include message_type and sender_name from backend
type ApiMessageWithType = ApiMessage & { 
  message_type?: string;
  sender_name?: string;
};
import { friendService, Friend, PendingRequest } from '../../../lib/api/friendService';

// Type definitions for WebSocket events
interface NewMessageEvent { conversation_id: string; }
interface ConversationDeletedEvent { conversation_id: string; }
interface FriendRequestAcceptedEvent { friend_id: string; friend_name: string; message: string; }

const Messages: React.FC = () => {
  // State management
  const [chats, setChats] = useState<ChatWithPreview[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>();
  const selectedChatIdRef = useRef<string | undefined>(selectedChatId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isAddChatModalOpen, setIsAddChatModalOpen] = useState(false);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [isFriendRequestsOpen, setIsFriendRequestsOpen] = useState(false);
  const [isGroupChatModalOpen, setIsGroupChatModalOpen] = useState(false);

  // Friends & Requests state
  const [addChatUsers, setAddChatUsers] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

  const { socket } = useSocket();

  // --- Data Fetching ---
  const fetchConversations = async () => {
    try {
      const apiConversations = await messageService.getConversations();
      const transformedChats: ChatWithPreview[] = apiConversations.map((conv: ApiConversation) => {
        // Handle both direct and group chats
        if (conv.type === 'group') {
          // Group chat transformation
          const groupParticipants = conv.participant_names?.map((name, index) => ({
            id: `group_participant_${index}`,
            name,
            email: '',
            status: 'offline' as const
          })) || [];
          
          return {
            id: conv.id,
            type: 'group',
            groupName: conv.group_name,
            participants: groupParticipants,
            lastMessage: { 
              id: 'temp', 
              chatId: conv.id, 
              senderId: 'group', 
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
          };
        } else {
          // Direct chat transformation (existing logic)
          return {
            id: conv.id,
            type: 'direct',
            participants: [
              { id: 'current', name: 'Current User', email: '', status: 'online' as const }, 
              { id: conv.id, name: conv.participant_name || 'Unknown', email: '', status: 'offline' as const }
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
          };
        }
      });
      setChats(transformedChats);
    } catch (error) { 
      console.error('Error fetching conversations:', error); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchMessages = async (otherUserId: string) => {
    try {
      const apiMessages = await messageService.getMessages(otherUserId) as ApiMessageWithType[];
      const transformedMessages: Message[] = apiMessages.map((msg) => {
        // Use backend message_type for type, cast to Message type
        let type: 'text' | 'material_share' = 'text';
        if (msg.message_type === 'material_share') type = 'material_share';
        else type = 'text';
        const materialPreview = msg.material_preview ? msg.material_preview : undefined;
        
        const message: Message = {
          id: msg.id,
          chatId: otherUserId,
          senderId: msg.is_own ? 'current' : otherUserId,
          content: msg.message_content || msg.content || '', // Handle both field names and fallback to empty string
          timestamp: msg.timestamp,
          type,
          status: 'read',
          isOwn: msg.is_own,
          ...(msg.sender_name && { senderName: msg.sender_name }), // Include sender name for group messages
          ...(materialPreview && { materialPreview })
        };
        
        return message;
      });
      setMessages(transformedMessages);
    } catch (error) { console.error('Error fetching messages:', error); }
  };
  
  const fetchFriendsForNewChat = async () => {
    try {
      console.log('🔍 [Messages] Fetching friends for new chat (filtered)...');
      // Use the special endpoint that filters out users who already have active chats
      const friends = await friendService.getFriendsForNewChat();
      console.log('✅ [Messages] Filtered friends received:', friends);
      const transformedUsers: User[] = friends.map((friend: Friend) => ({ id: friend.id, name: friend.name, email: friend.email, status: 'online', avatar: '' }));
      setAddChatUsers(transformedUsers);
      console.log('✅ [Messages] Add chat users set:', transformedUsers);
    } catch (error) { 
      console.error('❌ [Messages] Error fetching friends for new chat:', error);
      // Fallback to all friends if the filtered endpoint fails
      try {
        console.log('🔄 [Messages] Falling back to all friends...');
        const allFriends = await friendService.getFriends();
        const transformedUsers: User[] = allFriends.map((friend: Friend) => ({ id: friend.id, name: friend.name, email: friend.email, status: 'online', avatar: '' }));
        setAddChatUsers(transformedUsers);
      } catch (fallbackError) {
        console.error('❌ [Messages] Fallback also failed:', fallbackError);
      }
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const requests = await friendService.getPendingRequests();
      setPendingRequests(requests);
    } catch (error) { console.error("Failed to fetch pending requests:", error); }
  };

  // --- Initial Load ---
  useEffect(() => {
    fetchConversations();
    fetchPendingRequests();
  }, []);
  
  // --- WebSocket Event Listeners ---
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: NewMessageEvent) => {
      fetchConversations();
      if (data.conversation_id === selectedChatIdRef.current) fetchMessages(selectedChatIdRef.current!);
    };
    const handleConversationDeleted = (data: ConversationDeletedEvent) => {
      setChats(prev => prev.filter(chat => chat.id !== data.conversation_id));
      if (selectedChatIdRef.current === data.conversation_id) { setSelectedChatId(undefined); setMessages([]); }
    };
    const handleNewFriendRequest = (data: PendingRequest) => setPendingRequests(prev => [data, ...prev]);
    const handleFriendRequestAccepted = (data: FriendRequestAcceptedEvent) => fetchFriendsForNewChat();

    socket.on("new_message", handleNewMessage);
    socket.on("conversation_deleted", handleConversationDeleted);
    socket.on('new_friend_request', handleNewFriendRequest);
    socket.on('friend_request_accepted', handleFriendRequestAccepted);

    return () => {
        socket.off('new_message', handleNewMessage);
        socket.off('conversation_deleted', handleConversationDeleted);
        socket.off('new_friend_request', handleNewFriendRequest);
        socket.off('friend_request_accepted', handleFriendRequestAccepted);
    };
  }, [socket]);

  // --- UI Handlers ---
  const sendMessage = async (content: string, materialId?: string) => {
    if (!selectedChatId) return;
    
    // Find the selected chat to determine if it's a group or direct chat
    const selectedChat = chats.find(chat => chat.id === selectedChatId);
    
    if (selectedChat?.type === 'group') {
      // Send group message
      const messageData: any = {};
      
      if (materialId) {
        messageData.material_id = materialId;
        if (content) {
          messageData.content = content;
        }
      } else {
        messageData.content = content;
      }
      
      const response = await messageService.sendGroupMessage(selectedChatId, messageData);
      const newMessage: Message = { 
        id: response.message.id, 
        chatId: selectedChatId, 
        senderId: 'current', 
        content: content || `Shared material: ${response.message.material_preview?.name || 'Unknown'}`, 
        timestamp: response.message.timestamp, 
        type: materialId ? 'material_share' : 'text', 
        status: 'sent', 
        isOwn: true,
        ...(materialId && { materialPreview: response.message.material_preview })
      };
      setMessages(prev => [...prev, newMessage]);
    } else {
      // Send direct message (existing logic)
      const messageData: any = { receiver_id: selectedChatId };
      
      if (materialId) {
        messageData.material_id = materialId;
        if (content) {
          messageData.message_content = content;
        }
      } else {
        messageData.message_content = content;
      }
      
      const response = await messageService.sendMessage(messageData);
      const newMessage: Message = { 
        id: response.message.id, 
        chatId: selectedChatId, 
        senderId: 'current', 
        content: content || `Shared material: ${response.message.material_preview?.name || 'Unknown'}`, 
        timestamp: response.message.timestamp, 
        type: materialId ? 'material_share' : 'text', 
        status: 'sent', 
        isOwn: true,
        ...(materialId && { materialPreview: response.message.material_preview })
      };
      setMessages(prev => [...prev, newMessage]);
    }
    
    fetchConversations();
  };

  const handleChatSelect = (chatId: string) => { setSelectedChatId(chatId); fetchMessages(chatId); };
  
  const handleStartChat = async (userId: string) => {
    try {
      const response = await messageService.createConversation({ receiver_id: userId, initial_message: 'Hello!' });
      setSelectedChatId(userId);
      const initialMessage: Message = { id: response.message.id, chatId: userId, senderId: 'current', content: 'Hello!', timestamp: response.message.timestamp, type: 'text', status: 'sent', isOwn: true };
      setMessages([initialMessage]);
      await fetchConversations();
      setIsAddChatModalOpen(false);
    } catch (error) {
      setSelectedChatId(userId); fetchMessages(userId); setIsAddChatModalOpen(false);
    }
  };

  const handleDeleteChat = async () => {
    if (!selectedChatId) return;
    await messageService.deleteConversation(selectedChatId);
    setChats(prev => prev.filter(chat => chat.id !== selectedChatId));
    setSelectedChatId(undefined); setMessages([]);
    fetchConversations();
  };
  
  const handleAcceptFriendRequest = async (requestId: string) => {
    await friendService.respondToFriendRequest(requestId, 'accept');
    setPendingRequests(prev => prev.filter(req => req.request_id !== requestId));
    fetchFriendsForNewChat(); 
  };

  const handleDeclineFriendRequest = async (requestId: string) => {
    await friendService.respondToFriendRequest(requestId, 'reject');
    setPendingRequests(prev => prev.filter(req => req.request_id !== requestId));
  };
  
  const handleOpenAddChatModal = () => { fetchFriendsForNewChat(); setIsAddChatModalOpen(true); };

  const handleCreateGroup = async (groupName: string, selectedUsers: string[]) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/chat-group/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: groupName,  // Fixed: backend expects 'name', not 'group_name'
          member_ids: selectedUsers
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Group created successfully:', data);
        // Refresh conversations to show the new group
        fetchConversations();
        // Set the new group as selected
        setSelectedChatId(data.group.id);
        setMessages([]); // Start with empty messages for new group
        setIsGroupChatModalOpen(false);
      } else {
        const errorData = await response.json();
        console.error('❌ Error creating group:', errorData);
      }
    } catch (error) {
      console.error('❌ Error creating group:', error);
    }
  };

  useEffect(() => { selectedChatIdRef.current = selectedChatId; }, [selectedChatId]);

  const selectedChat = selectedChatId ? chats.find(chat => chat.id === selectedChatId) : undefined;

  if (loading) { return <div>Loading...</div>; }

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
        onCreateGroup={() => setIsGroupChatModalOpen(true)}
      />
      <ChatWindow 
        chat={selectedChat} 
        messages={messages} 
        onSendMessage={sendMessage} 
        onDeleteChat={handleDeleteChat}
        onRefreshConversations={fetchConversations}
      />
      <AddChatModal isOpen={isAddChatModalOpen} onClose={() => setIsAddChatModalOpen(false)} onStartChat={handleStartChat} users={addChatUsers} />
      <AddFriendModal isOpen={isAddFriendModalOpen} onClose={() => setIsAddFriendModalOpen(false)} onFriendRequestSent={(user) => console.log(`Friend request sent to ${user.name}`)} />
      <FriendRequestsDropdown isOpen={isFriendRequestsOpen} requests={pendingRequests} onAccept={handleAcceptFriendRequest} onDecline={handleDeclineFriendRequest} onClose={() => setIsFriendRequestsOpen(false)} />
      <GroupChatModal isOpen={isGroupChatModalOpen} onClose={() => setIsGroupChatModalOpen(false)} onCreateGroup={handleCreateGroup} />
      <IncomingCallToast />
      <CallModal />
    </div>
  );
};

export default Messages; 