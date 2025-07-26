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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading forum posts...</p>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-8">
        <div className="bg-gray-100 rounded-full p-4 mb-4">
          <MessageSquare className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts found</h3>
        <p className="text-gray-600 max-w-sm">
          Be the first to start a discussion! Ask a question or share your thoughts with the community.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      {posts.map((post) => (
        <QuestionCard
          key={post.id}
          post={post}
          onClick={() => onPostClick(post)}
        />
      ))}
    </div>
  );
}
