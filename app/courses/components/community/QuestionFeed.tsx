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
}

export function QuestionFeed({ posts, loading, onPostClick }: QuestionFeedProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gradient-to-b from-slate-50/50 to-white/80">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full blur-sm opacity-20 animate-pulse"></div>
            <div className="relative bg-white p-4 rounded-full shadow-lg">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          </div>
          <p className="text-gray-600 mt-4 font-medium">Loading forum posts...</p>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-8 bg-gradient-to-b from-slate-50/50 to-white/80">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full blur-sm opacity-20"></div>
          <div className="relative bg-gradient-to-r from-gray-100 to-gray-200 rounded-full p-6 shadow-lg">
            <MessageSquare className="w-12 h-12 text-gray-500" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          No posts found
        </h3>
        <p className="text-gray-600 max-w-sm leading-relaxed">
          Be the first to start a discussion! Ask a question or share your thoughts with the community.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 sm:p-6 space-y-4 pb-8">
        {posts.map((post) => (
          <QuestionCard
            key={post.id}
            post={post}
            onClick={() => onPostClick(post)}
          />
        ))}
      </div>
    </div>
  );
}
