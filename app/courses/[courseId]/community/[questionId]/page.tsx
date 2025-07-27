"use client"

import React, { useState, useEffect, use } from 'react';
import { QuestionDetail } from '../../../components/community/QuestionDetail';
import { useRouter } from 'next/navigation';
import { ForumPost } from '../../../components/community/CommunityTab';

interface QuestionPageProps {
  params: Promise<{
    courseId: string;
    questionId: string;
  }>;
}

// Mock data for different questions
const mockQuestions: { [key: string]: ForumPost } = {
  '1': {
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
  '2': {
    id: '2',
    title: 'Study group for final project - anyone interested?',
    content: 'Looking to form a study group for the final project. We could meet twice a week to work through problems together and share resources. Anyone interested in joining?',
    type: 'study-group',
    author: {
      id: 'user2',
      name: 'Mike Chen',
      role: 'student',
      avatar: '/placeholder-user.jpg',
      reputation: 89
    },
    createdAt: '2024-03-14T16:45:00Z',
    updatedAt: '2024-03-14T16:45:00Z',
    tags: ['study-group', 'final-project', 'collaboration'],
    upvotes: 7,
    downvotes: 0,
    answerCount: 8,
    viewCount: 32,
    isPinned: false,
    isResolved: false,
    hasAcceptedAnswer: false,
    lastActivity: '2024-03-15T09:22:00Z'
  },
  '3': {
    id: '3',
    title: 'Free online resources for Data Structures practice',
    content: 'I found some amazing free resources for practicing data structures problems. LeetCode, HackerRank, and this GitHub repo with 200+ problems. Would love to hear what others are using!',
    type: 'resource-sharing',
    author: {
      id: 'user3',
      name: 'Sarah Kim',
      role: 'ta',
      avatar: '/placeholder-user.jpg',
      reputation: 445
    },
    createdAt: '2024-03-14T09:15:00Z',
    updatedAt: '2024-03-14T09:15:00Z',
    tags: ['resources', 'practice', 'helpful'],
    upvotes: 28,
    downvotes: 0,
    answerCount: 2,
    viewCount: 156,
    isPinned: true,
    isResolved: false,
    hasAcceptedAnswer: false,
    lastActivity: '2024-03-14T11:30:00Z'
  }
};

export default function QuestionPage({ params }: QuestionPageProps) {
  const router = useRouter();
  const { courseId, questionId } = use(params);
  const [post, setPost] = useState<ForumPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const foundPost = mockQuestions[questionId];
      if (foundPost) {
        setPost(foundPost);
      }
      setLoading(false);
    }, 500);
  }, [questionId]);

  const handleBack = () => {
    // Set the community tab in localStorage before navigating back
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastCourseTab', 'community');
    }
    router.push(`/courses/${courseId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading question...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Question not found</h1>
          <p className="text-gray-600 mb-4">The question you're looking for doesn't exist.</p>
          <button 
            onClick={handleBack}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Back to Forum
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <QuestionDetail 
        post={post}
        onBack={handleBack}
        courseId={courseId}
      />
    </div>
  );
}
