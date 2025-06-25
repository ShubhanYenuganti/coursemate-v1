"use client";
import React, { useState, useEffect } from 'react';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import AddChatModal from './AddChatModal';
import AddFriendModal from './AddFriendModal';
import { ChatWithPreview, Message, Chat, User } from '../types';
import { messageService, User as ApiUser, Conversation as ApiConversation, Message as ApiMessage } from '../../../lib/api/messageService';

const Messages: React.FC = () => {
  const [chats, setChats] = useState<ChatWithPreview[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>();
  const [isAddChatModalOpen, setIsAddChatModalOpen] = useState(false);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch users for add chat functionality
  const fetchUsers = async () => {
    try {
      const apiUsers = await messageService.getUsers();
      const transformedUsers: User[] = apiUsers.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        avatar: user.avatar,
      }));
      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
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
    fetchUsers();
    fetchConversations();
  }, []);

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
    <div className="flex h-screen bg-gray-50">
      <ChatList
        chats={chats}
        selectedChatId={selectedChatId}
        onChatSelect={handleChatSelect}
        onAddChat={() => setIsAddChatModalOpen(true)}
        onAddFriend={() => setIsAddFriendModalOpen(true)}
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
        users={users}
      />

      <AddFriendModal
        isOpen={isAddFriendModalOpen}
        onClose={() => setIsAddFriendModalOpen(false)}
        onAddFriend={handleAddFriend}
      />
    </div>
  );
};

export default Messages; 