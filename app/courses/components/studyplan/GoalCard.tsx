"use client";
import React, { useState } from 'react';
import { Target, Calendar, Clock, Trash2, AlertTriangle, ArrowRight } from 'lucide-react';
import { GoalWithProgress, TaskWithProgress } from './types';
import { useRouter } from 'next/navigation';

interface GoalCardProps {
  goal: GoalWithProgress;
  onGoalUpdated: (goal: GoalWithProgress) => void;
  onGoalDeleted: (goalId: string) => void;
  courseId: string;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, onGoalUpdated, onGoalDeleted, courseId }) => {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const router = useRouter();
  
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysUntilTarget = () => {
    const targetDate = new Date(goal.targetDate);
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilTarget = getDaysUntilTarget();
  const isOverdue = daysUntilTarget < 0;

  const handleViewDetails = () => {
    console.log('Navigating to goal detail page with ID:', goal.id);
    router.push(`/courses/${courseId}/goals/${goal.id}`);
  };

  const handleDeleteClick = () => {
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    onGoalDeleted(goal.id);
    setIsDeleteConfirmOpen(false);
  };

  const handleDeleteCancel = () => {
    setIsDeleteConfirmOpen(false);
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        {/* Goal Header */}
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Target className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
                {goal.progress === 100 && (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                    Completed
                  </span>
                )}
                {isOverdue && goal.progress < 100 && (
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                    Overdue
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Due {formatDate(goal.targetDate)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{goal.workMinutesPerDay} min/day</span>
                </div>
                <span className="capitalize">{goal.frequency}</span>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium">{goal.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(goal.progress)}`}
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {goal.completedTasks} of {goal.totalTasks} tasks completed
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={handleDeleteClick}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete Goal"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleViewDetails}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="View Details"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* View Details Button */}
          <button
            onClick={handleViewDetails}
            className="mt-4 w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <span>View Details</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Goal</h3>
            </div>
            
            <p className="mb-6 text-gray-700">
              Are you sure you want to delete <strong>"{goal.title}"</strong>? This will permanently delete this goal and all its tasks. This action cannot be undone.
            </p>
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={handleDeleteCancel}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GoalCard; 