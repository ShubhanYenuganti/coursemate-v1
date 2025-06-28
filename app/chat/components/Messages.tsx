"use client";
import React, { useState, useEffect, useRef } from 'react';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import AddChatModal from './AddChatModal';
import AddFriendModal from './AddFriendModal';
import FriendRequestsDropdown from './FriendRequestsDropdown';
import IncomingCallToast from './IncomingCallToast';
import CallModal from './CallModal';
import { useSocket } from '@/app/context/SocketContext';
import { ChatWithPreview, Message, User } from '../types';
import { messageService, Conversation as ApiConversation, Message as ApiMessage } from '../../../lib/api/messageService';
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

  // Friends & Requests state
  const [addChatUsers, setAddChatUsers] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

  const { socket } = useSocket();

  // --- Data Fetching ---
  const fetchConversations = async () => {
    try {
      const apiConversations = await messageService.getConversations();
      const transformedChats: ChatWithPreview[] = apiConversations.map((conv: ApiConversation) => ({
        id: conv.id,
        participants: [{ id: 'current', name: 'Current User', email: '', status: 'online' as const }, { id: conv.id, name: conv.participant_name, email: '', status: 'offline' as const }],
        lastMessage: { id: 'temp', chatId: conv.id, senderId: 'current', content: conv.last_message, timestamp: conv.last_message_time, type: 'text' as const, status: 'read' as const, isOwn: false },
        unreadCount: conv.unread_count, isActive: conv.is_active, createdAt: conv.last_message_time, updatedAt: conv.last_message_time, preview: conv.last_message, lastMessageTime: conv.last_message_time,
      }));
      setChats(transformedChats);
    } catch (error) { console.error('Error fetching conversations:', error); } finally { setLoading(false); }
  };

  const fetchMessages = async (otherUserId: string) => {
    try {
      const apiMessages = await messageService.getMessages(otherUserId);
      const transformedMessages: Message[] = apiMessages.map((msg: ApiMessage) => ({
        id: msg.id, chatId: otherUserId, senderId: msg.is_own ? 'current' : otherUserId, content: msg.content, timestamp: msg.timestamp, type: 'text' as const, status: 'read' as const, isOwn: msg.is_own,
      }));
      setMessages(transformedMessages);
    } catch (error) { console.error('Error fetching messages:', error); }
  };
  
  const fetchFriendsForNewChat = async () => {
    try {
      const friends = await friendService.getFriendsForNewChat();
      const transformedUsers: User[] = friends.map((friend: Friend) => ({ id: friend.id, name: friend.name, email: friend.email, status: 'online', avatar: '' }));
      setAddChatUsers(transformedUsers);
    } catch (error) { console.error('Error fetching friends for new chat:', error); }
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
  const sendMessage = async (content: string) => {
    if (!selectedChatId) return;
    const response = await messageService.sendMessage({ receiver_id: selectedChatId, message_content: content });
    const newMessage: Message = { id: response.message.id, chatId: selectedChatId, senderId: 'current', content, timestamp: response.message.timestamp, type: 'text', status: 'sent', isOwn: true };
    setMessages(prev => [...prev, newMessage]);
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

  useEffect(() => { selectedChatIdRef.current = selectedChatId; }, [selectedChatId]);

  const selectedChat = selectedChatId ? chats.find(chat => chat.id === selectedChatId) : undefined;

  if (loading) { return <div>Loading...</div>; }

  return (
    <div className="flex h-screen bg-gray-50 relative">
      <ChatList chats={chats} selectedChatId={selectedChatId} pendingRequestCount={pendingRequests.length} onChatSelect={handleChatSelect} onAddChat={handleOpenAddChatModal} onAddFriend={() => setIsAddFriendModalOpen(true)} onToggleFriendRequests={() => setIsFriendRequestsOpen(prev => !prev)} />
      <ChatWindow chat={selectedChat} messages={messages} onSendMessage={sendMessage} onDeleteChat={handleDeleteChat} />
      <AddChatModal isOpen={isAddChatModalOpen} onClose={() => setIsAddChatModalOpen(false)} onStartChat={handleStartChat} users={addChatUsers} />
      <AddFriendModal isOpen={isAddFriendModalOpen} onClose={() => setIsAddFriendModalOpen(false)} onFriendRequestSent={(user) => console.log(`Friend request sent to ${user.name}`)} />
      <FriendRequestsDropdown isOpen={isFriendRequestsOpen} requests={pendingRequests} onAccept={handleAcceptFriendRequest} onDecline={handleDeclineFriendRequest} onClose={() => setIsFriendRequestsOpen(false)} />
      <IncomingCallToast />
      <CallModal />
    </div>
  );
};

export default Messages; 