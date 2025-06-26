"use client";
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Calendar, Clock, Edit, Play, Trash2 } from 'lucide-react';
import { TaskWithProgress } from './types';
import SubtaskList from './SubtaskList';
import TaskEditorModal from './TaskEditorModal';

interface TaskCardProps {
  task: TaskWithProgress;
  onTaskUpdated?: (task: TaskWithProgress) => void;
  onTaskDeleted?: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onTaskUpdated, onTaskDeleted }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

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

  const handleDeleteClick = () => {
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (onTaskDeleted) {
      onTaskDeleted(task.id);
    }
    setIsDeleteConfirmOpen(false);
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
              onClick={handleDeleteClick}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Task"
            >
              <Trash2 className="w-4 h-4" />
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
            <SubtaskList 
              taskId={task.id} 
              subtasks={task.subtasks} 
              onSubtaskDeleted={(subtaskId) => {
                // Update the local task state to reflect the deleted subtask
                const updatedTask = {
                  ...task,
                  subtasks: task.subtasks.filter(subtask => subtask.id !== subtaskId),
                  totalSubtasks: task.totalSubtasks - 1,
                  completedSubtasks: task.subtasks.find(s => s.id === subtaskId)?.completed 
                    ? task.completedSubtasks - 1 
                    : task.completedSubtasks
                };
                
                // Recalculate progress
                updatedTask.progress = updatedTask.totalSubtasks > 0
                  ? Math.round((updatedTask.completedSubtasks / updatedTask.totalSubtasks) * 100)
                  : 0;
                
                // Notify parent component
                if (onTaskUpdated) {
                  onTaskUpdated(updatedTask);
                }
              }}
            />
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

      {/* Delete Confirmation Dialog */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Delete Task</h3>
            <p className="mb-6">Are you sure you want to delete "{task.name}"? This will also delete all subtasks and cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TaskCard; 