import { fetchWithAuth } from '../api-utils';

export interface User {
  id: string;
  name: string;
  email: string;
  status: 'online' | 'offline' | 'away';
  avatar?: string;
}

export interface Conversation {
  id: string;
  participant_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  is_active: boolean;
}

export interface Message {
  id: string;
  content: string;
  timestamp: string;
  is_own: boolean;
  sender_name: string;
  receiver_name: string;
}

export interface SendMessageRequest {
  receiver_id: string;
  message_content: string;
}

export interface CreateConversationRequest {
  receiver_id: string;
  initial_message: string;
}

export interface SendMessageResponse {
  success: boolean;
  message: {
    id: string;
    user_id: string;
    sender_id: string;
    receiver_id: string;
    timestamp: string;
    message_content: string;
    sender_name: string;
    receiver_name: string;
  };
}

export interface CreateConversationResponse {
  success: boolean;
  message: {
    id: string;
    user_id: string;
    sender_id: string;
    receiver_id: string;
    timestamp: string;
    message_content: string;
    sender_name: string;
    receiver_name: string;
  };
  conversation_id: string;
}

export const messageService = {
  // Get all users for add chat functionality
  async getUsers(): Promise<User[]> {
    try {
      const response = await fetchWithAuth('/api/messages/users');
      return response.users || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  // Get all conversations for the current user
  async getConversations(): Promise<Conversation[]> {
    try {
      const response = await fetchWithAuth('/api/messages/conversations');
      return response.conversations || [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  },

  // Create a new conversation with an initial message
  async createConversation(data: CreateConversationRequest): Promise<CreateConversationResponse> {
    try {
      const response = await fetchWithAuth('/api/messages/create-conversation', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  },

  // Get messages between current user and another user
  async getMessages(otherUserId: string): Promise<Message[]> {
    try {
      const response = await fetchWithAuth(`/api/messages/messages/${otherUserId}`);
      return response.messages || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  },

  // Send a message to another user
  async sendMessage(data: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      const response = await fetchWithAuth('/api/messages/send', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Delete a conversation and all its messages
  async deleteConversation(otherUserId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetchWithAuth(`/api/messages/conversation/${otherUserId}`, {
        method: 'DELETE',
      });
      return response;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  },
}; 