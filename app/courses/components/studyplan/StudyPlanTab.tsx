"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Target, TrendingUp, Brain, X, ChevronDown, ChevronRight, Calendar, Clock, Edit, Trash2, FileText, MessageSquare } from 'lucide-react';
import { getGoalsWithProgress } from './mockData';
import { GoalWithProgress, Goal, Task, Subtask, StudyPlanStats } from './types';
import GoalCard from './GoalCard';
import AddGoalModal from './AddGoalModal';
import TaskScaffoldingScreen from './TaskScaffoldingScreen';
import FeedbackSection from './FeedbackSection';
import AIGenerateStudyPlan from './AIGenerateStudyPlan';
import GeneratedStudyPlan from './GeneratedStudyPlan';
import { toast } from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Portal } from '../../../../components/Portal';
import { PomodoroProvider } from '../PomodoroContext';
import { PomodoroTimer } from '../PomodoroTimer';
import AddTaskModal from './AddTaskModal';
import AddSubtaskModal from './AddSubtaskModal';
import AIGenerateScreen from './AIGenerateScreen';

interface StudyPlanTabProps {
  courseId: string;
}

const StudyPlanTab: React.FC<StudyPlanTabProps> = ({ courseId }) => {
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [isScaffoldingOpen, setIsScaffoldingOpen] = useState(false);
  const [newGoal, setNewGoal] = useState<GoalWithProgress | null>(null);
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [tasksData, setTasksData] = useState<Record<string, TaskWithSubtasks[]>>({});
  const [courseStats, setCourseStats] = useState<StudyPlanStats>({
    totalGoals: 0,
    completedGoals: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalSubtasks: 0,
    completedSubtasks: 0,
    averageCompletionRate: 0,
    tasksOverdue: 0,
    estimatedMinutesRemaining: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{ task: any, goal: any, feedback: string } | null>(null);
  const [pomodoroModal, setPomodoroModal] = useState<{ subtask: any, task: any, goal: any } | null>(null);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState<{ goalId: string } | null>(null);
  const [showAddSubtaskModal, setShowAddSubtaskModal] = useState<{ goalId: string; taskId: string } | null>(null);
  const [goalCreationStep, setGoalCreationStep] = useState<'goal' | 'tasks' | 'subtasks'>('goal');
  const [currentGoalId, setCurrentGoalId] = useState<string | null>(null);
  const [pomodoroTimerModal, setPomodoroTimerModal] = useState<{ subtask: any, task: any, goal: any } | null>(null);
  const [editGoalModal, setEditGoalModal] = useState<{ goal: any } | null>(null);
  const [editTaskModal, setEditTaskModal] = useState<{ task: any, goal: any } | null>(null);
  const [editSubtaskModal, setEditSubtaskModal] = useState<{ subtask: any, task: any, goal: any } | null>(null);
  const [newGoalData, setNewGoalData] = useState({
    title: '',
    targetDate: '',
    tasks: [] as Array<{
      id: string;
      name: string;
      type: 'reading' | 'studying' | 'problems' | 'writing' | 'research' | 'practice';
      scheduledDate: string;
      estimatedTimeMinutes: number;
      subtasks: Array<{
        id: string;
        name: string;
        type: string;
        estimatedTimeMinutes: number;
        completed?: boolean;
      }>;
    }>
  });
  const [editingSubtask, setEditingSubtask] = useState<{ goalId: string; taskId: string; subtaskId: string } | null>(null);
  const [editingSubtaskName, setEditingSubtaskName] = useState('');
  const [currentTaskTimes, setCurrentTaskTimes] = useState<Record<string, number>>({});
  const [activeGoalForTaskSetup, setActiveGoalForTaskSetup] = useState<GoalWithProgress | null>(null);
  const [startedSubtasks, setStartedSubtasks] = useState<Set<string>>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('startedSubtasks') : null;
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [showAIGenerateScreen, setShowAIGenerateScreen] = useState(false);
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [isScaffoldingOpen, setIsScaffoldingOpen] = useState(false);

  // Persist startedSubtasks to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('startedSubtasks', JSON.stringify(Array.from(startedSubtasks)));
  }, [startedSubtasks]);

  // Move these functions outside AddGoalModal so they can be used in main component
  const handleSubtaskChange = useCallback((taskId: string, subtaskId: string, field: string, value: any) => {
    setNewGoalData(prev => ({
      ...prev,
      tasks: prev.tasks.map(task => 
        task.id === taskId 
          ? {
              ...task,
              subtasks: task.subtasks.map(subtask => 
                subtask.id === subtaskId ? { ...subtask, [field]: value } : subtask
              )
            }
          : task
      )
    }));
  }, []);

  const handleRemoveSubtask = useCallback((taskId: string, subtaskId: string) => {
    setNewGoalData(prev => ({
      ...prev,
      tasks: prev.tasks.map(task => 
        task.id === taskId 
          ? { ...task, subtasks: task.subtasks.filter(subtask => subtask.id !== subtaskId) }
          : task
      )
    }));
  }, []);

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [generatedStudyPlan, setGeneratedStudyPlan] = useState<any>(null);
  const [isAIGenerating, setIsAIGenerating] = useState(false);

  // Fetch goals from the backend
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/courses/${courseId}/goals`, {
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
      const response = await fetch(`/api/courses/${courseId}/goals`, {
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
      
      const tasksResponse = await fetch(`/api/goals/${goalId}/save-tasks`, {
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
      const fetchResponse = await fetch(`/api/courses/${courseId}/goals`, {
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
      const response = await fetch(`/api/goals/${updatedGoal.id}`, {
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
      const fetchResponse = await fetch(`/api/courses/${courseId}/goals`, {
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
      const response = await fetch(`/api/goals/${goalId}`, {
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
      const fetchResponse = await fetch(`/api/courses/${courseId}/goals`, {
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

  const getCurrentTaskTime = async (taskId: string) => {
    try {
      const api = process.env.BACKEND_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/goals/tasks/${taskId}/current-time`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Error getting current task time:', error);
    }
    return null;
  };
  
  const handleStudyPlanGenerated = async (studyPlan: any) => {
    setIsAIGenerating(false);
    setShowAIGenerator(false);
    // Trigger a refresh of the goals list
    setLoading(true);
    try {
      const api = process.env.BACKEND_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/courses/${courseId}/goals`, {
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

  const handleSubtaskStartTracking = async (goalId: string, taskId: string, subtaskId: string) => {
    try {
      // Start time tracking for the task
      await startTaskTracking(taskId, subtaskId);
      // Mark this subtask as started in the UI
      setStartedSubtasks(prev => new Set(prev).add(subtaskId));
      // Open Pomodoro timer modal for this subtask
      const goal = goals.find(g => g.id === goalId);
      const task = (tasksData[goalId] || []).find(t => t.id === taskId);
      const subtask = task?.subtasks.find(s => s.id === subtaskId);
      if (goal && task && subtask) {
        setPomodoroTimerModal({ subtask, task, goal });
      }
      toast.success('Time tracking started for this task');
    } catch (error) {
      console.error('Error starting time tracking:', error);
      toast.error('Failed to start time tracking');
    }
  };

  // Pass this to the AI modal
  const handleAIGenerateStart = () => {
    setIsAIGenerating(true);
  };

  if (isLoading) {
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
