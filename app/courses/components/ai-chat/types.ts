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
