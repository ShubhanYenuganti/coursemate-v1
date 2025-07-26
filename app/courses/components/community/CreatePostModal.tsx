"use client"

import React, { useState } from 'react';
import { X, Send, Hash, MessageSquare, Users, BookOpen, HandHeart, HelpCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TiptapEditor from './TiptapEditor';
import { ForumPost } from './CommunityTab';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (post: Omit<ForumPost, 'id' | 'createdAt' | 'updatedAt' | 'lastActivity' | 'upvotes' | 'downvotes' | 'answerCount' | 'viewCount'>) => void;
  courseId: string;
}

export function CreatePostModal({ isOpen, onClose, onSubmit, courseId }: CreatePostModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'question' | 'discussion' | 'study-group' | 'resource-sharing' | 'help-wanted'>('question');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setType('question');
    setTags([]);
    setNewTag('');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 5) {
      setTags([...tags, newTag.trim().toLowerCase()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      const post: Omit<ForumPost, 'id' | 'createdAt' | 'updatedAt' | 'lastActivity' | 'upvotes' | 'downvotes' | 'answerCount' | 'viewCount'> = {
        title: title.trim(),
        content: content.trim(),
        type,
        author: {
          id: 'current-user',
          name: 'Current User',
          role: 'student'
        },
        tags,
        isPinned: false,
        isResolved: false,
        hasAcceptedAnswer: false
      };
      
      await onSubmit(post);
      resetForm();
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPostTypeIcon = (postType: string) => {
    switch (postType) {
      case 'question':
        return <MessageSquare className="w-4 h-4" />;
      case 'discussion':
        return <Users className="w-4 h-4" />;
      case 'study-group':
        return <BookOpen className="w-4 h-4" />;
      case 'resource-sharing':
        return <HandHeart className="w-4 h-4" />;
      case 'help-wanted':
        return <HelpCircle className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getPostTypeDescription = (postType: string) => {
    switch (postType) {
      case 'question':
        return 'Ask for help or clarification on course topics';
      case 'discussion':
        return 'Start a general discussion or share ideas';
      case 'study-group':
        return 'Organize or join study groups with peers';
      case 'resource-sharing':
        return 'Share helpful resources, links, or materials';
      case 'help-wanted':
        return 'Looking for study buddies or collaboration';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-gray-200 rounded-2xl shadow-2xl">
        <DialogHeader className="pb-6 border-b border-gray-200">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
            <div className="p-2 bg-blue-600 rounded-lg">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            Create New Post
          </DialogTitle>
        </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-8 pt-6">
          {/* Post Type Selection */}
          <div className="space-y-4">
            <label className="text-sm font-semibold text-slate-700">
              Post Type *
            </label>
            <Select value={type} onValueChange={(value: any) => setType(value)}>
              <SelectTrigger className="w-full h-12 border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl bg-white/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  {getPostTypeIcon(type)}
                  <SelectValue placeholder="Select post type" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-md border-slate-200 rounded-xl shadow-xl">
                <SelectItem value="question" className="py-3 px-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="font-medium">Question</div>
                      <div className="text-xs text-slate-500">Ask for help or clarification</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="discussion" className="py-3 px-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-medium">Discussion</div>
                      <div className="text-xs text-slate-500">Start a general discussion</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="study-group" className="py-3 px-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4 text-violet-600" />
                    <div>
                      <div className="font-medium">Study Group</div>
                      <div className="text-xs text-slate-500">Organize study sessions</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="resource-sharing" className="py-3 px-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <HandHeart className="w-4 h-4 text-amber-600" />
                    <div>
                      <div className="font-medium">Resource Sharing</div>
                      <div className="text-xs text-slate-500">Share helpful materials</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="help-wanted" className="py-3 px-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-4 h-4 text-rose-600" />
                    <div>
                      <div className="font-medium">Help Wanted</div>
                      <div className="text-xs text-slate-500">Looking for collaboration</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-slate-600">
              {getPostTypeDescription(type)}
            </p>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-semibold text-slate-700">
              Title *
            </label>
            <Input
              id="title"
              placeholder="What's your question or topic?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full h-12 border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl bg-white/80 backdrop-blur-sm text-base"
              maxLength={200}
            />
            <div className="text-xs text-slate-500 text-right">
              {title.length}/200 characters
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-semibold text-slate-700">
              Content *
            </label>
            <TiptapEditor
              value={content}
              onChange={setContent}
              placeholder={`Provide more details about your question or topic...

Use the toolbar to:
• Format your text with bold, italic, and underline
• Add code blocks and LaTeX formulas
• Create lists and insert links`}
              className="min-h-[200px]"
            />
            <div className="text-xs text-slate-500 flex justify-between">
              <span>Rich text editor with LaTeX and code support</span>
              <span>{content.replace(/<[^>]*>/g, '').length} characters</span>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              Tags (optional)
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1"
                maxLength={20}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                disabled={!newTag.trim() || tags.length >= 5}
              >
                <Hash className="w-4 h-4" />
              </Button>
            </div>
            
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-blue-50 text-blue-700 cursor-pointer hover:bg-blue-100"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-500">
              {tags.length}/5 tags. Click on a tag to remove it.
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center gap-4 justify-end pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="border-gray-300 hover:bg-gray-50 px-6 py-2.5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || !content.trim() || isSubmitting}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2.5"
            >
              {getPostTypeIcon(type)}
              {isSubmitting ? 'Creating...' : `Create ${type.charAt(0).toUpperCase() + type.slice(1)}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
