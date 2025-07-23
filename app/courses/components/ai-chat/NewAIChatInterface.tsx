"use client";
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RAGChatCourse from './RAGChatCourse';
import MaterialGenerationCourse from './MaterialGenerationCourse';
import MaterialsManagerCourse from './MaterialsManagerCourse';

interface NewAIChatInterfaceProps {
  courseId: string;
}

const NewAIChatInterface: React.FC<NewAIChatInterfaceProps> = ({ courseId }) => {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">AI Study Assistant</h1>
        <p className="text-gray-600 mt-1">Chat with your AI tutor and generate study materials</p>
      </div>
      
      <div className="flex-1 p-6 min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 max-w-md flex-shrink-0">
            <TabsTrigger value="chat">AI Chat</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="generate">Generate</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="flex-1 mt-6 min-h-0">
            <RAGChatCourse courseId={courseId} />
          </TabsContent>
          
          <TabsContent value="materials" className="flex-1 mt-6 min-h-0">
            <MaterialsManagerCourse courseId={courseId} />
          </TabsContent>
          
          <TabsContent value="generate" className="flex-1 mt-6 min-h-0">
            <MaterialGenerationCourse courseId={courseId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default NewAIChatInterface;
