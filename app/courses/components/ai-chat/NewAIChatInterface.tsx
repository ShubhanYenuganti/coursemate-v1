"use client";
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ConversationChatInterface from './ConversationChatInterface';
import MaterialGenerationCourse from './MaterialGenerationCourse';

interface NewAIChatInterfaceProps {
  courseId: string; // combo_id for conversations
  materialsDbId?: string; // individual db ID for materials (optional, defaults to courseId)
}

const NewAIChatInterface: React.FC<NewAIChatInterfaceProps> = ({ courseId, materialsDbId }) => {
  const [activeTab, setActiveTab] = useState('chat');
  
  // Use materialsDbId for materials-related components, fallback to courseId
  const dbId = materialsDbId || courseId;

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">AI Study Assistant</h1>
        <p className="text-gray-600 mt-1">Chat with your AI tutor and manage study materials</p>
      </div>
      
      <div className="flex-1 min-h-0 min-w-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0 mx-6 mt-6">
            <TabsTrigger value="chat">AI Chat</TabsTrigger>
            <TabsTrigger value="generate">Generate</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="flex-1 mt-6 min-h-0 px-6">
            <ConversationChatInterface courseId={courseId} />
          </TabsContent>
          
          <TabsContent value="generate" className="flex-1 mt-6 min-h-0">
            <MaterialGenerationCourse courseId={dbId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default NewAIChatInterface;
