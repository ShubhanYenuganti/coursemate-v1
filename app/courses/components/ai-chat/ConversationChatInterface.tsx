"use client";

import React, { useState, useEffect } from 'react';
import ConversationSidebar from './ConversationSidebar';
import RAGChatCourse from './RAGChatCourse';
import { Conversation } from './types';
import { conversationService } from './conversationService';

interface ConversationChatInterfaceProps {
  courseId: string;
}

export default function ConversationChatInterface({ courseId }: ConversationChatInterfaceProps) {
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Auto-create first conversation if none exist
  useEffect(() => {
    const initializeConversations = async () => {
      try {
        const fetchedConversations = await conversationService.getConversations(courseId);
        setConversations(fetchedConversations);
        
        if (fetchedConversations.length === 0) {
          // Create a default conversation
          const defaultConversation = await conversationService.createConversation({
            title: 'Chat 1',
            course_id: courseId,
          });
          setConversations([defaultConversation]);
          setActiveConversationId(defaultConversation.id);
        } else {
          // Select the most recent conversation
          setActiveConversationId(fetchedConversations[0].id);
        }
      } catch (error) {
        console.error('Failed to initialize conversations:', error);
      }
    };

    initializeConversations();
  }, [courseId]);

  const handleConversationSelect = (conversationId: string) => {
    setActiveConversationId(conversationId);
  };

  const handleConversationCreate = (conversation: Conversation) => {
    setConversations(prev => [conversation, ...prev]);
    setActiveConversationId(conversation.id);
  };

  const handleConversationUpdate = (updatedConversation: Conversation) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === updatedConversation.id ? updatedConversation : conv
      )
    );
  };

  const handleConversationDelete = (conversationId: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    
    // If the deleted conversation was active, select another one
    if (conversationId === activeConversationId) {
      const remainingConversations = conversations.filter(conv => conv.id !== conversationId);
      if (remainingConversations.length > 0) {
        setActiveConversationId(remainingConversations[0].id);
      } else {
        setActiveConversationId(undefined);
      }
    }
  };

  return (
    <div className="flex h-full bg-white rounded-lg shadow-sm border overflow-hidden">
      <ConversationSidebar
        courseId={courseId}
        activeConversationId={activeConversationId}
        onConversationSelect={handleConversationSelect}
        onConversationCreate={handleConversationCreate}
        onConversationUpdate={handleConversationUpdate}
        onConversationDelete={handleConversationDelete}
      />
      
      <div className="flex-1">
        <RAGChatCourse
          courseId={courseId}
          conversationId={activeConversationId}
          onConversationUpdate={handleConversationUpdate}
        />
      </div>
    </div>
  );
}
