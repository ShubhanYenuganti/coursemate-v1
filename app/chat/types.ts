export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: string;
}

export interface MaterialPreview {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  thumbnail_path?: string;
  original_filename?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: string;
  type: 'text' | 'material_share';
  status: 'sent' | 'delivered' | 'read';
  isOwn: boolean;
  senderName?: string; // For group messages to show who sent it
  materialPreview?: MaterialPreview;
}

export interface Chat {
  id: string;
  type?: 'direct' | 'group';
  groupName?: string; // For group chats
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatWithPreview extends Chat {
  preview: string;
  lastMessageTime: string;
} 