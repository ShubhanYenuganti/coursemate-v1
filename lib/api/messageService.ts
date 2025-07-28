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
  type?: 'direct' | 'group';
  participant_name?: string; // For direct chats
  group_name?: string; // For group chats
  participant_names?: string[]; // For group chats
  last_message: string;
  last_message_time: string;
  unread_count: number;
  is_active: boolean;
}

export interface Message {
  id: string;
  user_id?: string;
  sender_id?: string;
  receiver_id?: string;
  timestamp: string;
  message_content?: string;
  content?: string; // Keep both for compatibility
  is_own: boolean;
  sender_name: string;
  receiver_name: string;
  message_type?: string;
  material_id?: string;
  material_preview?: {
    id: string;
    name: string;
    file_type: string;
    file_size: number;
    thumbnail_path?: string;
    original_filename?: string;
    file_path?: string;
    course_id?: string;
  };
}

export interface SendMessageRequest {
  receiver_id: string;
  message_content?: string;
  material_id?: string;
}

export interface SendGroupMessageRequest {
  content?: string;
  material_id?: string;
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
    material_preview?: {
      id: string;
      name: string;
      file_type: string;
      file_size: number;
      thumbnail_path?: string;
      original_filename?: string;
    };
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

  // Send a message to a group chat
  async sendGroupMessage(groupId: string, data: SendGroupMessageRequest): Promise<SendMessageResponse> {
    try {
      const response = await fetchWithAuth(`/api/chat-group/${groupId}/send`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response;
    } catch (error) {
      console.error('Error sending group message:', error);
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

  // Group Chat Management Functions
  
  // Delete a group chat
  async deleteGroupChat(groupId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetchWithAuth(`/api/chat-group/${groupId}/delete`, {
        method: 'DELETE',
      });
      return response;
    } catch (error) {
      console.error('Error deleting group chat:', error);
      throw error;
    }
  },

  // Get group members
  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    try {
      const response = await fetchWithAuth(`/api/chat-group/${groupId}/members`);
      return response.members || [];
    } catch (error) {
      console.error('Error fetching group members:', error);
      throw error;
    }
  },

  // Add members to group
  async addGroupMembers(groupId: string, userIds: string[]): Promise<{ success: boolean; message: string; added_members: any[]; existing_members: string[] }> {
    try {
      const response = await fetchWithAuth(`/api/chat-group/${groupId}/members/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_ids: userIds }),
      });
      return response;
    } catch (error) {
      console.error('Error adding group members:', error);
      throw error;
    }
  },

  // Remove member from group
  async removeGroupMember(groupId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetchWithAuth(`/api/chat-group/${groupId}/members/${userId}/remove`, {
        method: 'DELETE',
      });
      return response;
    } catch (error) {
      console.error('Error removing group member:', error);
      throw error;
    }
  },
}; 

// Group member interface
export interface GroupMember {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: 'admin' | 'member';
  joined_at: string;
  is_current_user: boolean;
} 