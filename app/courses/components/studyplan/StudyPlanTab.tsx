"use client";
import React, { useState, useEffect } from 'react';
import { Plus, Target, TrendingUp, CheckCircle } from 'lucide-react';
import { getGoalsWithProgress } from './mockData';
import { GoalWithProgress, Goal } from './types';
import GoalCard from './GoalCard';
import AddGoalModal from './AddGoalModal';
import FeedbackSection from './FeedbackSection';
import { toast } from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

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
            workMinutesPerDay: goal.workMinutesPerDay, 
            frequency: goal.frequency,
            createdAt: goal.created_at,
            updatedAt: goal.updated_at,
            progress: goal.progress || 0,
            totalTasks: goal.total_tasks || 0,
            completedTasks: goal.completed_tasks || 0,
            completed: goal.goal_completed || false,
            customScheduledDays: goal.customScheduleDays // Assuming backend sends this
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
          workMinutesPerDay: goal.workMinutesPerDay,
          frequency: goal.frequency === 'custom' ? goal.customScheduleDays ?? [] : goal.frequency,
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
          workMinutesPerDay: goal.workMinutesPerDay,
          frequency: goal.frequency,
          createdAt: goal.created_at,
          updatedAt: goal.updated_at,
          progress: goal.progress || 0,
          totalTasks: goal.total_tasks || 0,
          completedTasks: goal.completed_tasks || 0,
          completed: goal.goal_completed || false,
          customScheduledDays: goal.customScheduleDays // Assuming backend sends this
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
          workMinutesPerDay: goal.workMinutesPerDay, // Default value
          frequency: goal.frequency, // Default value
          createdAt: goal.created_at,
          updatedAt: goal.updated_at,
          progress: goal.progress || 0,
          totalTasks: goal.total_tasks || 0,
          completedTasks: goal.completed_tasks || 0,
          completed: goal.goal_completed || false,
          customScheduledDays: goal.customScheduleDays // Assuming backend sends this
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
          workMinutesPerDay: goal.workMinutesPerDay, // Default value
          frequency: goal.frequency, // Default value
          createdAt: goal.created_at,
          updatedAt: goal.updated_at,
          progress: goal.progress || 0,
          totalTasks: goal.total_tasks || 0,
          completedTasks: goal.completed_tasks || 0,
          completed: goal.goal_completed || false,
          customScheduledDays: goal.customScheduleDays // Assuming backend sends this
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
            onClick={() => setIsAddGoalModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Goal
              </button>
            </div>
          </div>



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
        <div className="space-y-6">
          {(() => {
            const sortedGoals = goals.sort((a, b) => {
              // First, separate completed and incomplete goals
              if (a.completed && !b.completed) return 1;
              if (!a.completed && b.completed) return -1;
              
              // For incomplete goals, sort by date (nearest to farthest)
              if (!a.completed && !b.completed) {
                const dateA = new Date(a.targetDate);
                const dateB = new Date(b.targetDate);
                return dateA.getTime() - dateB.getTime();
              }
              
              // For completed goals, sort by completion date (most recently completed first)
              if (a.completed && b.completed) {
                const dateA = new Date(a.updatedAt);
                const dateB = new Date(b.updatedAt);
                return dateB.getTime() - dateA.getTime();
              }
              
              return 0;
            });

            const incompleteGoals = sortedGoals.filter(goal => !goal.completed);
            const completedGoals = sortedGoals.filter(goal => goal.completed);

            return (
              <>
                {/* Incomplete Goals */}
                {incompleteGoals.length > 0 && (
                    <div className="space-y-4">
                    {incompleteGoals.map(goal => (
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

                {/* Completed Goals Section */}
                {completedGoals.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <h3 className="text-lg font-semibold text-gray-700">Completed Goals</h3>
                      <span className="text-sm text-gray-500">({completedGoals.length})</span>
                                  </div>
                    {completedGoals.map(goal => (
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
              </>
            );
          })()}
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