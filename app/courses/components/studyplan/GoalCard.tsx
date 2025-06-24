"use client";
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Calendar, Clock, CheckCircle, Target, Edit } from 'lucide-react';
import { Goal } from './types';
import TaskList from './TaskList';

interface GoalCardProps {
  goal: Goal;
  onUpdate: (goal: Goal) => void;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Mock progress calculation - replace with real data
  const progress = goal.completed ? 100 : Math.floor(Math.random() * 80) + 10;
  const daysUntilDeadline = Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  
  const handleToggleComplete = () => {
    onUpdate({ ...goal, completed: !goal.completed });
  };

  const getFrequencyDisplay = () => {
    if (goal.frequency === 'daily') return 'Daily';
    if (goal.frequency === 'weekly') return 'Weekly';
    if (goal.frequency === 'custom' && goal.customScheduleDays) {
      return goal.customScheduleDays.map(day => day.charAt(0).toUpperCase() + day.slice(1, 3)).join(', ');
    }
    return 'Custom';
  };

  const getStatusColor = () => {
    if (goal.completed) return 'bg-green-500';
    if (daysUntilDeadline < 0) return 'bg-red-500';
    if (daysUntilDeadline <= 3) return 'bg-orange-500';
    return 'bg-blue-500';
  };

  const getStatusText = () => {
    if (goal.completed) return 'Completed';
    if (daysUntilDeadline < 0) return `${Math.abs(daysUntilDeadline)} days overdue`;
    if (daysUntilDeadline === 0) return 'Due today';
    if (daysUntilDeadline === 1) return 'Due tomorrow';
    return `${daysUntilDeadline} days left`;
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 transition-all duration-200 ${
      goal.completed ? 'opacity-75' : 'hover:shadow-md'
    }`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3 flex-1">
            <button
              onClick={handleToggleComplete}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                goal.completed 
                  ? 'bg-green-500 border-green-500' 
                  : 'border-gray-300 hover:border-green-400'
              }`}
            >
              {goal.completed && <CheckCircle className="w-4 h-4 text-white" />}
            </button>
            
            <div className="flex-1 min-w-0">
              <h3 className={`text-lg font-semibold text-gray-800 ${
                goal.completed ? 'line-through' : ''
              }`}>
                {goal.title}
              </h3>
              
              {/* Goal Details */}
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(goal.targetDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{goal.workMinutesPerDay} min/day</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Target className="w-4 h-4" />
                  <span>{getFrequencyDisplay()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Status Badge */}
            <div className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor()}`}>
              {getStatusText()}
            </div>

            {/* Edit Button */}
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Edit className="w-4 h-4" />
            </button>

            {/* Expand Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                goal.completed ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-gray-100 pt-4 mt-4">
            <TaskList goalId={goal.id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalCard; 