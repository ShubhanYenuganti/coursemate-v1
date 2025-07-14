"use client";
import React, { useState, useEffect } from 'react';
import { Plus, Target, TrendingUp, Brain, X } from 'lucide-react';
import { getGoalsWithProgress } from './mockData';
import { GoalWithProgress, Goal, Task, Subtask } from './types';
import GoalCard from './GoalCard';
import AddGoalModal from './AddGoalModal';
import FeedbackSection from './FeedbackSection';
import AIGenerateStudyPlan from './AIGenerateStudyPlan';
import GeneratedStudyPlan from './GeneratedStudyPlan';
import { toast } from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Portal } from '../../../../components/Portal';

interface StudyPlanTabProps {
  courseId: string;
}

function formatDate(dateString: string) {
  const [year, month, day] = dateString.split('T')[0].split('-');
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const StudyPlanTab: React.FC<StudyPlanTabProps> = ({ courseId }) => {
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [generatedStudyPlan, setGeneratedStudyPlan] = useState<any>(null);
  const [isAIGenerating, setIsAIGenerating] = useState(false);

  // Fetch goals from the backend
  useEffect(() => {
    const fetchGoals = async () => {
      setLoading(true);
      try {
        const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
        const response = await fetch(`${api}/api/courses/${courseId}/goals`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch goals');
        }

        const data = await response.json();

        // Transform backend data to match frontend types
        const transformedGoals: GoalWithProgress[] = data.map((goal: any) => {
          console.log('Processing goal from API:', goal);
          return {
            id: goal.goal_id || goal.id, // Handle both ID formats
            courseId: courseId,
            title: goal.goal_descr,
            targetDate: formatDate(goal.due_date || new Date().toISOString()),
            workMinutesPerDay: 60, // Default value
            frequency: 'daily', // Default value
            createdAt: goal.created_at,
            updatedAt: goal.updated_at,
            progress: goal.progress || 0,
            totalTasks: goal.total_tasks || 0,
            completedTasks: goal.completed_tasks || 0,
            completed: goal.goal_completed || false
          };
        });

        setGoals(transformedGoals);
      } catch (error) {
        console.error('Error fetching goals:', error);
        // Fallback to mock data if API fails
        setGoals(getGoalsWithProgress(courseId));
        toast.error('Failed to load goals. Using sample data instead.');
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, [courseId]);

  const handleGoalAdded = async (goal: GoalWithProgress) => {
    setIsAddGoalModalOpen(false);
    setIsSubmitting(true);
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/courses/${courseId}/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          goal_descr: goal.title,
          due_date: goal.targetDate,
          skip_default_task: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create goal');
      }

      // Refetch goals to update UI
      setLoading(true);
      const fetchResponse = await fetch(`${api}/api/courses/${courseId}/goals`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!fetchResponse.ok) {
        throw new Error('Failed to fetch goals after creation');
      }
      const data = await fetchResponse.json();
      const transformedGoals: GoalWithProgress[] = data.map((goal: any) => {
        return {
          id: goal.goal_id || goal.id,
          courseId: courseId,
          title: goal.goal_descr,
          targetDate: formatDate(goal.due_date || new Date().toISOString()),
          workMinutesPerDay: 60,
          frequency: 'daily',
          createdAt: goal.created_at,
          updatedAt: goal.updated_at,
          progress: goal.progress || 0,
          totalTasks: goal.total_tasks || 0,
          completedTasks: goal.completed_tasks || 0,
          completed: goal.goal_completed || false
        };
      });
      setGoals(transformedGoals);
      toast.success('Goal created successfully!');
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Failed to create goal. Please try again.');
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const handleGoalUpdated = async (updatedGoal: GoalWithProgress) => {
    try {
      // Update goal in backend
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/goals/${updatedGoal.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          goal_descr: updatedGoal.title,
          due_date: updatedGoal.targetDate,
          goal_completed: updatedGoal.progress === 100
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update goal');
      }

      // Refetch goals from the backend to ensure data consistency
      setLoading(true);
      const fetchResponse = await fetch(`${api}/api/courses/${courseId}/goals`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!fetchResponse.ok) {
        throw new Error('Failed to fetch goals after update');
      }

      const data = await fetchResponse.json();

      // Transform backend data to match frontend types
      const transformedGoals: GoalWithProgress[] = data.map((goal: any) => {
        console.log('Processing goal from API:', goal);
        return {
          id: goal.goal_id || goal.id, // Handle both ID formats
          courseId: courseId,
          title: goal.goal_descr,
          targetDate: goal.due_date || new Date().toISOString(),
          workMinutesPerDay: 60, // Default value
          frequency: 'daily', // Default value
          createdAt: goal.created_at,
          updatedAt: goal.updated_at,
          progress: goal.progress || 0,
          totalTasks: goal.total_tasks || 0,
          completedTasks: goal.completed_tasks || 0,
          completed: goal.goal_completed || false
        };
      });

      setGoals(transformedGoals);
    } catch (error) {
      console.error('Error updating goal:', error);
      toast.error('Failed to update goal. Please try again.');
      // Update local state anyway for demo purposes
      setGoals(prev => prev.map(goal => goal.id === updatedGoal.id ? updatedGoal : goal));
    } finally {
      setLoading(false);
    }
  };

  const handleGoalDeleted = async (goalId: string) => {
    try {
      // Delete goal from backend
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/goals/${goalId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error response: ${errorText}`);
        throw new Error(errorText || 'Failed to delete goal');
      }

      toast.success('Goal deleted successfully');

      // Refetch goals from the backend to ensure data consistency
      setLoading(true);
      const fetchResponse = await fetch(`${api}/api/courses/${courseId}/goals`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!fetchResponse.ok) {
        throw new Error('Failed to fetch goals after deletion');
      }

      const data = await fetchResponse.json();

      // Transform backend data to match frontend types
      const transformedGoals: GoalWithProgress[] = data.map((goal: any) => {
        console.log('Processing goal from API:', goal);
        return {
          id: goal.goal_id || goal.id, // Handle both ID formats
          courseId: courseId,
          title: goal.goal_descr,
          targetDate: goal.due_date || new Date().toISOString(),
          workMinutesPerDay: 60, // Default value
          frequency: 'daily', // Default value
          createdAt: goal.created_at,
          updatedAt: goal.updated_at,
          progress: goal.progress || 0,
          totalTasks: goal.total_tasks || 0,
          completedTasks: goal.completed_tasks || 0,
          completed: goal.goal_completed || false
        };
      });

      setGoals(transformedGoals);
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete goal. Please try again.');
      // Remove from local state anyway for demo purposes
      setGoals(prev => prev.filter(goal => goal.id !== goalId));
    } finally {
      setLoading(false);
    }
  };

  const handleStudyPlanGenerated = async (studyPlan: any) => {
    setIsAIGenerating(false);
    setShowAIGenerator(false);
    // Trigger a refresh of the goals list
    setLoading(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/goals`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch goals');
      const data = await response.json();
      // Transform backend data to match frontend types
      const transformedGoals: GoalWithProgress[] = data.map((goal: any) => ({
        id: goal.goal_id || goal.id,
        courseId: courseId,
        title: goal.goal_descr,
        targetDate: goal.due_date || new Date().toISOString(),
        workMinutesPerDay: 60,
        frequency: 'daily',
        createdAt: goal.created_at,
        updatedAt: goal.updated_at,
        progress: goal.progress || 0,
        totalTasks: goal.total_tasks || 0,
        completedTasks: goal.completed_tasks || 0
      }));
      setGoals(transformedGoals);
    } catch (error) {
      toast.error('Failed to refresh goals after AI generation.');
    } finally {
      setLoading(false);
    }
  };

  // Pass this to the AI modal
  const handleAIGenerateStart = () => {
    setIsAIGenerating(true);
  };

  const handleUseStudyPlan = (studyPlan: any) => {
    // Convert the AI-generated study plan to the format expected by the scaffolding screen
    const tasks: Task[] = studyPlan.tasks.map((task: any, index: number) => ({
      id: `task-${index}`,
      name: task.name,
      description: task.description,
      scheduledDate: new Date().toISOString(),
      completed: false,
      estimatedHours: task.estimated_hours,
      priority: task.priority
    }));

    const subtasks: Subtask[] = studyPlan.tasks.flatMap((task: any, taskIndex: number) =>
      task.subtasks.map((subtask: any, subtaskIndex: number) => ({
        id: `subtask-${taskIndex}-${subtaskIndex}`,
        taskId: `task-${taskIndex}`,
        name: subtask.name,
        description: subtask.description,
        type: subtask.type,
        completed: false,
        estimatedMinutes: subtask.estimated_minutes
      }))
    );

    // Create a new goal from the study plan
    const newGoalFromPlan: GoalWithProgress = {
      id: `temp-${Date.now()}`,
      courseId: courseId,
      title: studyPlan.goal_title,
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      workMinutesPerDay: 60,
      frequency: 'daily',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: 0,
      totalTasks: tasks.length,
      completedTasks: 0,
      completed: false
    };

    setGoals(prev => [...prev, newGoalFromPlan]);
    toast.success('Study plan created successfully!');
  };

  const handleRegenerateStudyPlan = () => {
    setGeneratedStudyPlan(null);
    setShowAIGenerator(true);
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      {/* Header */}
      <div className="flex items-center justify-between">
          <div>
          <h2 className="text-2xl font-bold text-gray-900">Study Plan</h2>
          <p className="text-gray-600 mt-1">
            Track your learning goals and progress for this course
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAIGenerator(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Brain className="w-4 h-4" />
            AI Generate Plan
          </button>
        <button
          onClick={() => setIsAddGoalModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
            Add Goal
        </button>
        </div>
      </div>

      {isAIGenerating && (
        <div className="flex items-center justify-center py-8">
          <span className="text-lg text-blue-600 font-semibold animate-pulse">AI is generating your study plan...</span>
            </div>
      )}

      {showAIGenerator && (
        <Portal>
          <div 
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-[9999]"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={e => e.target === e.currentTarget && setShowAIGenerator(false)}
          >
            <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto m-2 shadow-xl" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Brain className="w-4 h-4 text-green-600" />
            </div>
                  <h2 className="text-xl font-semibold text-gray-800">AI Study Plan Generator</h2>
          </div>
                <button
                  onClick={() => setShowAIGenerator(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
            </div>
              <div className="p-6">
                <AIGenerateStudyPlan
                  courseId={courseId}
                  onStudyPlanGenerated={handleStudyPlanGenerated}
                  onStartGenerating={handleAIGenerateStart}
                />
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Goals List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-pulse flex flex-col items-center">
            <div className="rounded-full bg-gray-200 h-16 w-16 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="h-8 bg-gray-200 rounded w-1/6"></div>
          </div>
        </div>
      ) : goals.length === 0 ? (
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
              courseId={courseId}
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