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
import { communityApi, CommunityPost as ApiCommunityPost } from '@/lib/api/community';
import { useAuth } from '@/app/context/AuthContext';

interface CommunityTabProps {
  courseId: string;
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  type: 'question' | 'discussion' | 'study-group' | 'resource-sharing' | 'help-wanted' | 'deleted';
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
  const { user } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [activeTab, setActiveTab] = useState('all');

  // Load posts from the API
  useEffect(() => {
    loadPosts();
  }, [courseId, sortBy, selectedCategory, searchQuery]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Don't send "my-posts" or "deleted" as a type filter since they're special filters
      const typeFilter = selectedCategory !== 'all' && selectedCategory !== 'my-posts' && selectedCategory !== 'deleted'
        ? selectedCategory as ApiCommunityPost['type'] 
        : undefined;
      
      const response = await communityApi.getPosts(courseId, {
        sort: sortBy as 'recent' | 'popular' | 'answered',
        type: typeFilter,
        per_page: 50,
        include_deleted: selectedCategory === 'deleted',
        search: searchQuery.trim() || undefined
      });

      // Convert API response to ForumPost format
      let forumPosts: ForumPost[] = response.posts.map(post => ({
        ...post,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        lastActivity: post.lastActivity
      }));

      // Filter for "my-posts" on the frontend
      if (selectedCategory === 'my-posts' && user) {
        forumPosts = forumPosts.filter(post => post.author.id === user.id);
      }

      setPosts(forumPosts);
    } catch (err) {
      console.error('Error loading posts:', err);
      setError('Failed to load community posts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (postData: Omit<ForumPost, 'id' | 'createdAt' | 'updatedAt' | 'lastActivity' | 'upvotes' | 'downvotes' | 'answerCount' | 'viewCount'>) => {
    try {
      setError(null);
      
      const createData = {
        title: postData.title,
        content: postData.content,
        type: postData.type,
        tags: postData.tags,
        isPinned: postData.isPinned
      };

      const response = await communityApi.createPost(courseId, createData);
      
      // Add the new post to the beginning of the posts array
      const newPost: ForumPost = {
        ...response.post,
        lastActivity: response.post.createdAt
      };
      
      setPosts(prev => [newPost, ...prev]);
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post');
    }
  };

  const filteredPosts = posts.filter(post => {
    // Only apply tab filtering since search and category filtering is done on backend
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'help' && (post.type === 'question' || post.type === 'help-wanted')) ||
      (activeTab === 'popular' && (post.upvotes - post.downvotes) >= 5) ||
      (activeTab === 'active' && new Date(post.lastActivity) > new Date(Date.now() - 24 * 60 * 60 * 1000)) ||
      (activeTab === 'solved' && post.hasAcceptedAnswer) ||
      (activeTab === 'study-groups' && post.type === 'study-group') ||
      (activeTab === 'resources' && post.type === 'resource-sharing');
    
    return matchesTab;
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
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}
            
            <QuestionFeed 
              posts={sortedPosts}
              loading={loading}
              onPostClick={handlePostClick}
              searchQuery={searchQuery}
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
