"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, FileText, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  source_files?: string[];
  confidence?: number;
}

export default function RAGChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your AI study assistant. Upload some materials using the Materials tab, then ask me any questions about your content. I can help you understand concepts, find specific information, and generate study materials.',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/materials/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage.content,
          top_k: 5
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.answer,
        timestamp: new Date(),
        source_files: data.source_files,
        confidence: data.confidence,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error while processing your question. Please make sure you have uploaded some materials and try again.',
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
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">AI Study Assistant</h2>
        </div>
        <p className="text-sm text-gray-600 mt-1">Ask questions about your uploaded materials</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                        {message.source_files.map((filename, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs">
                            <FileText className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-700">{filename}</span>
                          </div>
                        ))}
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
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about your materials..."
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
      </div>
    </div>
  );
}
