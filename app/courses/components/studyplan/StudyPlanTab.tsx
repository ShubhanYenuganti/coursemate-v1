"use client";
import React, { useState, useEffect } from 'react';
import { Plus, Target, TrendingUp } from 'lucide-react';
import { getGoalsWithProgress } from './mockData';
import { GoalWithProgress, Goal, Task, Subtask } from './types';
import GoalCard from './GoalCard';
import AddGoalModal from './AddGoalModal';
import TaskScaffoldingScreen from './TaskScaffoldingScreen';
import FeedbackSection from './FeedbackSection';
import { toast } from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

interface StudyPlanTabProps {
  courseId: string;
}

const StudyPlanTab: React.FC<StudyPlanTabProps> = ({ courseId }) => {
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [isScaffoldingOpen, setIsScaffoldingOpen] = useState(false);
  const [newGoal, setNewGoal] = useState<GoalWithProgress | null>(null);
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
          targetDate: goal.due_date || new Date().toISOString(),
          workMinutesPerDay: 60, // Default value
          frequency: 'daily', // Default value
          createdAt: goal.created_at,
          updatedAt: goal.updated_at,
            progress: goal.progress || 0,
            totalTasks: goal.total_tasks || 0,
            completedTasks: goal.completed_tasks || 0
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
    try {
      // Create a temporary local goal with a temporary ID
      const tempGoal: GoalWithProgress = {
        ...goal,
        id: `temp-${Date.now()}`, // Use a temporary ID that will be replaced after saving to backend
        progress: 0,
        totalTasks: 0,
        completedTasks: 0
      };
      
      // Store the goal locally instead of sending to backend immediately
      setNewGoal(tempGoal);
      setIsAddGoalModalOpen(false);
      setIsScaffoldingOpen(true);
      
      console.log('Created temporary goal:', tempGoal);
    } catch (error) {
      console.error('Error creating temporary goal:', error);
      toast.error('Failed to create goal. Please try again.');
    }
  };

  const handleScaffoldingSave = async (tasks: Task[], subtasks: Subtask[]) => {
    try {
      console.log('Tasks saved from scaffolding:', tasks);
      console.log('Subtasks saved from scaffolding:', subtasks);
      
      setIsSubmitting(true);
      
      if (!newGoal) {
        throw new Error('No goal data available');
      }
      
      // Now save the goal to the backend along with tasks and subtasks
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/courses/${courseId}/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          goal_descr: newGoal.title,
          due_date: newGoal.targetDate,
          skip_default_task: true // Skip creating the default task since we'll add tasks explicitly
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create goal');
      }

      const savedGoal = await response.json();
      console.log('Saved goal response:', savedGoal);
      
      const goalId = savedGoal[0].goal_id;
      
      // Now save tasks and subtasks
      const tasksData = tasks.map(task => {
        const taskSubtasks = subtasks.filter(subtask => subtask.taskId === task.id);
        console.log(`Task ${task.id} (${task.name}) has ${taskSubtasks.length} subtasks:`, taskSubtasks);
        
        return {
          task_title: task.name,
          task_descr: '',
          scheduledDate: task.scheduledDate,
          completed: task.completed,
          subtasks: taskSubtasks.map(subtask => ({
            subtask_descr: subtask.name,
            subtask_type: subtask.type,
            subtask_completed: subtask.completed
          }))
        };
      });
      
      console.log('Sending tasks to backend:', { tasks: tasksData });
      console.log('Original tasks:', tasks);
      console.log('Original subtasks:', subtasks);
      
      const tasksResponse = await fetch(`${api}/api/goals/${goalId}/save-tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ tasks: tasksData })
      });
      
      if (!tasksResponse.ok) {
        const errorData = await tasksResponse.json();
        console.error('Error saving tasks:', errorData);
        throw new Error(errorData.error || 'Failed to save tasks');
      }
      
      setIsScaffoldingOpen(false);
      setNewGoal(null);
      
      // Refetch goals from the backend to ensure data consistency
      setLoading(true);
      const fetchResponse = await fetch(`${api}/api/courses/${courseId}/goals`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!fetchResponse.ok) {
        throw new Error('Failed to fetch goals after save');
      }

      const data = await fetchResponse.json();
      console.log('Goals data after save:', data);
      
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
          completedTasks: goal.completed_tasks || 0
        };
      });
      
      setGoals(transformedGoals);
      toast.success('Study plan created successfully!');
    } catch (error) {
      console.error('Error saving goal with tasks:', error);
      toast.error('Failed to save study plan. Please try again.');
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const handleScaffoldingBack = () => {
    // Simply close the scaffolding screen and reset the new goal
    setIsScaffoldingOpen(false);
    setNewGoal(null);
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
          completedTasks: goal.completed_tasks || 0
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
          completedTasks: goal.completed_tasks || 0
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

  if (isScaffoldingOpen && newGoal) {
    return (
      <>
        <Toaster position="top-right" />
        <TaskScaffoldingScreen
          goal={newGoal}
          onBack={handleScaffoldingBack}
          onSave={handleScaffoldingSave}
        />
      </>
    );
  }

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
        <button
          onClick={() => setIsAddGoalModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Goal
        </button>
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