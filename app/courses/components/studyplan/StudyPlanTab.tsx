"use client";
import React, { useState, useEffect } from 'react';
import { Plus, Target, Calendar, Clock } from 'lucide-react';
import { Goal, StudyPlanStats } from './types';
import GoalCard from './GoalCard';
import AddGoalModal from './AddGoalModal';
import FeedbackSection from './FeedbackSection';

interface StudyPlanTabProps {
  courseId: string;
}

// Mock data - replace with real API calls
const mockGoals: Goal[] = [
  {
    id: '1',
    courseId: 'course-1',
    title: 'Final Exam Preparation',
    targetDate: '2024-12-15',
    workMinutesPerDay: 60,
    frequency: 'daily',
    completed: false,
    createdAt: '2024-11-01',
    updatedAt: '2024-11-01'
  },
  {
    id: '2',
    courseId: 'course-1',
    title: 'Complete Assignment 3',
    targetDate: '2024-11-30',
    workMinutesPerDay: 45,
    frequency: 'weekly',
    customScheduleDays: ['monday', 'wednesday', 'friday'],
    completed: true,
    createdAt: '2024-11-01',
    updatedAt: '2024-11-25'
  },
  {
    id: '3',
    courseId: 'course-1',
    title: 'Master Chapter 5 Concepts',
    targetDate: '2024-12-01',
    workMinutesPerDay: 30,
    frequency: 'daily',
    completed: false,
    createdAt: '2024-11-01',
    updatedAt: '2024-11-01'
  }
];

const StudyPlanTab: React.FC<StudyPlanTabProps> = ({ courseId }) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [stats, setStats] = useState<StudyPlanStats | null>(null);
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call to fetch goals
    const fetchGoals = async () => {
      setIsLoading(true);
      // TODO: Replace with actual API call
      setTimeout(() => {
        setGoals(mockGoals.filter(goal => goal.courseId === courseId));
        setStats({
          totalGoals: 3,
          completedGoals: 1,
          totalTasks: 8,
          completedTasks: 5,
          totalSubtasks: 24,
          completedSubtasks: 15,
          averageCompletionRate: 62.5,
          tasksOverdue: 2,
          estimatedMinutesRemaining: 450
        });
        setIsLoading(false);
      }, 1000);
    };

    fetchGoals();
  }, [courseId]);

  const handleAddGoal = (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newGoal: Goal = {
      ...goalData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setGoals(prev => [...prev, newGoal]);
    setIsAddGoalModalOpen(false);
  };

  const handleGoalUpdate = (updatedGoal: Goal) => {
    setGoals(prev => prev.map(goal => 
      goal.id === updatedGoal.id ? updatedGoal : goal
    ));
  };

  const activeGoals = goals.filter(goal => !goal.completed);
  const completedGoals = goals.filter(goal => goal.completed);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-600">Loading study plan...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Study Plan</h2>
            <p className="text-gray-600">Track your goals and stay on schedule</p>
          </div>
        </div>
        <button
          onClick={() => setIsAddGoalModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Goal</span>
        </button>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-600">Active Goals</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-1">{activeGoals.length}</p>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-gray-600">Tasks Due</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.tasksOverdue}</p>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium text-gray-600">Est. Time Left</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-1">{Math.round(stats.estimatedMinutesRemaining / 60)}h</p>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">%</span>
              </div>
              <span className="text-sm font-medium text-gray-600">Completion</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-1">{Math.round(stats.averageCompletionRate)}%</p>
          </div>
        </div>
      )}

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
            <span>Active Goals</span>
            <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
              {activeGoals.length}
            </span>
          </h3>
          <div className="space-y-3">
            {activeGoals.map(goal => (
              <GoalCard 
                key={goal.id} 
                goal={goal} 
                onUpdate={handleGoalUpdate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
            <span>Completed Goals</span>
            <span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded-full">
              {completedGoals.length}
            </span>
          </h3>
          <div className="space-y-3">
            {completedGoals.map(goal => (
              <GoalCard 
                key={goal.id} 
                goal={goal} 
                onUpdate={handleGoalUpdate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {goals.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">No study goals yet</h3>
          <p className="text-gray-600 mb-6">Create your first goal to start tracking your progress</p>
          <button
            onClick={() => setIsAddGoalModalOpen(true)}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create Your First Goal</span>
          </button>
        </div>
      )}

      {/* Feedback Section */}
      {stats && goals.length > 0 && (
        <FeedbackSection stats={stats} goals={goals} />
      )}

      {/* Add Goal Modal */}
      <AddGoalModal
        isOpen={isAddGoalModalOpen}
        onClose={() => setIsAddGoalModalOpen(false)}
        onSubmit={handleAddGoal}
        courseId={courseId}
      />
    </div>
  );
};

export default StudyPlanTab; 