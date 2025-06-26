"use client";
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Calendar, Clock, Edit, Play } from 'lucide-react';
import { TaskWithProgress } from './types';
import SubtaskList from './SubtaskList';
import TaskEditorModal from './TaskEditorModal';

interface TaskCardProps {
  task: TaskWithProgress;
  onTaskUpdated?: (task: TaskWithProgress) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onTaskUpdated }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntilScheduled = () => {
    const scheduledDate = new Date(task.scheduledDate);
    const today = new Date();
    const diffTime = scheduledDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilScheduled = getDaysUntilScheduled();
  const isOverdue = daysUntilScheduled < 0;

  const handleTaskUpdated = (updatedTask: TaskWithProgress) => {
    if (onTaskUpdated) {
      onTaskUpdated(updatedTask);
    }
  };

  return (
    <>
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="font-medium text-gray-900">{task.name}</h4>
              {isOverdue && (
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                  Overdue
                </span>
              )}
            </div>
              
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(task.scheduledDate)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{task.completedSubtasks}/{task.totalSubtasks} subtasks</span>
              </div>
                </div>
                
            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium">{task.progress}%</span>
                  </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(task.progress)}`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
              <button
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Continue Task"
              >
                <Play className="w-4 h-4" />
              </button>
            <button
              onClick={() => setIsEditorOpen(true)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              title="Edit Task"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Expanded Subtasks */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <SubtaskList taskId={task.id} subtasks={task.subtasks} />
          </div>
        )}
      </div>

      {/* Task Editor Modal */}
      <TaskEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        task={task}
        onSave={handleTaskUpdated}
      />
    </>
  );
};

export default TaskCard; 