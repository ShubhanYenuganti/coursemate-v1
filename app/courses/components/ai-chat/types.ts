// Legacy types (kept for compatibility)
export interface AIConversation {
  id: string;
  title: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AIMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  sources?: AISource[];
}

export interface AISource {
  title: string;
  page?: number;
  timestamp?: string;
  type: 'pdf' | 'video' | 'document';
}

export interface QuickPrompt {
  icon: React.ComponentType<any>;
  text: string;
  category: string;
}

// New conversation system types
export interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  source_files?: (string | { title: string })[];
  confidence?: number;
}

export interface Conversation {
  id: string;
  title: string;
  course_id: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_preview?: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  message_type: 'user' | 'assistant';
  content: string;
  metadata?: {
    source_files?: (string | { title: string })[];
    confidence?: number;
    tokens_used?: number;
  };
  created_at: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: ConversationMessage[];
}

// API Request/Response types
export interface CreateConversationRequest {
  title: string;
  course_id: string;
}

export interface SendMessageRequest {
  message: string;
  conversation_id: string;
  course_id: string;
}

export interface SendMessageResponse {
  success: boolean;
  message?: ConversationMessage;
  error?: string;
  confidence?: number;
}

export interface ConversationListResponse {
  success: boolean;
  conversations: Conversation[];
  error?: string;
}

export interface ConversationDetailResponse {
  success: boolean;
  conversation?: ConversationWithMessages;
  error?: string;
}
