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
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200/50 p-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Community Forum</h1>
              <p className="text-gray-600">Connect with fellow learners, ask questions, share resources, and collaborate</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Post
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-700 font-medium">Total Posts</p>
                  <p className="text-xl font-bold text-blue-800">{posts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-sm text-green-700 font-medium">Solved</p>
                  <p className="text-xl font-bold text-green-800">{posts.filter(p => p.hasAcceptedAnswer).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-sm text-purple-700 font-medium">Study Groups</p>
                  <p className="text-xl font-bold text-purple-800">{posts.filter(p => p.type === 'study-group').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-orange-600" />
                <div>
                  <p className="text-sm text-orange-700 font-medium">Resources</p>
                  <p className="text-xl font-bold text-orange-800">{posts.filter(p => p.type === 'resource-sharing').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <CommunitySearch 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="px-6 pt-4 bg-white border-b border-gray-200/50">
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="all" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                All Posts
              </TabsTrigger>
              <TabsTrigger value="unanswered" className="gap-2">
                <Clock className="w-4 h-4" />
                Need Help
              </TabsTrigger>
              <TabsTrigger value="resolved" className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Solved
              </TabsTrigger>
              <TabsTrigger value="pinned" className="gap-2">
                <Pin className="w-4 h-4" />
                Popular
              </TabsTrigger>
              <TabsTrigger value="trending" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                Active
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value={activeTab} className="h-full m-0">
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
