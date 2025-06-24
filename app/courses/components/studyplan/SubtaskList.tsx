"use client";
import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, Clock, BookOpen, Brain, FileText, HelpCircle, Edit2 } from 'lucide-react';
import { Subtask } from './types';

interface SubtaskListProps {
  taskId: string;
}

const SubtaskList: React.FC<SubtaskListProps> = ({ taskId }) => {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubtasks = async () => {
      setIsLoading(true);
      const mockSubtasks: Subtask[] = [
        {
          id: 'st1',
          taskId: 't1',
          name: 'Read pages 45-60',
          type: 'reading',
          estimatedTimeMinutes: 25,
          completed: true,
          order: 1,
          createdAt: '2024-11-01',
          updatedAt: '2024-11-01'
        },
        {
          id: 'st2',
          taskId: 't1',
          name: 'Complete practice problems',
          type: 'practice',
          estimatedTimeMinutes: 20,
          completed: false,
          order: 2,
          createdAt: '2024-11-01',
          updatedAt: '2024-11-01'
        },
        {
          id: 'st3',
          taskId: 't1',
          name: 'Create summary notes',
          type: 'review',
          estimatedTimeMinutes: 15,
          completed: false,
          order: 3,
          createdAt: '2024-11-01',
          updatedAt: '2024-11-01'
        }
      ];
      
      setTimeout(() => {
        const taskSubtasks = mockSubtasks.filter(subtask => subtask.taskId === taskId);
        setSubtasks(taskSubtasks.sort((a, b) => a.order - b.order));
        setIsLoading(false);
      }, 200);
    };

    fetchSubtasks();
  }, [taskId]);

  const handleSubtaskToggle = (subtaskId: string) => {
    setSubtasks(prev => prev.map(subtask => 
      subtask.id === subtaskId 
        ? { ...subtask, completed: !subtask.completed }
        : subtask
    ));
  };

  const getTypeIcon = (type: Subtask['type']) => {
    switch (type) {
      case 'reading': return <BookOpen className="w-4 h-4 text-blue-500" />;
      case 'practice': return <Edit2 className="w-4 h-4 text-orange-500" />;
      case 'review': return <FileText className="w-4 h-4 text-green-500" />;
      default: return <Circle className="w-4 h-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-5 h-5 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-sm text-gray-600">Loading subtasks...</span>
      </div>
    );
  }

  const completedCount = subtasks.filter(s => s.completed).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium text-gray-700">
          Subtasks ({completedCount}/{subtasks.length})
        </h5>
      </div>

      <div className="space-y-2">
        {subtasks.map(subtask => (
          <div key={subtask.id} className={`flex items-center space-x-3 p-3 rounded-lg border ${
            subtask.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
          }`}>
            <button
              onClick={() => handleSubtaskToggle(subtask.id)}
              className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                subtask.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'
              }`}
            >
              {subtask.completed && <CheckCircle className="w-3 h-3 text-white" />}
            </button>

            <div className="flex-shrink-0">
              {getTypeIcon(subtask.type)}
            </div>

            <div className="flex-1">
              <p className={`text-sm font-medium ${
                subtask.completed ? 'line-through text-gray-500' : 'text-gray-800'
              }`}>
                {subtask.name}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-gray-500">{subtask.type}</span>
                <span className="text-xs text-gray-500">{subtask.estimatedTimeMinutes} min</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubtaskList; 