"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Plus, Search, Filter, TrendingUp, Clock, CheckCircle2, Pin, Users, Tag } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuestionFeed } from './QuestionFeed';
import { CreatePostModal } from './CreatePostModal';
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
  latexBlocks?: string[];
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
  const router = useRouter();
  const [posts, setPosts] = useState<ForumPost[]>([]);
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
      (activeTab === 'help' && (post.type === 'question' || post.type === 'help-wanted')) ||
      (activeTab === 'popular' && (post.upvotes - post.downvotes) >= 5) ||
      (activeTab === 'active' && new Date(post.lastActivity) > new Date(Date.now() - 24 * 60 * 60 * 1000)) ||
      (activeTab === 'solved' && post.hasAcceptedAnswer) ||
      (activeTab === 'study-groups' && post.type === 'study-group') ||
      (activeTab === 'resources' && post.type === 'resource-sharing');
    
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
      case 'activity':
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      default:
        return 0;
    }
  });

  const handlePostClick = (post: ForumPost) => {
    router.push(`/courses/${courseId}/community/${post.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-xl shadow-md">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Community Forum</h1>
                <p className="text-gray-600">Connect, learn, and collaborate with your peers</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowCreateModal(true)} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Post
            </Button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl px-8 py-5 text-center min-w-[160px] shadow-sm hover:shadow-md transition-all duration-200">
              <div className="text-3xl font-bold text-blue-700">{posts.length}</div>
              <div className="text-sm text-blue-600 font-medium">Total Posts</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-2xl px-8 py-5 text-center min-w-[160px] shadow-sm hover:shadow-md transition-all duration-200">
              <div className="text-3xl font-bold text-green-700">
                {posts.filter(p => p.hasAcceptedAnswer).length}
              </div>
              <div className="text-sm text-green-600 font-medium">Solved</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-2xl px-8 py-5 text-center min-w-[160px] shadow-sm hover:shadow-md transition-all duration-200">
              <div className="text-3xl font-bold text-purple-700">
                {posts.filter(p => p.type === 'study-group').length}
              </div>
              <div className="text-sm text-purple-600 font-medium">Study Groups</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-2xl px-8 py-5 text-center min-w-[160px] shadow-sm hover:shadow-md transition-all duration-200">
              <div className="text-3xl font-bold text-orange-700">
                {posts.filter(p => p.type === 'resource-sharing').length}
              </div>
              <div className="text-sm text-orange-600 font-medium">Resources</div>
            </div>
          </div>

          {/* Search, Filter, Sort - All on one line */}
          <div className="border-t border-gray-200 pt-6">
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

      {/* Content Area */}
      <div className="px-4 sm:px-6 pb-2 pt-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Unified Category Bar */}
          <div className="border-b border-gray-200 max-w-7xl mx-auto pt-6 pb-4">
            <TabsList className="w-full h-14 bg-gray-100 rounded-xl p-1.5 flex justify-start shadow-sm border border-gray-200">
              <TabsTrigger
                value="all"
                className={
                  `${activeTab === 'all'
                    ? 'bg-white text-blue-600 border-blue-600 shadow-lg'
                    : 'text-gray-600'} px-8 py-3 text-sm font-semibold whitespace-nowrap rounded-lg transition-all duration-200 border-2 border-transparent hover:text-blue-600 hover:bg-white/60`
                }
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="help"
                className={
                  `${activeTab === 'help'
                    ? 'bg-white text-blue-600 border-blue-600 shadow-lg'
                    : 'text-gray-600'} px-8 py-3 text-sm font-semibold whitespace-nowrap rounded-lg transition-all duration-200 border-2 border-transparent hover:text-blue-600 hover:bg-white/60`
                }
              >
                Need Help
              </TabsTrigger>
              <TabsTrigger
                value="popular"
                className={
                  `${activeTab === 'popular'
                    ? 'bg-white text-blue-600 border-blue-600 shadow-lg'
                    : 'text-gray-600'} px-8 py-3 text-sm font-semibold whitespace-nowrap rounded-lg transition-all duration-200 border-2 border-transparent hover:text-blue-600 hover:bg-white/60`
                }
              >
                Popular
              </TabsTrigger>
              <TabsTrigger
                value="active"
                className={
                  `${activeTab === 'active'
                    ? 'bg-white text-blue-600 border-blue-600 shadow-lg'
                    : 'text-gray-600'} px-8 py-3 text-sm font-semibold whitespace-nowrap rounded-lg transition-all duration-200 border-2 border-transparent hover:text-blue-600 hover:bg-white/60`
                }
              >
                Most Active
              </TabsTrigger>
              <TabsTrigger
                value="solved"
                className={
                  `${activeTab === 'solved'
                    ? 'bg-white text-blue-600 border-blue-600 shadow-lg'
                    : 'text-gray-600'} px-8 py-3 text-sm font-semibold whitespace-nowrap rounded-lg transition-all duration-200 border-2 border-transparent hover:text-blue-600 hover:bg-white/60`
                }
              >
                Solved
              </TabsTrigger>
              <TabsTrigger
                value="study-groups"
                className={
                  `${activeTab === 'study-groups'
                    ? 'bg-white text-blue-600 border-blue-600 shadow-lg'
                    : 'text-gray-600'} px-8 py-3 text-sm font-semibold whitespace-nowrap rounded-lg transition-all duration-200 border-2 border-transparent hover:text-blue-600 hover:bg-white/60`
                }
              >
                Study Groups
              </TabsTrigger>
              <TabsTrigger
                value="resources"
                className={
                  `${activeTab === 'resources'
                    ? 'bg-white text-blue-600 border-blue-600 shadow-lg'
                    : 'text-gray-600'} px-8 py-3 text-sm font-semibold whitespace-nowrap rounded-lg transition-all duration-200 border-2 border-transparent hover:text-blue-600 hover:bg-white/60`
                }
              >
                Resources
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Posts */}
          <TabsContent value={activeTab} className="mt-0">
            <QuestionFeed 
              posts={sortedPosts}
              loading={loading}
              onPostClick={handlePostClick}
            />
          </TabsContent>
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
