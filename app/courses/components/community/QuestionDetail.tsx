"use client"

import React, { useState } from 'react';
import { ArrowLeft, ChevronUp, ChevronDown, MessageSquare, Eye, Clock, CheckCircle2, Pin, User, Tag, Reply, MoreVertical } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ForumPost, ForumAnswer } from './CommunityTab';
import { AnswerForm } from './AnswerForm';

interface QuestionDetailProps {
  post: ForumPost;
  onBack: () => void;
  courseId: string;
}

export function QuestionDetail({ post, onBack, courseId }: QuestionDetailProps) {
  const [answers, setAnswers] = useState<ForumAnswer[]>([
    {
      id: '1',
      postId: post.id,
      content: 'The recursive approach for BST insertion works by comparing the new value with the current node. If it\'s smaller, go left; if larger, go right. When you reach a null pointer, insert the new node there.',
      author: {
        id: 'user2',
        name: 'Bob Smith',
        role: 'student',
        avatar: '/placeholder-user.jpg',
        reputation: 234
      },
      createdAt: '2024-03-15T11:30:00Z',
      updatedAt: '2024-03-15T11:30:00Z',
      upvotes: 8,
      downvotes: 0,
      isAccepted: false,
      isHelpful: true
    },
    {
      id: '2',
      postId: post.id,
      content: 'Here\'s a simple implementation:\n\n```python\ndef insert(self, root, key):\n    if root is None:\n        return TreeNode(key)\n    if key < root.val:\n        root.left = self.insert(root.left, key)\n    else:\n        root.right = self.insert(root.right, key)\n    return root\n```\n\nThe key insight is that the recursive structure naturally handles the tree traversal.',
      author: {
        id: 'ta1',
        name: 'Sarah Wilson',
        role: 'ta',
        avatar: '/placeholder-user.jpg',
        reputation: 1245
      },
      createdAt: '2024-03-15T14:22:00Z',
      updatedAt: '2024-03-15T14:22:00Z',
      upvotes: 15,
      downvotes: 0,
      isAccepted: true,
      isHelpful: true
    }
  ]);

  const [showAnswerForm, setShowAnswerForm] = useState(false);

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

  const handleAddAnswer = (content: string) => {
    const newAnswer: ForumAnswer = {
      id: Date.now().toString(),
      postId: post.id,
      content,
      author: {
        id: 'current-user',
        name: 'You',
        role: 'student'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      upvotes: 0,
      downvotes: 0,
      isAccepted: false,
      isHelpful: false
    };
    setAnswers(prev => [...prev, newAnswer]);
    setShowAnswerForm(false);
  };

  const sortedAnswers = [...answers].sort((a, b) => {
    if (a.isAccepted && !b.isAccepted) return -1;
    if (!a.isAccepted && b.isAccepted) return 1;
    if ((a.author.role === 'ta' || a.author.role === 'tutor' || a.author.role === 'mentor') && b.author.role === 'student') return -1;
    if (a.author.role === 'student' && (b.author.role === 'ta' || b.author.role === 'tutor' || b.author.role === 'mentor')) return 1;
    return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
  });

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Forum
          </Button>
        </div>

        {/* Main Question */}
        <Card className="bg-white/70 backdrop-blur-sm border-gray-200/50">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 flex-wrap mb-3">
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Edit Post</DropdownMenuItem>
                  <DropdownMenuItem>Pin Post</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">Delete Post</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.title}</h1>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6">
              {/* Vote Section */}
              <div className="flex flex-col items-center gap-2 min-w-[80px]">
                <Button variant="ghost" size="sm" className="p-2">
                  <ChevronUp className="w-6 h-6 text-gray-600" />
                </Button>
                <span className="font-bold text-2xl text-gray-800">
                  {post.upvotes - post.downvotes}
                </span>
                <Button variant="ghost" size="sm" className="p-2">
                  <ChevronDown className="w-6 h-6 text-gray-600" />
                </Button>
                <div className="text-center text-xs text-gray-500 mt-2">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{post.viewCount}</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="prose prose-sm max-w-none mb-6">
                  <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
                </div>

                {/* Tags */}
                {post.tags.length > 0 && (
                  <div className="flex items-center gap-2 mb-6">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <div className="flex flex-wrap gap-1">
                      {post.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Author Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={post.author.avatar} alt={post.author.name} />
                      <AvatarFallback>
                        {post.author.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{post.author.name}</span>
                        {post.author.role !== 'student' && (
                          <Badge variant="outline" className={getRoleColor(post.author.role)}>
                            {post.author.role}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Asked {formatDate(post.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Answers Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {answers.length} Answer{answers.length !== 1 ? 's' : ''}
            </h2>
            <Button onClick={() => setShowAnswerForm(true)} className="gap-2">
              <Reply className="w-4 h-4" />
              Write Answer
            </Button>
          </div>

          {sortedAnswers.map((answer) => (
            <Card key={answer.id} className={`bg-white/70 backdrop-blur-sm border-gray-200/50 ${answer.isAccepted ? 'ring-2 ring-green-200 bg-green-50/50' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-6">
                  {/* Vote Section */}
                  <div className="flex flex-col items-center gap-2 min-w-[60px]">
                    <Button variant="ghost" size="sm" className="p-1">
                      <ChevronUp className="w-5 h-5 text-gray-600" />
                    </Button>
                    <span className="font-semibold text-lg text-gray-800">
                      {answer.upvotes - answer.downvotes}
                    </span>
                    <Button variant="ghost" size="sm" className="p-1">
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    </Button>
                    {answer.isAccepted && (
                      <CheckCircle2 className="w-6 h-6 text-green-600 fill-current mt-2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="prose prose-sm max-w-none mb-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{answer.content}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {(answer.author.role === 'ta' || answer.author.role === 'tutor' || answer.author.role === 'mentor') && (
                          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                            {answer.author.role.toUpperCase()} Answer
                          </Badge>
                        )}
                        {answer.isAccepted && (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Accepted Answer
                          </Badge>
                        )}
                        {answer.isHelpful && !answer.isAccepted && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            Helpful
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-500">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {formatDate(answer.createdAt)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={answer.author.avatar} alt={answer.author.name} />
                            <AvatarFallback className="text-xs">
                              {answer.author.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{answer.author.name}</span>
                              {answer.author.reputation && (
                                <span className="text-xs text-gray-500">({answer.author.reputation} rep)</span>
                              )}
                              {answer.author.role !== 'student' && (
                                <Badge variant="outline" className={`text-xs ${getRoleColor(answer.author.role)}`}>
                                  {answer.author.role.toUpperCase()}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Answer Form */}
          {showAnswerForm && (
            <AnswerForm
              onSubmit={handleAddAnswer}
              onCancel={() => setShowAnswerForm(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
