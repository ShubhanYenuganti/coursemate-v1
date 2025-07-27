// API utilities for community forum
import { fetchWithAuth } from '@/lib/api-utils';

export interface CommunityPost {
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
  tags: string[];
  isPinned: boolean;
  isResolved: boolean;
  hasAcceptedAnswer: boolean;
  upvotes: number;
  downvotes: number;
  answerCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  lastActivity: string;
}

export interface CommunityAnswer {
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
  isAccepted: boolean;
  isHelpful: boolean;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostData {
  title: string;
  content: string;
  type: CommunityPost['type'];
  tags: string[];
  isPinned?: boolean;
}

export interface CreateAnswerData {
  content: string;
  latexBlocks?: string[];
}

export interface CommunityPostsResponse {
  posts: CommunityPost[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
  };
}

export interface CommunityPostDetailResponse {
  post: CommunityPost;
  answers: CommunityAnswer[];
}

export const communityApi = {
  // Get all posts for a course
  async getPosts(
    courseId: string, 
    options: {
      page?: number;
      per_page?: number;
      sort?: 'recent' | 'popular' | 'answered';
      type?: CommunityPost['type'];
      include_deleted?: boolean;
      search?: string;
    } = {}
  ): Promise<CommunityPostsResponse> {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page.toString());
    if (options.per_page) params.append('per_page', options.per_page.toString());
    if (options.sort) params.append('sort', options.sort);
    if (options.type) params.append('type', options.type);
    if (options.include_deleted) params.append('include_deleted', 'true');
    if (options.search) params.append('search', options.search);

    const queryString = params.toString();
    const url = `/api/courses/${courseId}/community/posts${queryString ? `?${queryString}` : ''}`;
    
    return fetchWithAuth(url, {
      method: 'GET',
    });
  },

  // Create a new post
  async createPost(courseId: string, postData: CreatePostData): Promise<{ message: string; post: CommunityPost }> {
    return fetchWithAuth(`/api/courses/${courseId}/community/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });
  },

  // Get a specific post with answers
  async getPost(courseId: string, postId: string): Promise<CommunityPostDetailResponse> {
    return fetchWithAuth(`/api/courses/${courseId}/community/posts/${postId}`, {
      method: 'GET',
    });
  },

  // Create an answer for a post
  async createAnswer(
    courseId: string, 
    postId: string, 
    answerData: CreateAnswerData
  ): Promise<{ message: string; answer: CommunityAnswer }> {
    return fetchWithAuth(`/api/courses/${courseId}/community/posts/${postId}/answers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(answerData),
    });
  },

  // Vote on a post
  async votePost(
    courseId: string, 
    postId: string, 
    voteType: 'upvote' | 'downvote'
  ): Promise<{ message: string; upvotes: number; downvotes: number }> {
    return fetchWithAuth(`/api/courses/${courseId}/community/posts/${postId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ voteType }),
    });
  },

  // Vote on an answer
  async voteAnswer(
    courseId: string, 
    answerId: string, 
    voteType: 'upvote' | 'downvote'
  ): Promise<{ message: string; upvotes: number; downvotes: number }> {
    return fetchWithAuth(`/api/courses/${courseId}/community/answers/${answerId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ voteType }),
    });
  },

  // Track a view for a post
  async trackView(
    courseId: string, 
    postId: string, 
    sessionId: string
  ): Promise<{ message: string; viewCount: number }> {
    return fetchWithAuth(`/api/courses/${courseId}/community/posts/${postId}/view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    });
  },

  // Get user's vote for a post
  async getUserPostVote(
    courseId: string, 
    postId: string
  ): Promise<{ vote: 'upvote' | 'downvote' | null }> {
    return fetchWithAuth(`/api/courses/${courseId}/community/posts/${postId}/user-vote`, {
      method: 'GET',
    });
  },

  // Get user's vote for an answer
  async getUserAnswerVote(
    courseId: string, 
    answerId: string
  ): Promise<{ vote: 'upvote' | 'downvote' | null }> {
    return fetchWithAuth(`/api/courses/${courseId}/community/answers/${answerId}/user-vote`, {
      method: 'GET',
    });
  },

  // Edit a post
  async editPost(
    courseId: string, 
    postId: string, 
    postData: Partial<CreatePostData>
  ): Promise<{ message: string; post: CommunityPost }> {
    return fetchWithAuth(`/api/courses/${courseId}/community/posts/${postId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });
  },

  // Delete a post
  async deletePost(
    courseId: string, 
    postId: string
  ): Promise<{ message: string; deleted: boolean; soft_delete: boolean }> {
    return fetchWithAuth(`/api/courses/${courseId}/community/posts/${postId}`, {
      method: 'DELETE',
    });
  },

  // Delete an answer
  async deleteAnswer(
    courseId: string, 
    answerId: string
  ): Promise<{ message: string; deleted: boolean }> {
    return fetchWithAuth(`/api/courses/${courseId}/community/answers/${answerId}`, {
      method: 'DELETE',
    });
  },
};
