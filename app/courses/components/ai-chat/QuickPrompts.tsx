"use client";
import React from 'react';
import { BookOpen, Lightbulb, HelpCircle, Calculator, FileText, Search, X } from 'lucide-react';

interface QuickPrompt {
  icon: React.ComponentType<any>;
  text: string;
  category: string;
}

interface QuickPromptsProps {
  onPromptSelect: (prompt: string) => void;
  onClose: () => void;
}

const QuickPrompts: React.FC<QuickPromptsProps> = ({ onPromptSelect, onClose }) => {
  const quickPrompts: QuickPrompt[] = [
    { icon: BookOpen, text: "Summarize today's lecture", category: "summary" },
    { icon: HelpCircle, text: "Explain this concept in simple terms", category: "explanation" },
    { icon: Calculator, text: "Help me solve this problem", category: "problem" },
    { icon: Lightbulb, text: "What should I focus on for the exam?", category: "study" },
    { icon: FileText, text: "Key points from Chapter 3", category: "summary" },
    { icon: Search, text: "Find information about...", category: "search" },
  ];

  return (
    <div className="p-4 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700">Quick Prompts</h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {quickPrompts.map((prompt, index) => (
          <button
            key={index}
            onClick={() => onPromptSelect(prompt.text)}
            className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
          >
            <prompt.icon className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-700">{prompt.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickPrompts;
