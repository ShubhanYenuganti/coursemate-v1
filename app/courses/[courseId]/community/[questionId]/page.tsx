"use client"

import React, { useState, useEffect, use } from 'react';
import { QuestionDetail } from '../../../components/community/QuestionDetail';
import { useRouter } from 'next/navigation';
import { ForumPost } from '../../../components/community/CommunityTab';
import { communityApi } from '@/lib/api/community';

interface QuestionPageProps {
  params: Promise<{
    courseId: string;
    questionId: string;
  }>;
}

export default function QuestionPage({ params }: QuestionPageProps) {
  const router = useRouter();
  const { courseId, questionId } = use(params);
  const [post, setPost] = useState<ForumPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await communityApi.getPost(courseId, questionId);
        
        // Convert API response to ForumPost format
        const forumPost: ForumPost = {
          ...response.post,
          createdAt: response.post.createdAt,
          updatedAt: response.post.updatedAt,
          lastActivity: response.post.lastActivity
        };
        
        setPost(forumPost);
      } catch (err) {
        console.error('Error loading post:', err);
        setError('Failed to load question');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [courseId, questionId]);

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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error loading question</h1>
          <p className="text-gray-600 mb-4">{error}</p>
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
