"use client"

import React, { useState, useEffect } from 'react';
import 'katex/dist/katex.min.css';
import katex from 'katex';
import { ArrowLeft, ChevronUp, ChevronDown, MessageSquare, Eye, Clock, CheckCircle2, Pin, User, Tag, Reply, MoreVertical, Loader2, Edit, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ForumPost, ForumAnswer } from './CommunityTab';
import { AnswerForm } from './AnswerForm';
import TiptapEditor from './TiptapEditor';
import { communityApi } from '@/lib/api/community';
import { getPageVisitId } from '@/lib/session-utils';
import { useAuth } from '@/app/context/AuthContext';

interface QuestionDetailProps {
  post: ForumPost;
  onBack: () => void;
  courseId: string;
}

export function QuestionDetail({ post, onBack, courseId }: QuestionDetailProps) {
  const { user } = useAuth();
  
  // Helper to detect raw LaTeX (starts with \ or $)
  function isRawLatex(str: string) {
    if (!str) return false;
    const trimmed = str.trim();
    return trimmed.startsWith('\\') || trimmed.startsWith('$');
  }

  // Render rich content (HTML + KaTeX) from TiptapEditor
  function renderRichContent(html: string) {
    if (!html) return null;
    const doc = document.createElement('div');
    doc.innerHTML = html;
    const equationDivs = doc.querySelectorAll('div[data-type="equation"]');
    equationDivs.forEach(div => {
      const latex = div.getAttribute('latex') || '';
      div.innerHTML = katex.renderToString(latex, { throwOnError: false });
      div.className = 'latex-block bg-gray-50 border border-gray-200 rounded px-4 py-2 my-2 text-lg';
    });
    return <div dangerouslySetInnerHTML={{ __html: doc.innerHTML }} />;
  }

  const [answers, setAnswers] = useState<ForumAnswer[]>([]);
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPost, setCurrentPost] = useState<ForumPost>(post);
  const [votingStates, setVotingStates] = useState<{ [key: string]: boolean }>({});
  const [userVotes, setUserVotes] = useState<{ [key: string]: 'upvote' | 'downvote' | null }>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editContent, setEditContent] = useState(post.content);
  const [editTags, setEditTags] = useState<string[]>(post.tags);

  // Load answers from API and track view
  useEffect(() => {
    loadAnswers();
    loadUserVotes();
  }, [post.id, courseId]);

  // Track view on every mount (each URL visit)
  useEffect(() => {
    trackPostView();
  }, []); // Empty dependency array means it runs on every mount

  const loadUserVotes = async () => {
    try {
      // Load user vote for post
      const postVoteResponse = await communityApi.getUserPostVote(courseId, post.id);
      setUserVotes(prev => ({ ...prev, [`post_${post.id}`]: postVoteResponse.vote }));
      
      // Load user votes for existing answers (will be updated when answers load)
    } catch (err) {
      console.error('Error loading user votes:', err);
    }
  };

  const trackPostView = async () => {
    try {
      const visitId = getPageVisitId();
      if (visitId) {
        const response = await communityApi.trackView(courseId, post.id, visitId);
        // Update post view count if it was incremented
        setCurrentPost(prev => ({
          ...prev,
          viewCount: response.viewCount
        }));
      }
    } catch (err) {
      console.error('Error tracking view:', err);
      // Don't show error to user for view tracking
    }
  };

  const loadAnswers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await communityApi.getPost(courseId, post.id);
      
      // Convert API response to ForumAnswer format
      const forumAnswers: ForumAnswer[] = response.answers.map(answer => ({
        ...answer,
        createdAt: answer.createdAt,
        updatedAt: answer.updatedAt
      }));

      setAnswers(forumAnswers);

      // Load user votes for all answers
      const answerVotePromises = forumAnswers.map(async (answer) => {
        try {
          const voteResponse = await communityApi.getUserAnswerVote(courseId, answer.id);
          return { answerId: answer.id, vote: voteResponse.vote };
        } catch (err) {
          return { answerId: answer.id, vote: null };
        }
      });

      const answerVotes = await Promise.all(answerVotePromises);
      const votesMap = answerVotes.reduce((acc, { answerId, vote }) => ({
        ...acc,
        [`answer_${answerId}`]: vote
      }), {});

      setUserVotes(prev => ({ ...prev, ...votesMap }));

    } catch (err) {
      console.error('Error loading answers:', err);
      setError('Failed to load answers');
    } finally {
      setLoading(false);
    }
  };

  // Auto-scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
      case 'deleted':
        return 'bg-gray-100 text-gray-500 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ta':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'tutor':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'mentor':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleAddAnswer = async (content: string, latexBlocks?: string[]) => {
    try {
      setError(null);
      
      const answerData = {
        content,
        latexBlocks: latexBlocks || []
      };

      const response = await communityApi.createAnswer(courseId, post.id, answerData);
      
      // Add the new answer to the answers array
      const newAnswer: ForumAnswer = {
        ...response.answer,
        createdAt: response.answer.createdAt,
        updatedAt: response.answer.updatedAt
      };
      
      setAnswers(prev => [...prev, newAnswer]);
      setShowAnswerForm(false);
    } catch (err) {
      console.error('Error creating answer:', err);
      setError('Failed to create answer');
    }
  };

  const handleVotePost = async (voteType: 'upvote' | 'downvote') => {
    try {
      setVotingStates(prev => ({ ...prev, [`post_${post.id}`]: true }));
      
      const response = await communityApi.votePost(courseId, post.id, voteType);
      
      // Update post vote counts
      setCurrentPost(prev => ({
        ...prev,
        upvotes: response.upvotes,
        downvotes: response.downvotes
      }));

      // Update user vote state based on new vote behavior
      const currentVote = userVotes[`post_${post.id}`];
      if (currentVote === voteType) {
        // Remove vote if clicking same button (toggles to neutral)
        setUserVotes(prev => ({ ...prev, [`post_${post.id}`]: null }));
      } else {
        // Set new vote (changes from opposite or neutral to this vote)
        setUserVotes(prev => ({ ...prev, [`post_${post.id}`]: voteType }));
      }

    } catch (err) {
      console.error('Error voting on post:', err);
      setError('Failed to vote on post');
    } finally {
      setVotingStates(prev => ({ ...prev, [`post_${post.id}`]: false }));
    }
  };

  const handleVoteAnswer = async (answerId: string, voteType: 'upvote' | 'downvote') => {
    try {
      setVotingStates(prev => ({ ...prev, [`answer_${answerId}`]: true }));
      
      const response = await communityApi.voteAnswer(courseId, answerId, voteType);
      
      // Update answer vote counts
      setAnswers(prev => prev.map(answer => 
        answer.id === answerId 
          ? { ...answer, upvotes: response.upvotes, downvotes: response.downvotes }
          : answer
      ));

      // Update user vote state based on new vote behavior
      const currentVote = userVotes[`answer_${answerId}`];
      if (currentVote === voteType) {
        // Remove vote if clicking same button (toggles to neutral)
        setUserVotes(prev => ({ ...prev, [`answer_${answerId}`]: null }));
      } else {
        // Set new vote (changes from opposite or neutral to this vote)
        setUserVotes(prev => ({ ...prev, [`answer_${answerId}`]: voteType }));
      }

    } catch (err) {
      console.error('Error voting on answer:', err);
      setError('Failed to vote on answer');
    } finally {
      setVotingStates(prev => ({ ...prev, [`answer_${answerId}`]: false }));
    }
  };

  const handleEditPost = async () => {
    try {
      setError(null);
      
      const editData = {
        title: editTitle.trim(),
        content: editContent.trim(),
        tags: editTags
      };

      const response = await communityApi.editPost(courseId, post.id, editData);
      
      // Update current post
      setCurrentPost(response.post);
      setIsEditing(false);
      
    } catch (err) {
      console.error('Error editing post:', err);
      setError('Failed to edit post');
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      setError(null);
      
      const response = await communityApi.deletePost(courseId, post.id);
      
      if (response.soft_delete) {
        // Update post to show deleted content
        setCurrentPost(prev => ({
          ...prev,
          title: '[Deleted]',
          content: '<p>This post has been deleted by the author.</p>'
        }));
      } else {
        // Hard delete - navigate back to forum
        onBack();
      }
      
    } catch (err) {
      console.error('Error deleting post:', err);
      setError('Failed to delete post');
    }
  };

  const handleDeleteAnswer = async (answerId: string) => {
    if (!confirm('Are you sure you want to delete this answer?')) {
      return;
    }

    try {
      setError(null);
      
      await communityApi.deleteAnswer(courseId, answerId);
      
      // Remove answer from local state
      setAnswers(prev => prev.filter(answer => answer.id !== answerId));
      
    } catch (err) {
      console.error('Error deleting answer:', err);
      setError('Failed to delete answer');
    }
  };

  const sortedAnswers = [...answers].sort((a, b) => {
    if (a.isAccepted && !b.isAccepted) return -1;
    if (!a.isAccepted && b.isAccepted) return 1;
    if ((a.author.role === 'ta' || a.author.role === 'tutor' || a.author.role === 'mentor') && b.author.role === 'student') return -1;
    if (a.author.role === 'student' && (b.author.role === 'ta' || b.author.role === 'tutor' || b.author.role === 'mentor')) return 1;
    return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="flex items-center gap-2 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Forum
          </Button>
        </div>

        {/* Main Question */}
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                {currentPost.isPinned && (
                  <Pin className="w-4 h-4 text-yellow-600 fill-current" />
                )}
                <Badge variant="outline" className={getPostTypeColor(currentPost.type)}>
                  {currentPost.type.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </Badge>
                {currentPost.hasAcceptedAnswer && (
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Solved
                  </Badge>
                )}
              </div>
              {user && user.id === currentPost.author.id && currentPost.type !== 'deleted' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="hover:bg-gray-100">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-white shadow-lg border border-gray-200 rounded-lg">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Post
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDeletePost} className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Post
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {isEditing ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-2xl font-bold bg-white border border-gray-300 rounded px-3 py-2"
                  placeholder="Post title"
                />
                <div className="border border-gray-300 rounded">
                  <TiptapEditor
                    value={editContent}
                    onChange={setEditContent}
                    placeholder="Edit your post content..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleEditPost} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Save Changes
                  </Button>
                  <Button onClick={() => setIsEditing(false)} variant="ghost">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <h1 className="text-2xl font-bold text-gray-900 mb-4">{currentPost.title}</h1>
            )}
          </CardHeader>
          <CardContent>
            {!isEditing && (
              <div className="flex items-start gap-6 pt-4">
                {/* Vote Section */}
                <div className="flex flex-col items-center gap-2 min-w-[80px]">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`p-2 transition-colors ${
                      userVotes[`post_${post.id}`] === 'upvote' 
                        ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    onClick={() => handleVotePost('upvote')}
                    disabled={votingStates[`post_${post.id}`]}
                  >
                    {votingStates[`post_${post.id}`] ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <ChevronUp className="w-6 h-6" />
                    )}
                  </Button>
                  <span className="font-bold text-2xl text-gray-800">
                    {currentPost.upvotes - currentPost.downvotes}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`p-2 transition-colors ${
                      userVotes[`post_${post.id}`] === 'downvote' 
                        ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                        : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                    }`}
                    onClick={() => handleVotePost('downvote')}
                    disabled={votingStates[`post_${post.id}`]}
                  >
                    {votingStates[`post_${post.id}`] ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <ChevronDown className="w-6 h-6" />
                    )}
                  </Button>
                  <div className="text-center text-xs text-gray-500 mt-2">
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{currentPost.viewCount}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="prose prose-sm max-w-none mb-6">
                    <div className="text-gray-700">
                      {renderRichContent(currentPost.content)}
                    </div>
                  </div>

                  {/* Tags */}
                  {currentPost.tags.length > 0 && (
                    <div className="flex items-center gap-2 mb-6">
                      <Tag className="w-4 h-4 text-gray-400" />
                      <div className="flex flex-wrap gap-1">
                        {currentPost.tags.map((tag, index) => (
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
                        <AvatarImage src={currentPost.author.avatar} alt={currentPost.author.name} />
                        <AvatarFallback>
                          {currentPost.author.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{currentPost.author.name}</span>
                          {currentPost.author.role !== 'student' && (
                            <Badge variant="outline" className={getRoleColor(currentPost.author.role)}>
                              {currentPost.author.role}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          <Clock className="w-3 h-3 inline mr-1" />
                          Asked {formatDate(currentPost.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Answer Form - positioned right after the question */}
        {showAnswerForm && (
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="bg-blue-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Write Your Answer</h3>
            </CardHeader>
            <CardContent className="p-6">
              <AnswerForm
                onSubmit={handleAddAnswer}
                onCancel={() => setShowAnswerForm(false)}
              />
            </CardContent>
          </Card>
        )}

        {/* Answers Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading answers...
                </div>
              ) : (
                `${answers.length} Answer${answers.length !== 1 ? 's' : ''}`
              )}
            </h2>
            <Button 
              onClick={() => setShowAnswerForm(true)} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              disabled={loading}
            >
              <Reply className="w-4 h-4 mr-2" />
              Write Answer
            </Button>
          </div>

          {loading && (
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-gray-500">Loading answers...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && error && (
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-center py-8">
                  <p className="text-red-500">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && !error && sortedAnswers.map((answer) => (
            <Card key={answer.id} className={`bg-white/70 backdrop-blur-sm border-gray-200/50 ${answer.isAccepted ? 'ring-2 ring-green-200 bg-green-50/50' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-6">
                  {/* Vote Section */}
                  <div className="flex flex-col items-center gap-2 min-w-[60px]">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`p-1 transition-colors ${
                        userVotes[`answer_${answer.id}`] === 'upvote' 
                          ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                      onClick={() => handleVoteAnswer(answer.id, 'upvote')}
                      disabled={votingStates[`answer_${answer.id}`]}
                    >
                      {votingStates[`answer_${answer.id}`] ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <ChevronUp className="w-5 h-5" />
                      )}
                    </Button>
                    <span className="font-semibold text-lg text-gray-800">
                      {answer.upvotes - answer.downvotes}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`p-1 transition-colors ${
                        userVotes[`answer_${answer.id}`] === 'downvote' 
                          ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                          : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                      }`}
                      onClick={() => handleVoteAnswer(answer.id, 'downvote')}
                      disabled={votingStates[`answer_${answer.id}`]}
                    >
                      {votingStates[`answer_${answer.id}`] ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </Button>
                    {answer.isAccepted && (
                      <CheckCircle2 className="w-6 h-6 text-green-600 fill-current mt-2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="ProseMirror text-gray-700 max-w-none">
                          {/* Render answer content, including equation nodes as in TiptapEditor */}
                          {(() => {
                            // Parse the answer HTML and replace equation nodes with KaTeX output
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(answer.content, 'text/html');
                            const equationDivs = doc.querySelectorAll('div[data-type="equation"]');
                            equationDivs.forEach(div => {
                              const latex = div.getAttribute('latex') || '';
                              div.innerHTML = katex.renderToString(latex, { throwOnError: false });
                              div.className = 'latex-block bg-gray-50 border border-gray-200 rounded px-4 py-2 my-2 text-lg';
                            });
                            return <div dangerouslySetInnerHTML={{ __html: doc.body.innerHTML }} />;
                          })()}
                        </div>
                      </div>
                      
                      {/* Answer Options Dropdown */}
                      {user && user.id === answer.author.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="hover:bg-gray-100 ml-2">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-white shadow-lg border border-gray-200 rounded-lg">
                            <DropdownMenuItem onClick={() => handleDeleteAnswer(answer.id)} className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Answer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
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

        </div>
      </div>
    </div>
  );
}
