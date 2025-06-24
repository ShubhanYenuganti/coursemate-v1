"use client";
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Calendar, Clock, CheckCircle, Edit, Play } from 'lucide-react';
import { Task } from './types';
import SubtaskList from './SubtaskList';

interface TaskCardProps {
  task: Task;
  onUpdate: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Mock subtask progress - replace with real data
  const completedSubtasks = Math.floor(Math.random() * 3) + 1;
  const totalSubtasks = 3;
  const subtaskProgress = Math.round((completedSubtasks / totalSubtasks) * 100);
  
  const handleToggleComplete = () => {
    onUpdate({ ...task, completed: !task.completed });
  };

  const handleContinueTask = () => {
    // TODO: Navigate to focused study session for this task
    console.log('Continue task:', task.id);
  };

  const isOverdue = new Date(task.scheduledDate) < new Date() && !task.completed;
  const isDueToday = new Date(task.scheduledDate).toDateString() === new Date().toDateString();

  const getDateColor = () => {
    if (task.completed) return 'text-green-600';
    if (isOverdue) return 'text-red-600';
    if (isDueToday) return 'text-orange-600';
    return 'text-gray-600';
  };

  const getDateText = () => {
    if (isOverdue) return 'Overdue';
    if (isDueToday) return 'Due today';
    return new Date(task.scheduledDate).toLocaleDateString();
  };

  return (
    <div className={`bg-gray-50 rounded-lg border transition-all duration-200 ${
      task.completed ? 'border-green-200 bg-green-50' : 'border-gray-200 hover:border-gray-300'
    }`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start space-x-3 flex-1">
            <button
              onClick={handleToggleComplete}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors mt-0.5 ${
                task.completed 
                  ? 'bg-green-500 border-green-500' 
                  : 'border-gray-300 hover:border-green-400'
              }`}
            >
              {task.completed && <CheckCircle className="w-3 h-3 text-white" />}
            </button>
            
            <div className="flex-1 min-w-0">
              <h4 className={`font-medium text-gray-800 ${
                task.completed ? 'line-through' : ''
              }`}>
                {task.name}
              </h4>
              
              {/* Task Details */}
              <div className="flex items-center space-x-4 mt-1 text-sm">
                <div className={`flex items-center space-x-1 ${getDateColor()}`}>
                  <Calendar className="w-3 h-3" />
                  <span>{getDateText()}</span>
                </div>
                
                {!task.completed && (
                  <div className="flex items-center space-x-1 text-gray-600">
                    <Clock className="w-3 h-3" />
                    <span>{completedSubtasks}/{totalSubtasks} subtasks</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {/* Continue Button */}
            {!task.completed && (
              <button
                onClick={handleContinueTask}
                className="p-2 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                title="Continue task"
              >
                <Play className="w-4 h-4" />
              </button>
            )}

            {/* Edit Button */}
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Edit task"
            >
              <Edit className="w-4 h-4" />
            </button>

            {/* Expand Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar (only show if not completed) */}
        {!task.completed && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600">Subtask Progress</span>
              <span className="text-xs text-gray-600">{subtaskProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${subtaskProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Expanded Content - Subtasks */}
        {isExpanded && (
          <div className="border-t border-gray-200 pt-3 mt-3">
            <SubtaskList taskId={task.id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard; 