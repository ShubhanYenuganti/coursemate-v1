import { User, Chat, Message, ChatWithPreview } from './types';

// Mock users
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    avatar: '/avatars/sarah.jpg',
    status: 'online',
  },
  {
    id: '2',
    name: 'Mike Chen',
    email: 'mike.chen@email.com',
    avatar: '/avatars/mike.jpg',
    status: 'away',
    lastSeen: '2024-01-15T10:30:00Z',
  },
  {
    id: '3',
    name: 'Emma Davis',
    email: 'emma.davis@email.com',
    avatar: '/avatars/emma.jpg',
    status: 'offline',
    lastSeen: '2024-01-15T08:15:00Z',
  },
  {
    id: '4',
    name: 'Alex Rodriguez',
    email: 'alex.rodriguez@email.com',
    avatar: '/avatars/alex.jpg',
    status: 'online',
  },
  {
    id: '5',
    name: 'Lisa Wang',
    email: 'lisa.wang@email.com',
    avatar: '/avatars/lisa.jpg',
    status: 'offline',
    lastSeen: '2024-01-14T22:45:00Z',
  },
];

// Current user (you)
export const currentUser: User = {
  id: 'current',
  name: 'Nikhil Sharma',
  email: 'nikhil.sharma@email.com',
  avatar: '/avatars/nikhil.jpg',
  status: 'online',
};

// Mock messages
export const mockMessages: Message[] = [
  // Chat 1 messages
  {
    id: '1',
    chatId: '1',
    senderId: '1',
    content: 'Hey! How did the exam go?',
    timestamp: '2024-01-15T14:30:00Z',
    type: 'text',
    status: 'read',
    isOwn: false,
  },
  {
    id: '2',
    chatId: '1',
    senderId: 'current',
    content: 'It went really well! I think I did great on the essay section.',
    timestamp: '2024-01-15T14:32:00Z',
    type: 'text',
    status: 'read',
    isOwn: true,
  },
  {
    id: '3',
    chatId: '1',
    senderId: '1',
    content: 'That\'s awesome! What was the topic?',
    timestamp: '2024-01-15T14:35:00Z',
    type: 'text',
    status: 'read',
    isOwn: false,
  },
  {
    id: '4',
    chatId: '1',
    senderId: 'current',
    content: 'It was about the impact of technology on education. Pretty interesting stuff!',
    timestamp: '2024-01-15T14:37:00Z',
    type: 'text',
    status: 'delivered',
    isOwn: true,
  },

  // Chat 2 messages
  {
    id: '5',
    chatId: '2',
    senderId: '2',
    content: 'Do you have the notes from yesterday\'s lecture?',
    timestamp: '2024-01-15T13:20:00Z',
    type: 'text',
    status: 'read',
    isOwn: false,
  },
  {
    id: '6',
    chatId: '2',
    senderId: 'current',
    content: 'Yes! I\'ll send them to you in a bit.',
    timestamp: '2024-01-15T13:25:00Z',
    type: 'text',
    status: 'read',
    isOwn: true,
  },

  // Chat 3 messages
  {
    id: '7',
    chatId: '3',
    senderId: '3',
    content: 'Are you going to the study group tomorrow?',
    timestamp: '2024-01-15T12:15:00Z',
    type: 'text',
    status: 'read',
    isOwn: false,
  },
  {
    id: '8',
    chatId: '3',
    senderId: 'current',
    content: 'I\'m not sure yet. What time is it?',
    timestamp: '2024-01-15T12:18:00Z',
    type: 'text',
    status: 'read',
    isOwn: true,
  },
  {
    id: '9',
    chatId: '3',
    senderId: '3',
    content: '3 PM in the library. We\'re going over the calculus problems.',
    timestamp: '2024-01-15T12:20:00Z',
    type: 'text',
    status: 'read',
    isOwn: false,
  },

  // Chat 4 messages
  {
    id: '10',
    chatId: '4',
    senderId: '4',
    content: 'Great job on the presentation today!',
    timestamp: '2024-01-15T11:45:00Z',
    type: 'text',
    status: 'read',
    isOwn: false,
  },
  {
    id: '11',
    chatId: '4',
    senderId: 'current',
    content: 'Thanks! I was really nervous about it.',
    timestamp: '2024-01-15T11:47:00Z',
    type: 'text',
    status: 'read',
    isOwn: true,
  },
  {
    id: '12',
    chatId: '4',
    senderId: '4',
    content: 'You couldn\'t tell at all. Very professional!',
    timestamp: '2024-01-15T11:50:00Z',
    type: 'text',
    status: 'read',
    isOwn: false,
  },

  // Chat 5 messages
  {
    id: '13',
    chatId: '5',
    senderId: '5',
    content: 'Can you help me with the homework?',
    timestamp: '2024-01-14T20:30:00Z',
    type: 'text',
    status: 'read',
    isOwn: false,
  },
  {
    id: '14',
    chatId: '5',
    senderId: 'current',
    content: 'Of course! Which problem are you stuck on?',
    timestamp: '2024-01-14T20:35:00Z',
    type: 'text',
    status: 'read',
    isOwn: true,
  },
];

// Mock chats
export const mockChats: Chat[] = [
  {
    id: '1',
    participants: [currentUser, mockUsers[0]],
    lastMessage: mockMessages[3],
    unreadCount: 0,
    isActive: true,
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-15T14:37:00Z',
  },
  {
    id: '2',
    participants: [currentUser, mockUsers[1]],
    lastMessage: mockMessages[5],
    unreadCount: 0,
    isActive: false,
    createdAt: '2024-01-08T14:00:00Z',
    updatedAt: '2024-01-15T13:25:00Z',
  },
  {
    id: '3',
    participants: [currentUser, mockUsers[2]],
    lastMessage: mockMessages[8],
    unreadCount: 1,
    isActive: false,
    createdAt: '2024-01-05T09:00:00Z',
    updatedAt: '2024-01-15T12:20:00Z',
  },
  {
    id: '4',
    participants: [currentUser, mockUsers[3]],
    lastMessage: mockMessages[11],
    unreadCount: 0,
    isActive: false,
    createdAt: '2024-01-12T16:00:00Z',
    updatedAt: '2024-01-15T11:50:00Z',
  },
  {
    id: '5',
    participants: [currentUser, mockUsers[4]],
    lastMessage: mockMessages[13],
    unreadCount: 0,
    isActive: false,
    createdAt: '2024-01-03T11:00:00Z',
    updatedAt: '2024-01-14T20:35:00Z',
  },
];

// Helper function to get chats with preview
export const getChatsWithPreview = (): ChatWithPreview[] => {
  return mockChats.map(chat => {
    const otherParticipant = chat.participants.find(p => p.id !== currentUser.id);
    const preview = chat.lastMessage?.content || 'No messages yet';
    const lastMessageTime = chat.lastMessage?.timestamp || chat.updatedAt;
    
    return {
      ...chat,
      preview,
      lastMessageTime,
    };
  });
};

// Helper function to get messages for a specific chat
export const getMessagesForChat = (chatId: string): Message[] => {
  return mockMessages
    .filter(message => message.chatId === chatId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

// Helper function to get chat by ID
export const getChatById = (chatId: string): Chat | undefined => {
  return mockChats.find(chat => chat.id === chatId);
}; 