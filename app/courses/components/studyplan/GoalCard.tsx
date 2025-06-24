"use client";
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Target, Calendar, Clock, Trash2 } from 'lucide-react';
import { GoalWithProgress, TaskWithProgress } from './types';
import TaskList from './TaskList';

interface GoalCardProps {
  goal: GoalWithProgress;
  onGoalUpdated: (goal: GoalWithProgress) => void;
  onGoalDeleted: (goalId: string) => void;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, onGoalUpdated, onGoalDeleted }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
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

  const handleTaskUpdated = (updatedTask: TaskWithProgress) => {
    // Update the goal's progress based on task updates
    const updatedGoal: GoalWithProgress = {
      ...goal,
      progress: Math.round((goal.completedTasks / goal.totalTasks) * 100)
    };
    onGoalUpdated(updatedGoal);
  };

  return (
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
              onClick={() => onGoalDeleted(goal.id)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Goal"
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
      </div>

      {/* Expanded Tasks */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          <TaskList goalId={goal.id} onTaskUpdated={handleTaskUpdated} />
        </div>
      )}
    </div>
  );
};

export default GoalCard; 