"use client";
import React, { useState } from 'react';
import { CheckCircle, Circle, Clock, BookOpen, Brain, Target, FileText, Zap } from 'lucide-react';
import { Subtask } from './types';

interface SubtaskListProps {
  taskId: string;
  subtasks: Subtask[];
}

const SubtaskList: React.FC<SubtaskListProps> = ({ taskId, subtasks }) => {
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(subtasks);

  const handleToggleSubtask = (subtaskId: string) => {
    setLocalSubtasks(prev => 
      prev.map(subtask => 
        subtask.id === subtaskId 
          ? { ...subtask, completed: !subtask.completed }
          : subtask
      )
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reading':
        return <BookOpen className="w-4 h-4" />;
      case 'flashcard':
        return <Brain className="w-4 h-4" />;
      case 'quiz':
        return <Target className="w-4 h-4" />;
      case 'practice':
        return <Zap className="w-4 h-4" />;
      case 'review':
        return <FileText className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'reading':
        return 'text-blue-600';
      case 'flashcard':
        return 'text-purple-600';
      case 'quiz':
        return 'text-green-600';
      case 'practice':
        return 'text-orange-600';
      case 'review':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  if (localSubtasks.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p>No subtasks created yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {localSubtasks.map(subtask => (
        <div
          key={subtask.id}
          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
            subtask.completed 
              ? 'bg-green-50 border-green-200' 
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <button
            onClick={() => handleToggleSubtask(subtask.id)}
            className={`flex-shrink-0 transition-colors ${
              subtask.completed ? 'text-green-600' : 'text-gray-400 hover:text-green-600'
            }`}
          >
            {subtask.completed ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>

          <div className={`flex-shrink-0 ${getTypeColor(subtask.type)}`}>
            {getTypeIcon(subtask.type)}
          </div>

          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${
              subtask.completed ? 'text-gray-500 line-through' : 'text-gray-900'
            }`}>
              {subtask.name}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{subtask.estimatedTimeMinutes} min</span>
              </div>
              <span className="text-xs text-gray-400 capitalize">{subtask.type}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SubtaskList; 