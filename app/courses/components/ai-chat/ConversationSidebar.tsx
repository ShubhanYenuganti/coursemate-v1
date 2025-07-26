"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  MessageSquare, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Check, 
  X,
  Clock,
  Loader2 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { conversationService } from './conversationService';
import { Conversation } from './types';

interface ConversationSidebarProps {
  courseId: string;
  activeConversationId?: string;
  onConversationSelect: (conversationId: string) => void;
  onConversationCreate: (conversation: Conversation) => void;
  onConversationUpdate: (conversation: Conversation) => void;
  onConversationDelete: (conversationId: string) => void;
}

export default function ConversationSidebar({
  courseId,
  activeConversationId,
  onConversationSelect,
  onConversationCreate,
  onConversationUpdate,
  onConversationDelete,
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, [courseId]);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedConversations = await conversationService.getConversations(courseId);
      setConversations(fetchedConversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  };

  const createNewConversation = async () => {
    try {
      setIsCreating(true);
      setError(null);
      const conversation = await conversationService.createConversation({
        title: `Chat ${conversations.length + 1}`,
        course_id: courseId,
      });
      
      setConversations(prev => [conversation, ...prev]);
      onConversationCreate(conversation);
      onConversationSelect(conversation.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      setError(error instanceof Error ? error.message : 'Failed to create conversation');
    } finally {
      setIsCreating(false);
    }
  };

  const startEditing = (conversation: Conversation) => {
    setEditingId(conversation.id);
    setEditTitle(conversation.title);
  };

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;

    try {
      const updatedConversation = await conversationService.updateConversation(
        editingId, 
        editTitle.trim()
      );
      
      setConversations(prev => 
        prev.map(conv => 
          conv.id === editingId ? updatedConversation : conv
        )
      );
      
      onConversationUpdate(updatedConversation);
      setEditingId(null);
      setEditTitle('');
    } catch (error) {
      console.error('Failed to update conversation:', error);
      setError(error instanceof Error ? error.message : 'Failed to update conversation');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const deleteConversation = async (conversationId: string) => {
    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }

    try {
      await conversationService.deleteConversation(conversationId);
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      onConversationDelete(conversationId);
      
      // If the deleted conversation was active, select the first available one
      if (conversationId === activeConversationId && conversations.length > 1) {
        const remainingConversations = conversations.filter(conv => conv.id !== conversationId);
        if (remainingConversations.length > 0) {
          onConversationSelect(remainingConversations[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete conversation');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Conversations</h2>
          <Button
            onClick={createNewConversation}
            size="sm"
            disabled={isCreating}
            className="h-8 w-8 p-0"
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {error && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Create a new conversation to get started
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  "group relative p-3 rounded-lg cursor-pointer transition-colors",
                  "hover:bg-white border",
                  activeConversationId === conversation.id
                    ? "bg-white border-blue-200 shadow-sm"
                    : "border-transparent hover:border-gray-200"
                )}
                onClick={() => onConversationSelect(conversation.id)}
              >
                {editingId === conversation.id ? (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-7 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                    />
                    <Button onClick={saveEdit} size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button onClick={cancelEdit} size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-gray-900 truncate">
                          {conversation.title}
                        </h3>
                        {conversation.last_message_preview && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {conversation.last_message_preview}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-400">
                            {formatTimestamp(conversation.updated_at)}
                          </span>
                          {conversation.message_count > 0 && (
                            <span className="text-xs text-gray-400">
                              • {conversation.message_count} messages
                            </span>
                          )}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32">
                          <DropdownMenuItem onClick={() => startEditing(conversation)}>
                            <Edit2 className="w-3 h-3 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteConversation(conversation.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
