"use client"

import React from 'react';
import { ChevronUp, ChevronDown, MessageSquare, Eye, Clock, CheckCircle2, Pin, User, Tag } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ForumPost } from './CommunityTab';

interface QuestionCardProps {
  post: ForumPost;
  onClick: () => void;
}

export function QuestionCard({ post, onClick }: QuestionCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case 'question':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'discussion':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'study-group':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'resource-sharing':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'help-wanted':
        return 'bg-red-50 text-red-800 border-red-200';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ta':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'tutor':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'mentor':
        return 'bg-green-50 text-green-800 border-green-200';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div 
        onClick={onClick}
        className="bg-white border border-gray-200 rounded-2xl p-8 mb-6 hover:border-gray-300 hover:shadow-lg cursor-pointer transition-all duration-300 hover:scale-[1.02]"
      >
      <div className="flex flex-col sm:flex-row items-start gap-6">
        {/* Vote and Answer Stats - Mobile: horizontal, Desktop: vertical */}
        <div className="flex sm:flex-col gap-6 sm:gap-4 sm:min-w-[140px]">
          <div className="flex flex-col items-center text-center">
            <div className="text-xl font-semibold text-gray-700">
              {post.upvotes - post.downvotes}
            </div>
            <div className="text-sm text-gray-500">votes</div>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className={`text-xl font-semibold ${post.hasAcceptedAnswer ? 'text-green-600' : 'text-gray-700'}`}>
              {post.answerCount}
            </div>
            <div className="text-sm text-gray-500">answers</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                {post.isPinned && (
                  <Pin className="w-4 h-4 text-blue-600" />
                )}
                {post.hasAcceptedAnswer && (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                )}
                <Badge variant="outline" className={`${getPostTypeColor(post.type)} px-3 py-1 text-sm font-medium`}>
                  {post.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              </div>
              
              <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors mb-3 text-lg leading-tight">
                {post.title}
              </h3>
              
              <p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed">
                {post.content}
              </p>
              
              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 px-2 py-1">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* View Count - Desktop only */}
            <div className="hidden sm:flex items-center gap-1 text-sm text-gray-500 min-w-[80px] justify-end">
              <Eye className="w-4 h-4" />
              {post.viewCount}
            </div>
          </div>

          {/* Author and Meta */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={post.author.avatar} alt={post.author.name} />
                <AvatarFallback className="text-sm">
                  {post.author.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-gray-700 font-medium">{post.author.name}</span>
              {post.author.role !== 'student' && (
                <Badge variant="outline" className={getRoleColor(post.author.role)}>
                  {post.author.role.toUpperCase()}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center justify-between sm:justify-end gap-4">
              {/* View Count - Mobile */}
              <div className="flex sm:hidden items-center gap-1 text-sm text-gray-500">
                <Eye className="w-4 h-4" />
                {post.viewCount}
              </div>
              
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                {formatDate(post.lastActivity)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
