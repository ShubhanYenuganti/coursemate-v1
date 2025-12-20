// API service for conversation management

import {
  Conversation,
  ConversationWithMessages,
  CreateConversationRequest,
  SendMessageRequest,
  SendMessageResponse,
  ConversationListResponse,
  ConversationDetailResponse,
} from './types';

class ConversationService {
  // Use environment variable for backend URL, fallback to empty string (paths include /api)
  private baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.BACKEND_URL || '';

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getConversations(courseId: string): Promise<Conversation[]> {
    const response = await this.makeRequest<ConversationListResponse>(
      `/api/conversations/${courseId}/conversations`
    );
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch conversations');
    }
    
    return response.conversations;
  }

  async getConversation(conversationId: string): Promise<ConversationWithMessages> {
    const response = await this.makeRequest<ConversationDetailResponse>(
      `/api/conversations/${conversationId}`
    );
    
    if (!response.success || !response.conversation) {
      throw new Error(response.error || 'Failed to fetch conversation');
    }
    
    return response.conversation;
  }

  async createConversation(data: CreateConversationRequest): Promise<Conversation> {
    const response = await this.makeRequest<{ success: boolean; conversation?: Conversation; error?: string }>(
      `/api/conversations/${data.course_id}/conversations`,
      {
        method: 'POST',
        body: JSON.stringify({ title: data.title }),
      }
    );
    
    if (!response.success || !response.conversation) {
      throw new Error(response.error || 'Failed to create conversation');
    }
    
    return response.conversation;
  }

  async updateConversation(conversationId: string, title: string): Promise<Conversation> {
    const response = await this.makeRequest<{ success: boolean; conversation?: Conversation; error?: string }>(
      `/api/conversations/${conversationId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ title }),
      }
    );
    
    if (!response.success || !response.conversation) {
      throw new Error(response.error || 'Failed to update conversation');
    }
    
    return response.conversation;
  }

  async deleteConversation(conversationId: string): Promise<void> {
    const response = await this.makeRequest<{ success: boolean; error?: string }>(
      `/api/conversations/${conversationId}`,
      {
        method: 'DELETE',
      }
    );
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete conversation');
    }
  }

  async sendMessage(data: SendMessageRequest): Promise<SendMessageResponse> {
    const response = await this.makeRequest<SendMessageResponse>(
      `/api/conversations/${data.conversation_id}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          message: data.message,
          course_id: data.course_id,
        }),
      }
    );
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to send message');
    }
    
    return response;
  }
}

export const conversationService = new ConversationService();
