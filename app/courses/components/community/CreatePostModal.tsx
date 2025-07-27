"use client"

import React, { useState } from 'react';
import { X, Send, Hash, MessageSquare, Users, BookOpen, HandHeart, HelpCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Select from 'react-select';
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
  const postTypeOptions = [
    { value: 'question', label: 'Question', icon: <MessageSquare className="w-4 h-4 text-blue-600" />, description: 'Ask for help or clarification' },
    { value: 'discussion', label: 'Discussion', icon: <Users className="w-4 h-4 text-emerald-600" />, description: 'Start a general discussion' },
    { value: 'study-group', label: 'Study Group', icon: <BookOpen className="w-4 h-4 text-violet-600" />, description: 'Organize study sessions' },
    { value: 'resource-sharing', label: 'Resource Sharing', icon: <HandHeart className="w-4 h-4 text-amber-600" />, description: 'Share helpful materials' },
    { value: 'help-wanted', label: 'Help Wanted', icon: <HelpCircle className="w-4 h-4 text-rose-600" />, description: 'Looking for collaboration' },
  ];
  const [type, setType] = useState<{ value: string; label: string; icon: React.ReactNode; description: string }>(postTypeOptions[0]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setType(postTypeOptions[0]);
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
        type: type.value as ForumPost['type'],
        author: {
          id: 'current-user',
          name: 'Current User',
          role: 'student' as ForumPost['author']['role'],
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

  // Helper to get description for selected type
  const getPostTypeDescription = (typeObj: typeof postTypeOptions[0]) => typeObj?.description || '';

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
            <Select
              options={postTypeOptions}
              value={type}
              onChange={option => setType(option as typeof postTypeOptions[0])}
              formatOptionLabel={(option: any) => (
                <div className="flex items-center gap-3">
                  {option.icon}
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-slate-500 ml-2">{option.description}</span>
                </div>
              )}
              classNamePrefix="react-select"
              className="w-full"
              placeholder="Select post type"
              isSearchable={false}
              getOptionValue={option => option.value}
              getOptionLabel={option => option.label}
            />
            <p className="text-sm text-slate-600">
              {type.description}
            </p>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-semibold text-slate-700">
              Title *
            </label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter a concise title for your post"
              className="w-full"
              maxLength={100}
              required
            />
          </div>
          {/* Content Editor */}
          <div className="space-y-2">
            <TiptapEditor
              value={content}
              onChange={setContent}
              placeholder={`Provide more details about your question or topic...
\nUse the toolbar to:\n• Format your text with bold, italic, and underline\n• Add code blocks and LaTeX formulas\n• Create lists and insert links`}
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
              {type.icon}
              {isSubmitting ? 'Creating...' : `Create ${type.label}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
