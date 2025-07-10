"use client";
import React from 'react';
import { Clock, Target, CheckCircle, ArrowRight } from 'lucide-react';

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
  type: 'reading' | 'practice' | 'review' | 'assessment';
}

interface StudyPlan {
  goal_title: string;
  goal_description: string;
  tasks: StudyPlanTask[];
}

interface GeneratedStudyPlanProps {
  studyPlan: StudyPlan;
  onUsePlan: (studyPlan: StudyPlan) => void;
  onRegenerate: () => void;
}

const GeneratedStudyPlan: React.FC<GeneratedStudyPlanProps> = ({ 
  studyPlan, 
  onUsePlan, 
  onRegenerate 
}) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reading': return '📖';
      case 'practice': return '✏️';
      case 'review': return '🔄';
      case 'assessment': return '📝';
      default: return '📋';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'reading': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'practice': return 'bg-green-50 text-green-700 border-green-200';
      case 'review': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'assessment': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const totalHours = studyPlan.tasks.reduce((sum, task) => sum + task.estimated_hours, 0);
  const totalSubtasks = studyPlan.tasks.reduce((sum, task) => sum + task.subtasks.length, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Target className="w-6 h-6 text-green-600" />
          <h3 className="text-xl font-semibold text-gray-900">Generated Study Plan</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onUsePlan(studyPlan)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Use This Plan
          </button>
          <button
            onClick={onRegenerate}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* Plan Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-2">{studyPlan.goal_title}</h4>
        {studyPlan.goal_description && (
          <p className="text-gray-600 mb-3">{studyPlan.goal_description}</p>
        )}
        <div className="flex gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{totalHours} hours total</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="w-4 h-4" />
            <span>{studyPlan.tasks.length} tasks</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            <span>{totalSubtasks} subtasks</span>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="space-y-4">
        {studyPlan.tasks.map((task, taskIndex) => (
          <div key={taskIndex} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h5 className="text-lg font-semibold text-gray-900 mb-1">{task.name}</h5>
                <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    <Clock className="w-4 h-4 inline mr-1" />
                    {task.estimated_hours} hour{task.estimated_hours !== 1 ? 's' : ''}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(task.priority)}`}>
                    {task.priority} priority
                  </span>
                </div>
              </div>
            </div>

            {/* Subtasks */}
            <div className="space-y-2">
              <h6 className="text-sm font-medium text-gray-700 mb-2">Subtasks:</h6>
              {task.subtasks.map((subtask, subtaskIndex) => (
                <div key={subtaskIndex} className="bg-gray-50 rounded-md p-3 ml-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getTypeIcon(subtask.type)}</span>
                        <span className="font-medium text-gray-900">{subtask.name}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{subtask.description}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {subtask.estimated_minutes} min
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full border ${getTypeColor(subtask.type)}`}>
                          {subtask.type}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex gap-3">
          <button
            onClick={() => onUsePlan(studyPlan)}
            className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Use This Study Plan
          </button>
          <button
            onClick={onRegenerate}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Generate New Plan
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeneratedStudyPlan; 