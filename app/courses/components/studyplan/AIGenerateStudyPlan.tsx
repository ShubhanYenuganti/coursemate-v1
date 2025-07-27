"use client";
import React, { useState, useEffect } from 'react';
import { Brain, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Material {
  key: string;
  name: string;
  type: string;
  size: number;
  url: string;
  last_modified: string;
}

interface StudyPlanTask {
  name: string;
  description: string;
  estimated_hours: number;
  priority: 'high' | 'medium' | 'low';
  subtasks: StudyPlanSubtask[];
}

interface StudyPlanSubtask {
  name: string;
  description: string;
  estimated_minutes: number;
  type: 'reading' | 'flashcard' | 'quiz' | 'practice' | 'review' | 'other';
}

interface StudyPlan {
  goal_title: string;
  goal_description: string;
  tasks: StudyPlanTask[];
}

interface AIGenerateStudyPlanProps {
  courseId: string;
  onStudyPlanGenerated: (studyPlan: StudyPlan) => void;
  onStartGenerating?: () => void;
}

const AIGenerateStudyPlan: React.FC<AIGenerateStudyPlanProps> = ({ 
  courseId, 
  onStudyPlanGenerated,
  onStartGenerating
}) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);

  // Fetch materials for this course
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        setIsLoadingMaterials(true);
        const token = localStorage.getItem('token');
        if (!token) {
          toast.error('Not authenticated');
          setIsLoadingMaterials(false);
          return;
        }
        const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
        const response = await fetch(`${api}/api/courses/${courseId}/materials`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch materials');
        }

        const files = await response.json();
        // Filter for supported file types for AI processing
        const supportedTypes = ['pdf', 'docx', 'doc', 'txt'];
        const supportedMaterials = files.filter((file: any) => {
          const fileType = file.key.split('.').pop()?.toLowerCase() || '';
          return supportedTypes.includes(fileType);
        });

        setMaterials(supportedMaterials);
      } catch (error) {
        console.error('Error fetching materials:', error);
        toast.error('Failed to load materials');
      } finally {
        setIsLoadingMaterials(false);
      }
    };

    fetchMaterials();
  }, [courseId]);

  const handleGenerateStudyPlan = async () => {
    if (!selectedMaterial || !goalTitle.trim()) {
      toast.error('Please select a document and enter a goal title');
      return;
    }

    try {
      if (onStartGenerating) onStartGenerating();
      setIsGenerating(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/courses/${courseId}/generate-study-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          goal_title: goalTitle,
          goal_description: goalDescription,
          document_filename: selectedMaterial
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate study plan');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('Study plan generated successfully!');
        onStudyPlanGenerated(data.study_plan);
      } else {
        throw new Error(data.error || 'Failed to generate study plan');
      }
    } catch (error) {
      console.error('Error generating study plan:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate study plan');
    } finally {
      setIsGenerating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reading': return '📖';
      case 'flashcard': return '🃏';
      case 'quiz': return '📝';
      case 'practice': return '✏️';
      case 'review': return '🔄';
      case 'other': return '�';
      default: return '📋';
    }
  };

  if (isLoadingMaterials) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading materials...</span>
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Supported Documents</h3>
        <p className="text-gray-600 mb-4">
          Upload PDF, DOCX, DOC, or TXT files to generate AI study plans.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Brain className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl font-semibold text-gray-900">AI Study Plan Generator</h3>
      </div>

      <div className="space-y-6">
        {/* Document Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Document to Analyze
          </label>
          <select
            value={selectedMaterial}
            onChange={(e) => setSelectedMaterial(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Choose a document...</option>
            {materials.map((material) => (
              <option key={material.key} value={material.key}>
                {material.name} ({material.type ? material.type.toUpperCase() : 'UNKNOWN'})
              </option>
            ))}
          </select>
        </div>

        {/* Goal Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Study Goal Title *
          </label>
          <input
            type="text"
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
            placeholder="e.g., Master Calculus Fundamentals"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Goal Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Details (Optional)
          </label>
          <textarea
            value={goalDescription}
            onChange={(e) => setGoalDescription(e.target.value)}
            placeholder="Add any specific details about your learning goal..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerateStudyPlan}
          disabled={isGenerating || !selectedMaterial || !goalTitle.trim()}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating Study Plan...
            </>
          ) : (
            <>
              <Brain className="w-5 h-5" />
              Generate AI Study Plan
            </>
          )}
        </button>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="space-y-1 text-xs">
                <li>• AI analyzes your document content</li>
                <li>• Creates personalized tasks and subtasks</li>
                <li>• Estimates time requirements</li>
                <li>• Prioritizes learning activities</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIGenerateStudyPlan; 