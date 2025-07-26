"use client"

import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Search, Filter, TrendingUp, Clock, CheckCircle2, Pin, Users, Tag } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuestionFeed } from './QuestionFeed';
import { CreatePostModal } from './CreatePostModal';
import { QuestionDetail } from './QuestionDetail';
import { CommunitySearch } from './CommunitySearch';

interface CommunityTabProps {
  courseId: string;
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  type: 'question' | 'discussion' | 'study-group' | 'resource-sharing' | 'help-wanted';
  author: {
    id: string;
    name: string;
    role: 'student' | 'ta' | 'tutor' | 'mentor';
    avatar?: string;
    reputation?: number;
  };
  createdAt: string;
  updatedAt: string;
  tags: string[];
  upvotes: number;
  downvotes: number;
  answerCount: number;
  viewCount: number;
  isPinned: boolean;
  isResolved: boolean;
  hasAcceptedAnswer: boolean;
  lastActivity: string;
}

export interface ForumAnswer {
  id: string;
  postId: string;
  content: string;
  author: {
    id: string;
    name: string;
    role: 'student' | 'ta' | 'tutor' | 'mentor';
    avatar?: string;
    reputation?: number;
  };
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  downvotes: number;
  isAccepted: boolean;
  isHelpful: boolean;
}

export default function CommunityTab({ courseId }: CommunityTabProps) {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [activeTab, setActiveTab] = useState('all');

  // Mock data for development
  useEffect(() => {
    const mockPosts: ForumPost[] = [
      {
        id: '1',
        title: 'How do I approach the binary search tree assignment?',
        content: 'I\'m having trouble understanding how to implement the insert method for BST. Can someone explain the recursive approach?',
        type: 'question',
        author: {
          id: 'user1',
          name: 'Alice Johnson',
          role: 'student',
          avatar: '/placeholder-user.jpg',
          reputation: 125
        },
        createdAt: '2024-03-15T10:30:00Z',
        updatedAt: '2024-03-15T10:30:00Z',
        tags: ['data-structures', 'binary-tree', 'help-needed'],
        upvotes: 12,
        downvotes: 1,
        answerCount: 3,
        viewCount: 45,
        isPinned: false,
        isResolved: true,
        hasAcceptedAnswer: true,
        lastActivity: '2024-03-15T14:22:00Z'
      },
      {
        id: '2',
        title: 'Free online resources for Data Structures practice',
        content: 'I found some amazing free resources for practicing data structures problems. LeetCode, HackerRank, and this GitHub repo with 200+ problems. Would love to hear what others are using!',
        type: 'resource-sharing',
        author: {
          id: 'user5',
          name: 'Sarah Kim',
          role: 'ta',
          avatar: '/placeholder-user.jpg',
          reputation: 890
        },
        createdAt: '2024-03-14T09:00:00Z',
        updatedAt: '2024-03-14T09:00:00Z',
        tags: ['resources', 'practice', 'helpful'],
        upvotes: 28,
        downvotes: 0,
        answerCount: 12,
        viewCount: 156,
        isPinned: true,
        isResolved: false,
        hasAcceptedAnswer: false,
        lastActivity: '2024-03-14T16:45:00Z'
      },
      {
        id: '3',
        title: 'Study group for Algorithm Design patterns?',
        content: 'Anyone interested in forming a study group to go over the algorithm design patterns? We could meet twice a week via Discord to discuss problems and solutions. I\'m thinking Tuesdays and Thursdays 7-8 PM EST.',
        type: 'study-group',
        author: {
          id: 'user2',
          name: 'Mike Chen',
          role: 'student',
          avatar: '/placeholder-user.jpg',
          reputation: 245
        },
        createdAt: '2024-03-13T15:20:00Z',
        updatedAt: '2024-03-13T15:20:00Z',
        tags: ['study-group', 'algorithms', 'collaboration'],
        upvotes: 15,
        downvotes: 0,
        answerCount: 8,
        viewCount: 67,
        isPinned: false,
        isResolved: false,
        hasAcceptedAnswer: false,
        lastActivity: '2024-03-15T11:30:00Z'
      },
      {
        id: '4',
        title: 'Quick question about Big O notation',
        content: 'Is O(n log n) better or worse than O(n²)? I keep getting confused about this.',
        type: 'question',
        author: {
          id: 'user3',
          name: 'Emma Davis',
          role: 'student',
          avatar: '/placeholder-user.jpg',
          reputation: 67
        },
        createdAt: '2024-03-15T08:15:00Z',
        updatedAt: '2024-03-15T08:15:00Z',
        tags: ['big-o', 'complexity', 'theory'],
        upvotes: 6,
        downvotes: 0,
        answerCount: 2,
        viewCount: 23,
        isPinned: false,
        isResolved: true,
        hasAcceptedAnswer: true,
        lastActivity: '2024-03-15T09:45:00Z'
      },
      {
        id: '5',
        title: 'Looking for a study buddy for final project',
        content: 'Working on the final project (building a web scraper) and would love to find someone to pair program with or at least bounce ideas off of. Anyone else working on something similar?',
        type: 'help-wanted',
        author: {
          id: 'user4',
          name: 'Jordan Lee',
          role: 'student',
          avatar: '/placeholder-user.jpg',
          reputation: 156
        },
        createdAt: '2024-03-12T14:30:00Z',
        updatedAt: '2024-03-12T14:30:00Z',
        tags: ['final-project', 'pair-programming', 'web-scraping'],
        upvotes: 9,
        downvotes: 0,
        answerCount: 4,
        viewCount: 34,
        isPinned: false,
        isResolved: false,
        hasAcceptedAnswer: false,
        lastActivity: '2024-03-13T10:15:00Z'
      }
    ];

    // Simulate loading
    setTimeout(() => {
      setPosts(mockPosts);
      setLoading(false);
    }, 1000);
  }, [courseId]);

  const handleCreatePost = (newPost: Omit<ForumPost, 'id' | 'createdAt' | 'updatedAt' | 'lastActivity' | 'upvotes' | 'downvotes' | 'answerCount' | 'viewCount'>) => {
    const post: ForumPost = {
      ...newPost,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      upvotes: 0,
      downvotes: 0,
      answerCount: 0,
      viewCount: 0,
    };
    setPosts(prev => [post, ...prev]);
    setShowCreateModal(false);
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = searchQuery === '' || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || post.type === selectedCategory;
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'unanswered' && !post.hasAcceptedAnswer) ||
      (activeTab === 'resolved' && post.hasAcceptedAnswer) ||
      (activeTab === 'pinned' && post.isPinned);
    
    return matchesSearch && matchesCategory && matchesTab;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    
    switch (sortBy) {
      case 'recent':
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      case 'popular':
        return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
      case 'unanswered':
        return a.answerCount - b.answerCount;
      default:
        return 0;
    }
  });

  if (selectedPost) {
    return (
      <QuestionDetail 
        post={selectedPost} 
        onBack={() => setSelectedPost(null)}
        courseId={courseId}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-white via-blue-50/20 to-indigo-50/30 border-b border-gray-200/30 backdrop-blur-sm flex-shrink-0 shadow-sm">
        {/* Title and New Post Button */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl blur-sm opacity-20"></div>
                <div className="relative p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Community Forum
                </h1>
                <p className="text-sm text-gray-600 hidden sm:block">Connect, learn, and grow together</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowCreateModal(true)} 
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 px-4 sm:px-6"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Post</span>
              <span className="sm:hidden">Post</span>
            </Button>
          </div>
        </div>

        {/* Stats, Search and Filters Row */}
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            {/* Quick Stats - Compact Version */}
            <div className="flex gap-2 sm:gap-3 flex-wrap lg:flex-nowrap">
              <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50/80 to-blue-100/60 backdrop-blur-sm border border-blue-200/50 rounded-lg px-3 py-2 shadow-sm">
                <MessageSquare className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div className="text-xs sm:text-sm">
                  <span className="font-semibold text-blue-800">{posts.length}</span>
                  <span className="text-blue-700 ml-1 hidden sm:inline">Posts</span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-gradient-to-r from-green-50/80 to-green-100/60 backdrop-blur-sm border border-green-200/50 rounded-lg px-3 py-2 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div className="text-xs sm:text-sm">
                  <span className="font-semibold text-green-800">{posts.filter(p => p.hasAcceptedAnswer).length}</span>
                  <span className="text-green-700 ml-1 hidden sm:inline">Solved</span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-gradient-to-r from-purple-50/80 to-purple-100/60 backdrop-blur-sm border border-purple-200/50 rounded-lg px-3 py-2 shadow-sm">
                <Users className="w-4 h-4 text-purple-600 flex-shrink-0" />
                <div className="text-xs sm:text-sm">
                  <span className="font-semibold text-purple-800">{posts.filter(p => p.type === 'study-group').length}</span>
                  <span className="text-purple-700 ml-1 hidden sm:inline">Groups</span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-gradient-to-r from-orange-50/80 to-orange-100/60 backdrop-blur-sm border border-orange-200/50 rounded-lg px-3 py-2 shadow-sm">
                <Tag className="w-4 h-4 text-orange-600 flex-shrink-0" />
                <div className="text-xs sm:text-sm">
                  <span className="font-semibold text-orange-800">{posts.filter(p => p.type === 'resource-sharing').length}</span>
                  <span className="text-orange-700 ml-1 hidden sm:inline">Resources</span>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex-1 w-full lg:w-auto">
              <CommunitySearch 
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                sortBy={sortBy}
                setSortBy={setSortBy}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="px-4 sm:px-6 py-3 bg-gradient-to-r from-white/90 via-blue-50/10 to-indigo-50/20 backdrop-blur-sm border-b border-gray-200/30">
            <TabsList className="grid w-full grid-cols-5 mb-0 bg-gray-100/50 backdrop-blur-sm border border-gray-200/30 shadow-sm rounded-lg p-1">
              <TabsTrigger 
                value="all" 
                className="gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 text-xs sm:text-sm font-medium transition-all duration-200"
              >
                <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden sm:inline">All Posts</span>
                <span className="sm:hidden">All</span>
              </TabsTrigger>
              <TabsTrigger 
                value="unanswered" 
                className="gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-orange-600 text-xs sm:text-sm font-medium transition-all duration-200"
              >
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Need Help</span>
                <span className="sm:hidden">Help</span>
              </TabsTrigger>
              <TabsTrigger 
                value="resolved" 
                className="gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-green-600 text-xs sm:text-sm font-medium transition-all duration-200"
              >
                <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Solved</span>
                <span className="sm:hidden">Solved</span>
              </TabsTrigger>
              <TabsTrigger 
                value="pinned" 
                className="gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-600 text-xs sm:text-sm font-medium transition-all duration-200"
              >
                <Pin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Popular</span>
                <span className="sm:hidden">Popular</span>
              </TabsTrigger>
              <TabsTrigger 
                value="trending" 
                className="gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 text-xs sm:text-sm font-medium transition-all duration-200"
              >
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Active</span>
                <span className="sm:hidden">Active</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden bg-gradient-to-b from-slate-50/30 to-white/50">
            <TabsContent value={activeTab} className="h-full m-0 p-0">
              <QuestionFeed 
                posts={sortedPosts}
                loading={loading}
                onPostClick={setSelectedPost}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePost}
        courseId={courseId}
      />
    </div>
  );
}
