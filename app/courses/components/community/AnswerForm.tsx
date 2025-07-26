"use client"

import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import TiptapEditor from './TiptapEditor';

interface AnswerFormProps {
  onSubmit: (content: string) => void;
  onCancel: () => void;
}

export function AnswerForm({ onSubmit, onCancel }: AnswerFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent('');
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Count text content (excluding HTML tags) for character count
  const getTextContent = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  const textLength = getTextContent(content).length;

  return (
    <Card className="bg-white border-gray-200 shadow-lg rounded-2xl">
      <CardContent className="space-y-6 pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <TiptapEditor
            value={content}
            onChange={setContent}
            onCancel={onCancel}
            placeholder={`Share your knowledge and help the community...

Use the toolbar above to:
• Format text with bold, italic, and underline
• Add bulleted or numbered lists  
• Include code blocks and LaTeX formulas
• Insert links and structure your response`}
            className="min-h-[250px]"
          />
          
          <div className="flex items-center justify-between text-sm text-gray-600 pt-2">
            <div className="flex items-center gap-4">
              <span>Rich text editor with LaTeX and code support</span>
            </div>
            <div className="text-gray-500">
              {textLength} characters
            </div>
          </div>

          <div className="flex items-center gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Posting...' : 'Post Answer'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
