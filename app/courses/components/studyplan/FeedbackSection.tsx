"use client";
import React from 'react';
import { TrendingUp, Clock, Target, AlertTriangle, CheckCircle } from 'lucide-react';
import { GoalWithProgress } from './types';

interface FeedbackSectionProps {
  goals: GoalWithProgress[];
}

const FeedbackSection: React.FC<FeedbackSectionProps> = ({ goals }) => {
  const calculateStats = () => {
    const totalGoals = goals.length;
    const completedGoals = goals.filter(goal => goal.completed).length;
    const activeGoals = totalGoals - completedGoals;
    
    const totalTasks = goals.reduce((sum, goal) => sum + goal.totalTasks, 0);
    const completedTasks = goals.reduce((sum, goal) => sum + goal.completedTasks, 0);
    
    const overdueGoals = goals.filter(goal => {
      const targetDate = new Date(goal.targetDate);
      const today = new Date();
      return targetDate < today && !goal.completed;
    });

    const averageProgress = totalGoals > 0 
      ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / totalGoals)
      : 0;

    return {
      totalGoals,
      completedGoals,
      activeGoals,
      totalTasks,
      completedTasks,
      overdueGoals: overdueGoals.length,
      averageProgress
    };
  };

  const stats = calculateStats();

  const getInsights = () => {
    const insights = [];

    if (stats.overdueGoals > 0) {
      insights.push({
        type: 'warning',
        icon: AlertTriangle,
        message: `You're behind on ${stats.overdueGoals} goal${stats.overdueGoals > 1 ? 's' : ''}`,
        color: 'text-orange-600'
      });
    }

    if (stats.averageProgress > 80) {
      insights.push({
        type: 'success',
        icon: CheckCircle,
        message: `Great progress! You're ${stats.averageProgress}% complete on average`,
        color: 'text-green-600'
      });
    }

    if (stats.activeGoals > 0) {
      insights.push({
        type: 'info',
        icon: Target,
        message: `${stats.activeGoals} active goal${stats.activeGoals > 1 ? 's' : ''} remaining`,
        color: 'text-blue-600'
      });
    }

    if (stats.totalTasks > 0) {
      const taskCompletionRate = Math.round((stats.completedTasks / stats.totalTasks) * 100);
      insights.push({
        type: 'info',
        icon: TrendingUp,
        message: `${taskCompletionRate}% of tasks completed (${stats.completedTasks}/${stats.totalTasks})`,
        color: 'text-purple-600'
      });
    }

    return insights;
  };

  const insights = getInsights();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Study Insights</h3>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{stats.totalGoals}</div>
          <div className="text-sm text-gray-600">Total Goals</div>
        </div>
        
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{stats.completedGoals}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{stats.overdueGoals}</div>
          <div className="text-sm text-gray-600">Overdue</div>
        </div>
        
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{stats.averageProgress}%</div>
          <div className="text-sm text-gray-600">Avg Progress</div>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Recent Insights</h4>
          {insights.map((insight, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <insight.icon className={`w-4 h-4 ${insight.color}`} />
              <span className="text-sm text-gray-700">{insight.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {stats.totalGoals > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Recommendations</h4>
          <div className="space-y-2">
            {stats.overdueGoals > 0 && (
              <div key="rec-overdue" className="text-sm text-gray-600">
                • Focus on overdue goals first to get back on track
              </div>
            )}
            {stats.averageProgress < 50 && (
              <div key="rec-progress" className="text-sm text-gray-600">
                • Consider breaking down larger goals into smaller tasks
              </div>
            )}
            {stats.activeGoals > 3 && (
              <div key="rec-active" className="text-sm text-gray-600">
                • You have many active goals - consider prioritizing the most important ones
              </div>
            )}
            {stats.totalGoals === 0 && (
              <div key="rec-empty" className="text-sm text-gray-600">
                • Create your first study goal to start tracking progress
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackSection; 