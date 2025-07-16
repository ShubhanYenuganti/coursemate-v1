"use client"

import React, { useState } from 'react';
import { Sidebar } from '../../dashboard/components/sidebar';
import useAuthRedirect from "@/hooks/useAuthRedirect"
import RAGChat from '../components/RAGChat';
import MaterialsManager from '../components/MaterialsManager';
import MaterialGenerationInterface from '../components/MaterialGenerationInterface';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EnhancedChatPage() {
  const loading = useAuthRedirect()
  const [activeTab, setActiveTab] = useState('chat');

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">AI Study Assistant</h1>
          <p className="text-gray-600 mt-1">Upload materials and chat with your AI tutor</p>
        </div>
        
        <div className="flex-1 p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="chat">AI Chat</TabsTrigger>
              <TabsTrigger value="materials">Materials</TabsTrigger>
              <TabsTrigger value="generate">Generate</TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="flex-1 mt-6">
              <RAGChat />
            </TabsContent>
            
            <TabsContent value="materials" className="flex-1 mt-6">
              <MaterialsManager />
            </TabsContent>
            
            <TabsContent value="generate" className="flex-1 mt-6">
              <MaterialGenerationInterface />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
