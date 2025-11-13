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
    <div className="flex flex-col h-full pb-24">

      <div className="flex-1 min-h-0 min-w-0">
          <ConversationChatInterface courseId={courseId} />
      </div>
    </div>
  );
};

export default NewAIChatInterface;
