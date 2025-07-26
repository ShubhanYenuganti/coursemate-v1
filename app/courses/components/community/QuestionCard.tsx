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
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'discussion':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'study-group':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'resource-sharing':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'help-wanted':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ta':
        return 'bg-purple-100 text-purple-800';
      case 'tutor':
        return 'bg-blue-100 text-blue-800';
      case 'mentor':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card 
      className="hover:shadow-md transition-all duration-200 cursor-pointer border-gray-200/50 bg-white/70 backdrop-blur-sm hover:bg-white/90"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Vote Section */}
          <div className="flex flex-col items-center gap-1 min-w-[60px]">
            <div className="p-1 hover:bg-gray-100 rounded transition-colors">
              <ChevronUp className="w-5 h-5 text-gray-600" />
            </div>
            <span className="font-semibold text-lg text-gray-800">
              {post.upvotes - post.downvotes}
            </span>
            <div className="p-1 hover:bg-gray-100 rounded transition-colors">
              <ChevronDown className="w-5 h-5 text-gray-600" />
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                {post.isPinned && (
                  <Pin className="w-4 h-4 text-yellow-600 fill-current" />
                )}
                <Badge variant="outline" className={getPostTypeColor(post.type)}>
                  {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
                </Badge>
                {post.hasAcceptedAnswer && (
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Solved
                  </Badge>
                )}
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
              {post.title}
            </h3>

            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {post.content}
            </p>

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-3 h-3 text-gray-400" />
                <div className="flex flex-wrap gap-1">
                  {post.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100">
                      {tag}
                    </Badge>
                  ))}
                  {post.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs bg-gray-50 text-gray-600">
                      +{post.tags.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  <span>{post.answerCount} answers</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{post.viewCount} views</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-xs text-gray-500">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {formatDate(post.lastActivity)}
                </div>
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={post.author.avatar} alt={post.author.name} />
                    <AvatarFallback className="text-xs">
                      {post.author.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-xs text-gray-600">
                    <span className="font-medium">{post.author.name}</span>
                    {post.author.reputation && (
                      <span className="text-gray-500 ml-1">({post.author.reputation} rep)</span>
                    )}
                    {post.author.role !== 'student' && (
                      <Badge variant="outline" className={`ml-1 text-xs ${getRoleColor(post.author.role)}`}>
                        {post.author.role.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
