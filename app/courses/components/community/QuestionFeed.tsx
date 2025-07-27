"use client"

import React from 'react';
import { Loader2, MessageSquare, TrendingUp } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { QuestionCard } from './QuestionCard';
import { ForumPost } from './CommunityTab';

interface QuestionFeedProps {
  posts: ForumPost[];
  loading: boolean;
  onPostClick: (post: ForumPost) => void;
  searchQuery?: string;
}

export function QuestionFeed({ posts, loading, onPostClick, searchQuery }: QuestionFeedProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading forum posts...</p>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-8">
        <div className="bg-gray-100 rounded-full p-6 mb-6">
          <MessageSquare className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts found</h3>
        <p className="text-gray-600 max-w-md">
          Be the first to start a discussion! Ask a question, share resources, or create a study group.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Decorative separator with better spacing */}
      <div className="flex items-center justify-center">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent w-full max-w-md"></div>
      </div>
      
      {/* Posts container with improved spacing */}
      <div className="space-y-0 pb-4">
        {posts.map((post) => (
          <QuestionCard
            key={post.id}
            post={post}
            onClick={() => onPostClick(post)}
            searchQuery={searchQuery}
          />
        ))}
      </div>
    </div>
  );
}
