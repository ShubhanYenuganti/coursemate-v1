"use client";

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QuizGenerator from './QuizGenerator';
import FlashcardGenerator from './FlashcardGenerator';
import SummaryGenerator from './SummaryGenerator';

interface MaterialGenerationCourseProps {
  courseId: string;
}

export default function MaterialGenerationCourse({ courseId }: MaterialGenerationCourseProps) {
  const [activeTab, setActiveTab] = useState('quiz');

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold">AI Study Material Generator</h2>
        </div>
        <p className="text-sm text-gray-600 mt-1">Generate quizzes, flashcards, and summaries from your course materials</p>
      </div>

      <div className="flex-1 p-4 min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
            <TabsTrigger value="quiz" className="flex items-center gap-2">
              Quiz
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="flex items-center gap-2">
              Flashcards
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              Summary
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quiz" className="flex-1 mt-4 min-h-0 overflow-y-auto">
            <QuizGenerator courseId={courseId} />
          </TabsContent>

          <TabsContent value="flashcards" className="flex-1 mt-4 min-h-0 overflow-y-auto">
            <FlashcardGenerator courseId={courseId} />
          </TabsContent>

          <TabsContent value="summary" className="flex-1 mt-4 min-h-0 overflow-y-auto">
            <SummaryGenerator courseId={courseId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}