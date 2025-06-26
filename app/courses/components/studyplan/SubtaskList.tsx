"use client";
import React, { useState } from 'react';
import { CheckCircle, Circle, Clock, BookOpen, Brain, Target, FileText, Zap, Trash2 } from 'lucide-react';
import { Subtask } from './types';
import { toast } from 'react-hot-toast';

interface SubtaskListProps {
  taskId: string;
  subtasks: Subtask[];
  onSubtaskDeleted?: (subtaskId: string) => void;
}

const SubtaskList: React.FC<SubtaskListProps> = ({ taskId, subtasks, onSubtaskDeleted }) => {
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(subtasks);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleToggleSubtask = (subtaskId: string) => {
    setLocalSubtasks(prev => 
      prev.map(subtask => 
        subtask.id === subtaskId 
          ? { ...subtask, completed: !subtask.completed }
          : subtask
      )
    );
  };

  const handleDeleteClick = (subtaskId: string) => {
    setDeleteConfirmId(subtaskId);
  };

  const handleDeleteConfirm = async (subtaskId: string) => {
    try {
      const response = await fetch(`/api/goals/tasks/subtasks/${subtaskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete subtask');
      }

      // Remove the subtask from local state
      setLocalSubtasks(prev => prev.filter(subtask => subtask.id !== subtaskId));
      
      // Call the parent callback if provided
      if (onSubtaskDeleted) {
        onSubtaskDeleted(subtaskId);
      }
      
      toast.success('Subtask deleted successfully');
    } catch (error) {
      console.error('Error deleting subtask:', error);
      toast.error('Failed to delete subtask. Please try again.');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmId(null);
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
          
          {deleteConfirmId === subtask.id ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDeleteConfirm(subtask.id)}
                className="p-1 text-white bg-red-500 rounded hover:bg-red-600 transition-colors"
                title="Confirm Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancelDelete}
                className="p-1 text-gray-600 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                title="Cancel"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleDeleteClick(subtask.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              title="Delete Subtask"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default SubtaskList; 