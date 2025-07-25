"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, FileText, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { conversationService } from './conversationService';
import { 
  Message, 
  Conversation, 
  ConversationMessage, 
  ConversationWithMessages 
} from './types';

interface RAGChatCourseProps {
  courseId: string;
  conversationId?: string;
  onConversationUpdate?: (conversation: Conversation) => void;
}

export default function RAGChatCourse({ 
  courseId, 
  conversationId,
  onConversationUpdate 
}: RAGChatCourseProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<ConversationWithMessages | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation when conversationId changes
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      // Clear messages if no conversation is selected
      setMessages([]);
      setCurrentConversation(null);
    }
  }, [conversationId]);

  const loadConversation = async (convId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const conversation = await conversationService.getConversation(convId);
      setCurrentConversation(conversation);
      
      // Convert ConversationMessage[] to Message[]
      const convertedMessages: Message[] = conversation.messages.map(msg => ({
        id: msg.id,
        type: msg.message_type,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        source_files: msg.metadata?.source_files,
        confidence: msg.metadata?.confidence,
      }));
      
      setMessages(convertedMessages);
    } catch (error) {
      console.error('Failed to load conversation:', error);
      setError(error instanceof Error ? error.message : 'Failed to load conversation');
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const showWelcomeMessage = !conversationId || messages.length === 0;

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !conversationId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await conversationService.sendMessage({
        message: userMessage.content,
        conversation_id: conversationId,
        course_id: courseId,
      });

      if (response.success && response.message) {
        const assistantMessage: Message = {
          id: response.message.id,
          type: 'assistant',
          content: response.message.content,
          timestamp: new Date(response.message.created_at),
          source_files: response.message.metadata?.source_files,
          confidence: response.message.metadata?.confidence,
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        // Update the conversation in the sidebar
        if (currentConversation && onConversationUpdate) {
          const updatedConversation: Conversation = {
            ...currentConversation,
            message_count: currentConversation.message_count + 2, // user + assistant message
            last_message_preview: assistantMessage.content.substring(0, 100) + '...',
            updated_at: new Date().toISOString(),
          };
          onConversationUpdate(updatedConversation);
        }
      } else {
        throw new Error(response.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I apologize, but I encountered an error: ${error instanceof Error ? error.message : 'Unknown error occurred'}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-sm border">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">
            {currentConversation ? currentConversation.title : 'AI Study Assistant'}
          </h2>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {conversationId 
            ? 'Continue your conversation with the AI assistant'
            : 'Select or create a conversation to get started'
          }
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {showWelcomeMessage && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-blue-600" />
            </div>
            <Card className="bg-gray-50">
              <CardContent className="p-3">
                <p className="text-sm">
                  Hello! I'm your AI study assistant for this course. I can help you understand concepts, 
                  find specific information, and answer questions based on your course materials. 
                  How can I help you today?
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.type === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-blue-600" />
              </div>
            )}
            
            <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : ''}`}>
              <Card className={`${message.type === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-50'}`}>
                <CardContent className="p-3">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Sources */}
                  {message.source_files && message.source_files.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-600 mb-2">Sources:</p>
                      <div className="space-y-1">
                        {message.source_files.map((source, index) => {
                          // Handle both string and object formats for backward compatibility
                          const filename = typeof source === 'string' ? source : source?.title || 'Unknown source';
                          return (
                            <div key={index} className="flex items-center gap-2 text-xs">
                              <FileText className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <span className="text-gray-700">{filename}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Confidence Score */}
                  {message.confidence !== undefined && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">Confidence:</span>
                        <Badge 
                          variant={message.confidence > 0.7 ? "default" : message.confidence > 0.4 ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          {(message.confidence * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <p className="text-xs text-gray-500 mt-1 px-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>

            {message.type === 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-blue-600" />
            </div>
            <Card className="bg-gray-50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        {!conversationId ? (
          <div className="text-center text-gray-500 py-4">
            <p className="text-sm">Create or select a conversation to start chatting</p>
          </div>
        ) : (
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your course materials..."
              className="resize-none min-h-[40px] max-h-[120px]"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="px-3 h-10"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
