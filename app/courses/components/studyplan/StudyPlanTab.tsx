"use client";
import React, { useState } from 'react';
import { Plus, Target, TrendingUp } from 'lucide-react';
import { getGoalsWithProgress } from './mockData';
import { GoalWithProgress, Goal, Task, Subtask } from './types';
import GoalCard from './GoalCard';
import AddGoalModal from './AddGoalModal';
import TaskScaffoldingScreen from './TaskScaffoldingScreen';
import FeedbackSection from './FeedbackSection';

interface StudyPlanTabProps {
  courseId: string;
}

const StudyPlanTab: React.FC<StudyPlanTabProps> = ({ courseId }) => {
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [isScaffoldingOpen, setIsScaffoldingOpen] = useState(false);
  const [newGoal, setNewGoal] = useState<GoalWithProgress | null>(null);
  const [goals, setGoals] = useState<GoalWithProgress[]>(() => getGoalsWithProgress(courseId));

  const handleGoalAdded = (goal: GoalWithProgress) => {
    setNewGoal(goal);
    setIsAddGoalModalOpen(false);
    setIsScaffoldingOpen(true);
  };

  const handleScaffoldingSave = (tasks: Task[], subtasks: Subtask[]) => {
    // In a real app, you would save these to the backend
    // For now, we'll just add the goal to our local state
    if (newGoal) {
      const updatedGoal: GoalWithProgress = {
        ...newGoal,
        progress: 0,
        totalTasks: tasks.length,
        completedTasks: 0
      };
      setGoals(prev => [...prev, updatedGoal]);
    }
    setIsScaffoldingOpen(false);
    setNewGoal(null);
  };

  const handleScaffoldingBack = () => {
    setIsScaffoldingOpen(false);
    setNewGoal(null);
  };

  const handleGoalUpdated = (updatedGoal: GoalWithProgress) => {
    setGoals(prev => prev.map(goal => goal.id === updatedGoal.id ? updatedGoal : goal));
  };

  const handleGoalDeleted = (goalId: string) => {
    setGoals(prev => prev.filter(goal => goal.id !== goalId));
  };

  if (isScaffoldingOpen && newGoal) {
    return (
      <TaskScaffoldingScreen
        goal={newGoal}
        onBack={handleScaffoldingBack}
        onSave={handleScaffoldingSave}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Study Plan</h2>
          <p className="text-gray-600 mt-1">
            Track your learning goals and progress for this course
          </p>
        </div>
        <button
          onClick={() => setIsAddGoalModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Goal
        </button>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Study Goals Yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first study goal to start tracking your progress
          </p>
          <button
            onClick={() => setIsAddGoalModalOpen(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onGoalUpdated={handleGoalUpdated}
              onGoalDeleted={handleGoalDeleted}
            />
          ))}
        </div>
      )}

      {/* Feedback Section */}
      {goals.length > 0 && <FeedbackSection goals={goals} />}

      {/* Add Goal Modal */}
      <AddGoalModal
        isOpen={isAddGoalModalOpen}
        onClose={() => setIsAddGoalModalOpen(false)}
        courseId={courseId}
        onGoalAdded={handleGoalAdded}
      />
    </div>
  );
};

export default StudyPlanTab; 