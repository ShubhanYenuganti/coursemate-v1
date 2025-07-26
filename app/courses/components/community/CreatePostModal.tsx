"use client"

import React, { useState } from 'react';
import { X, Send, Hash, MessageSquare, Users, BookOpen, HandHeart, HelpCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Create New Post
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Post Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Post Type</label>
            <Select value={type} onValueChange={(value: 'question' | 'discussion' | 'study-group' | 'resource-sharing' | 'help-wanted') => setType(value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="question">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Question</div>
                      <div className="text-xs text-gray-500">Ask for help or clarification</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="discussion">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Discussion</div>
                      <div className="text-xs text-gray-500">Start a general discussion</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="study-group">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Study Group</div>
                      <div className="text-xs text-gray-500">Organize or join study groups</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="resource-sharing">
                  <div className="flex items-center gap-2">
                    <HandHeart className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Resource Sharing</div>
                      <div className="text-xs text-gray-500">Share helpful materials</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="help-wanted">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Help Wanted</div>
                      <div className="text-xs text-gray-500">Looking for study buddies</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">{getPostTypeDescription(type)}</p>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium text-gray-700">
              Title *
            </label>
            <Input
              id="title"
              placeholder="What's your question or topic?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full"
              maxLength={200}
            />
            <div className="text-xs text-gray-500 text-right">
              {title.length}/200 characters
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-medium text-gray-700">
              Content *
            </label>
            <Textarea
              id="content"
              placeholder="Provide more details about your question or topic..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              required
              className="w-full min-h-[200px]"
            />
            <div className="text-xs text-gray-500 flex justify-between">
              <span>Supports Markdown formatting</span>
              <span>{content.length} characters</span>
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
            <p className="text-xs text-gray-500">
              {tags.length}/5 tags. Click on a tag to remove it.
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center gap-3 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || !content.trim() || isSubmitting}
              className="gap-2"
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
