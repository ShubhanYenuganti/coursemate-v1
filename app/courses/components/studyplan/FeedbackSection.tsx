"use client";
import React from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, Clock, Target, Calendar } from 'lucide-react';
import { StudyPlanStats, Goal } from './types';

interface FeedbackSectionProps {
  stats: StudyPlanStats;
  goals: Goal[];
}

const FeedbackSection: React.FC<FeedbackSectionProps> = ({ stats, goals }) => {
  const generateInsights = () => {
    const insights = [];
    
    // Progress insights
    if (stats.averageCompletionRate >= 80) {
      insights.push({
        type: 'success',
        icon: <CheckCircle className="w-5 h-5 text-green-500" />,
        title: 'Great Progress!',
        message: `You're doing excellent with ${Math.round(stats.averageCompletionRate)}% completion rate.`
      });
    } else if (stats.averageCompletionRate >= 60) {
      insights.push({
        type: 'warning',
        icon: <TrendingUp className="w-5 h-5 text-orange-500" />,
        title: 'Good Progress',
        message: `You're on track with ${Math.round(stats.averageCompletionRate)}% completion. Keep it up!`
      });
    } else {
      insights.push({
        type: 'alert',
        icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
        title: 'Need to Catch Up',
        message: `Your completion rate is ${Math.round(stats.averageCompletionRate)}%. Consider increasing daily study time.`
      });
    }

    // Overdue tasks
    if (stats.tasksOverdue > 0) {
      insights.push({
        type: 'alert',
        icon: <Calendar className="w-5 h-5 text-red-500" />,
        title: 'Overdue Tasks',
        message: `You have ${stats.tasksOverdue} overdue task${stats.tasksOverdue > 1 ? 's' : ''}. Focus on catching up!`
      });
    }

    // Time estimation
    const hoursRemaining = Math.round(stats.estimatedMinutesRemaining / 60);
    const activeGoals = goals.filter(g => !g.completed);
    if (activeGoals.length > 0 && hoursRemaining > 0) {
      const avgDailyTime = activeGoals.reduce((sum, goal) => sum + goal.workMinutesPerDay, 0) / activeGoals.length;
      const daysToComplete = Math.ceil((stats.estimatedMinutesRemaining) / avgDailyTime);
      
      insights.push({
        type: 'info',
        icon: <Clock className="w-5 h-5 text-blue-500" />,
        title: 'Time Estimate',
        message: `At your current pace, you'll complete all goals in approximately ${daysToComplete} days.`
      });
    }

    // Goal completion
    if (stats.completedGoals > 0) {
      insights.push({
        type: 'success',
        icon: <Target className="w-5 h-5 text-green-500" />,
        title: 'Goals Completed',
        message: `You've successfully completed ${stats.completedGoals} out of ${stats.totalGoals} goals. Well done!`
      });
    }

    return insights;
  };

  const insights = generateInsights();

  const getInsightBgColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-orange-50 border-orange-200';
      case 'alert': return 'bg-red-50 border-red-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Study Plan Analytics</h3>
          <p className="text-sm text-gray-600">Insights and recommendations for your progress</p>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm text-gray-600">{Math.round(stats.averageCompletionRate)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${stats.averageCompletionRate}%` }}
          />
        </div>
      </div>

      {/* Insights Grid */}
      <div className="space-y-4">
        {insights.map((insight, index) => (
          <div 
            key={index}
            className={`p-4 rounded-lg border ${getInsightBgColor(insight.type)}`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                {insight.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-800 mb-1">
                  {insight.title}
                </h4>
                <p className="text-sm text-gray-600">
                  {insight.message}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.completedTasks}</div>
          <div className="text-xs text-gray-600">Tasks Done</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.completedSubtasks}</div>
          <div className="text-xs text-gray-600">Subtasks Done</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{Math.round(stats.estimatedMinutesRemaining / 60)}</div>
          <div className="text-xs text-gray-600">Hours Left</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.totalGoals - stats.completedGoals}</div>
          <div className="text-xs text-gray-600">Active Goals</div>
        </div>
      </div>

      {/* Action Suggestions */}
      {stats.averageCompletionRate < 60 && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">💡 Suggestions to Improve</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Try breaking down large tasks into smaller subtasks</li>
            <li>• Consider adjusting your daily study time commitment</li>
            <li>• Focus on completing overdue items first</li>
            <li>• Set up study reminders or calendar blocks</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default FeedbackSection; 