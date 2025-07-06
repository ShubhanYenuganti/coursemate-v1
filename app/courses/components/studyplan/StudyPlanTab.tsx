"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Target, TrendingUp, Calendar, Clock, CheckCircle, Circle, BarChart3, PieChart, Activity, MessageSquare, X, Plus, FileText, Trash2, Edit } from 'lucide-react';
import { GoalWithProgress, Task, Subtask, StudyPlanStats } from './types';
import { PomodoroProvider, usePomodoro } from '../../../study-plan/PomodoroContext';
import { PomodoroTimer } from '../../../study-plan/PomodoroTimer';
import { toast } from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

interface StudyPlanTabProps {
  courseId: string;
}

interface TaskWithSubtasks {
  id: string;
  name: string;
  scheduledDate: string;
  completed: boolean;
  type?: string;
  estimatedTimeMinutes: number;
  actualTimeMinutes: number;
  timeTrackingStart?: string;
  timeTrackingEnd?: string;
  isTimeTracking: boolean;
  task_is_being_tracked?: boolean;
  task_actual_time_minutes?: number;
  task_estimated_time_minutes?: number;
  started_by_subtask?: string;
  subtasks: {
    id: string;
    name: string;
    type: string;
    completed: boolean;
  }[];
}

const StudyPlanTab: React.FC<StudyPlanTabProps> = ({ courseId }) => {
  return (
    <PomodoroProvider>
      <StudyPlanTabContent courseId={courseId} />
    </PomodoroProvider>
  );
};

const StudyPlanTabContent: React.FC<StudyPlanTabProps> = ({ courseId }) => {
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [expandedFeedbackGoals, setExpandedFeedbackGoals] = useState<Set<string>>(new Set());
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

  // Fetch goals from the backend
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const api = process.env.BACKEND_URL || "http://localhost:5173";
        const token = localStorage.getItem('token');
        
        console.log('🔍 Debug - API URL:', api);
        console.log('🔍 Debug - Course ID:', courseId);
        console.log('🔍 Debug - Token exists:', !!token);
        console.log('🔍 Debug - Token preview:', token ? `${token.substring(0, 20)}...` : 'No token');
        
        const response = await fetch(`${api}/api/courses/${courseId}/goals`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('🔍 Debug - Response status:', response.status);
        console.log('🔍 Debug - Response ok:', response.ok);
        console.log('🔍 Debug - Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('🔍 Debug - Error response body:', errorText);
          throw new Error(`Failed to fetch goals: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('🔍 Debug - Success response data:', data);
        
        // Transform backend data to match frontend types
        const transformedGoals: GoalWithProgress[] = data.map((goal: any) => {
          return {
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
          };
        });
        
        setGoals(transformedGoals);
        
        // Fetch tasks and subtasks for each goal
        const allTasksData: Record<string, TaskWithSubtasks[]> = {};
        for (const goal of transformedGoals) {
          try {
            const tasksResponse = await fetch(`${api}/api/goals/${goal.id}/tasks`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (tasksResponse.ok) {
              const tasksData = await tasksResponse.json();
              
              // Transform tasks data to match frontend structure
              const transformedTasks: TaskWithSubtasks[] = [];
              const taskMap = new Map<string, TaskWithSubtasks>();

              tasksData.forEach((row: any) => {
                const taskId = row.task_id;
                
                if (!taskMap.has(taskId)) {
                  // Debug: log the row data to see what fields are available
                  console.log('Task row data:', row);
                  
                  taskMap.set(taskId, {
                    id: taskId,
                    name: row.task_title || 'Untitled Task',
                    scheduledDate: row.due_date || new Date().toISOString(),
                    completed: row.task_completed || false,
                    type: row.task_type || row.type || 'Study', // Try multiple possible field names
                    estimatedTimeMinutes: row.task_estimated_time_minutes || row.estimated_time_minutes || 60,
                    actualTimeMinutes: row.task_actual_time_minutes || row.actual_time_minutes || 0,
                    timeTrackingStart: row.time_tracking_start || undefined,
                    timeTrackingEnd: row.time_tracking_end || undefined,
                    isTimeTracking: row.is_time_tracking || false,
                    task_is_being_tracked: row.task_is_being_tracked || false,
                    task_actual_time_minutes: row.task_actual_time_minutes || 0,
                    task_estimated_time_minutes: row.task_estimated_time_minutes || 60,
                    subtasks: []
                  });
                }

                const task = taskMap.get(taskId)!;
                
                // Add subtask if it exists and is not a placeholder
                if (row.subtask_id && row.subtask_id !== 'placeholder' && row.subtask_descr) {
                  task.subtasks.push({
                    id: row.subtask_id,
                    name: row.subtask_descr,
                    type: row.subtask_type || 'Study',
                    completed: row.subtask_completed || false
                  });
                }
              });

              allTasksData[goal.id] = Array.from(taskMap.values());
            } else {
              // If tasks fetch fails, use empty array
              allTasksData[goal.id] = [];
            }
      } catch (error) {
            console.error(`Error fetching tasks for goal ${goal.id}:`, error);
            allTasksData[goal.id] = [];
          }
        }
        
        setTasksData(allTasksData);
        updateProgress();
        
      } catch (error) {
        console.error('🔍 Debug - Error fetching goals:', error);
        setError('Failed to load study plan data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGoals();
  }, [courseId]);

  // Update current times for actively tracked tasks
  useEffect(() => {
    const updateCurrentTimes = async () => {
      const newTimes: Record<string, number> = {};
      
      // Find all actively tracked tasks
      Object.values(tasksData).forEach(tasks => {
        tasks.forEach(task => {
          if (task.task_is_being_tracked) {
            newTimes[task.id] = 0; // Will be updated by API call
          }
        });
      });
      
      // Update times for each tracked task
      for (const taskId of Object.keys(newTimes)) {
        const timeData = await getCurrentTaskTime(taskId);
        if (timeData && timeData.is_tracking) {
          newTimes[taskId] = timeData.current_time_minutes;
        }
      }
      
      setCurrentTaskTimes(newTimes);
    };

    // Update immediately
    updateCurrentTimes();
    
    // Update every 30 seconds for actively tracked tasks
    const interval = setInterval(updateCurrentTimes, 30000);
    
    return () => clearInterval(interval);
  }, [tasksData]);

  const toggleGoalExpansion = (goalId: string) => {
    setExpandedGoals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(goalId)) {
        newSet.delete(goalId);
      } else {
        newSet.add(goalId);
      }
      return newSet;
    });
  };

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const toggleFeedbackGoal = (goalId: string) => {
    setExpandedFeedbackGoals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(goalId)) {
        newSet.delete(goalId);
      } else {
        newSet.add(goalId);
      }
      return newSet;
    });
  };

  const handleSubtaskToggle = (goalId: string, taskId: string, subtaskId: string) => {
    setTasksData(prev => ({
      ...prev,
      [goalId]: prev[goalId].map(task => 
        task.id === taskId 
          ? {
              ...task,
              subtasks: task.subtasks.map(subtask => 
                subtask.id === subtaskId 
                  ? { ...subtask, completed: !subtask.completed }
                  : subtask
              )
            }
          : task
      )
    }));
  };

  const handleSubtaskClick = async (goal: any, task: any, subtask: any) => {
    // Open Pomodoro timer modal
    setPomodoroTimerModal({ subtask, task, goal });
  };

  const handlePomodoroStart = async (taskId: string) => {
    // Start time tracking for the task when Pomodoro timer starts
    await startTaskTracking(taskId);
  };

  const handleSubtaskToggleWithAPI = async (goalId: string, taskId: string, subtaskId: string) => {
    try {
      const api = process.env.BACKEND_URL || "http://localhost:5173";
      
      // First update the UI optimistically
      const currentTasks = tasksData[goalId] || [];
      const task = currentTasks.find(t => t.id === taskId);
      const subtask = task?.subtasks.find(s => s.id === subtaskId);
      const newCompletedState = !subtask?.completed;

      // Update local state immediately for better UX
      handleSubtaskToggle(goalId, taskId, subtaskId);

      // Send update to backend
      const response = await fetch(`${api}/api/goals/tasks/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          subtask_descr: subtask?.name || '',
          subtask_completed: newCompletedState
        })
      });

      if (!response.ok) {
        // Revert the change if the API call failed
        handleSubtaskToggle(goalId, taskId, subtaskId);
        toast.error('Failed to update subtask status');
      } else {
        // The backend will automatically stop tracking if all subtasks are completed
        // We just need to refresh the task data to get updated time information
        setTimeout(async () => {
          await refreshTaskData(goalId, taskId);
        }, 500);
        
        updateProgress();
      }
    } catch (error) {
      console.error('Error updating subtask:', error);
      // Revert the change if there was an error
      handleSubtaskToggle(goalId, taskId, subtaskId);
      toast.error('Failed to update subtask status');
    }
  };

  const startTaskTracking = async (taskId: string, startedBySubtask?: string) => {
    try {
      const api = process.env.BACKEND_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/goals/tasks/${taskId}/start-tracking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          started_by_subtask: startedBySubtask
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Task time tracking response:', data);
        
        // Update local state to show tracking is active
        setTasksData(prev => {
          const newTasksData = { ...prev };
          Object.keys(newTasksData).forEach(goalId => {
            newTasksData[goalId] = newTasksData[goalId].map(task => 
              task.id === taskId 
                ? { 
                    ...task, 
                    task_is_being_tracked: true,
                    started_by_subtask: data.started_by_subtask || startedBySubtask
                  }
                : task
            );
          });
          return newTasksData;
        });
      } else {
        console.error('Failed to start task time tracking');
      }
    } catch (error) {
      console.error('Error starting task time tracking:', error);
    }
  };

  const stopTaskTracking = async (taskId: string) => {
    try {
      const api = process.env.BACKEND_URL || "http://localhost:5173";
      console.log('🔍 Stop Tracking Debug - Task ID:', taskId);
      console.log('🔍 Stop Tracking Debug - API URL:', `${api}/api/goals/tasks/${taskId}/stop-tracking`);
      
      const response = await fetch(`${api}/api/goals/tasks/${taskId}/stop-tracking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Stop Tracking Debug - Response data:', data);
        console.log('🔍 Stop Tracking Debug - Time spent:', data.time_spent_minutes, 'minutes');
        console.log('🔍 Stop Tracking Debug - Total actual time:', data.total_actual_time_minutes);
        
        // Update local state to show tracking is stopped and update actual time
        setTasksData(prev => {
          const newTasksData = { ...prev };
          Object.keys(newTasksData).forEach(goalId => {
            newTasksData[goalId] = newTasksData[goalId].map(task => 
              task.id === taskId 
                ? { 
                    ...task, 
                    task_is_being_tracked: false,
                    task_actual_time_minutes: data.total_actual_time_minutes
                  }
                : task
            );
          });
          return newTasksData;
        });
        
        // Refresh task data from backend to ensure we have the latest time data
        // Find the goal ID for this task
        let goalId: string | null = null;
        Object.keys(tasksData).forEach(gId => {
          const task = tasksData[gId].find(t => t.id === taskId);
          if (task) {
            goalId = gId;
          }
        });
        
        if (goalId) {
          // Add a small delay to ensure backend has processed the request
          setTimeout(async () => {
            await refreshTaskData(goalId!, taskId);
          }, 500);
        }
      } else {
        const errorText = await response.text();
        console.error('🔍 Stop Tracking Error - Status:', response.status);
        console.error('🔍 Stop Tracking Error - Status Text:', response.statusText);
        console.error('🔍 Stop Tracking Error - Response:', errorText);
        console.error('Failed to stop task time tracking');
      }
    } catch (error) {
      console.error('Error stopping task time tracking:', error);
    }
  };

  const updateProgress = () => {
    let totalGoals = goals.length;
    let completedGoals = 0;
    let totalTasks = 0;
    let completedTasks = 0;
    let totalSubtasks = 0;
    let completedSubtasks = 0;
    let estimatedMinutesRemaining = 0;

    goals.forEach(goal => {
      const goalTasks = tasksData[goal.id] || [];
      const goalCompletedTasks = goalTasks.filter(task => task.completed).length;
      const goalTotalTasks = goalTasks.length;
      
      if (goalTotalTasks > 0 && goalCompletedTasks === goalTotalTasks) {
        completedGoals++;
      }
      
      totalTasks += goalTotalTasks;
      completedTasks += goalCompletedTasks;
      
      goalTasks.forEach(task => {
        totalSubtasks += task.subtasks.length;
        completedSubtasks += task.subtasks.filter(subtask => subtask.completed).length;
        
        if (!task.completed) {
          estimatedMinutesRemaining += task.estimatedTimeMinutes || 0;
        }
      });
    });

    const averageCompletionRate = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

    setCourseStats({
      totalGoals,
      completedGoals,
      totalTasks,
      completedTasks,
      totalSubtasks,
      completedSubtasks,
      averageCompletionRate,
      tasksOverdue: 0,
      estimatedMinutesRemaining
    });
  };

  const generateFeedbackForTask = (task: any, goal: any) => {
    // Calculate time tracking analytics for the task
    const estimatedTime = task.task_estimated_time_minutes || task.estimatedTimeMinutes || 0;
    const actualTime = task.task_actual_time_minutes || task.actualTimeMinutes || 0;
    
    // Debug logging
    console.log('🔍 Feedback Debug - Task:', task.name);
    console.log('🔍 Feedback Debug - Estimated time:', estimatedTime);
    console.log('🔍 Feedback Debug - Actual time:', actualTime);
    console.log('🔍 Feedback Debug - Task data:', task);
    
    if (estimatedTime > 0 && actualTime > 0) {
      const timeDifference = actualTime - estimatedTime;
      if (timeDifference <= 0) {
        return `You estimated ${estimatedTime} minutes for this task and completed it in ${actualTime} minutes, which is ${Math.abs(timeDifference)} minutes faster than your estimate.`;
      } else {
        return `You estimated ${estimatedTime} minutes for this task and completed it in ${actualTime} minutes, which is ${timeDifference} minutes longer than your estimate.`;
      }
    } else if (estimatedTime > 0 && actualTime === 0) {
      return `You estimated ${estimatedTime} minutes for this task. Time tracking will start when you begin working on it.`;
    } else {
      return `Time tracking data not available for this task.`;
    }
  };

  const getCompletedTasksWithFeedback = () => {
    const completedTasks: any[] = [];
    
    goals.forEach(goal => {
      const goalTasks = tasksData[goal.id] || [];
      goalTasks.forEach(task => {
        const completedSubtasks = task.subtasks.filter((subtask: any) => subtask.completed).length;
        const totalSubtasks = task.subtasks.length;
        
        // Only include tasks that have at least one completed subtask
        if (completedSubtasks > 0) {
          completedTasks.push({
            task,
            goal,
            feedback: generateFeedbackForTask(task, goal),
            completedSubtasks,
            totalSubtasks
          });
        }
      });
    });
    
    return completedTasks;
  };

  const FeedbackModal = ({ task, goal, feedback, onClose }: { task: any, goal: any, feedback: string, onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Feedback for: {task.name}</h2>
        <div className="mb-4">
          <p className="text-sm text-gray-600">Goal: {goal.title}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-gray-800 leading-relaxed">{feedback}</p>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  const AddGoalModal = ({ onClose }: { onClose: () => void }) => {
    const taskTypes = [
      { value: 'reading', label: 'Reading', icon: '📖' },
      { value: 'studying', label: 'Studying', icon: '📚' },
      { value: 'problems', label: 'Problems', icon: '🧮' },
      { value: 'writing', label: 'Writing', icon: '✍️' },
      { value: 'research', label: 'Research', icon: '🔍' },
      { value: 'practice', label: 'Practice', icon: '🎯' }
    ];

    const handleGoalTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setNewGoalData(prev => ({ ...prev, title: e.target.value }));
    }, []);

    const handleTargetDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setNewGoalData(prev => ({ ...prev, targetDate: e.target.value }));
    }, []);

    const handleGoalSubmit = () => {
      if (newGoalData.title && newGoalData.targetDate) {
        setGoalCreationStep('tasks');
      }
    };

    const handleAddTask = () => {
      const newTask = {
        id: `temp-${Date.now()}`,
        name: '',
        type: 'reading' as const,
        scheduledDate: new Date().toISOString().split('T')[0],
        estimatedTimeMinutes: 60,
        subtasks: []
      };
      setNewGoalData(prev => ({
        ...prev,
        tasks: [...prev.tasks, newTask]
      }));
    };

    const handleTaskChange = useCallback((taskId: string, field: string, value: any) => {
      setNewGoalData(prev => ({
        ...prev,
        tasks: prev.tasks.map(task => 
          task.id === taskId ? { ...task, [field]: value } : task
        )
      }));
    }, []);

    const handleRemoveTask = useCallback((taskId: string) => {
      setNewGoalData(prev => ({
        ...prev,
        tasks: prev.tasks.filter(task => task.id !== taskId)
      }));
    }, []);

    const handleTasksSubmit = () => {
      if (newGoalData.tasks.length > 0) {
        setGoalCreationStep('subtasks');
      }
    };

    const handleAddSubtask = useCallback((taskId: string) => {
      const newSubtask = {
        id: `subtask-${Date.now()}`,
        name: '',
        type: 'Study',
        estimatedTimeMinutes: 30
      };
      setNewGoalData(prev => ({
        ...prev,
        tasks: prev.tasks.map(task => 
          task.id === taskId 
            ? { ...task, subtasks: [...task.subtasks, newSubtask] }
            : task
        )
      }));
    }, []);

    const handleFinish = async () => {
      try {
        const api = process.env.BACKEND_URL || "http://localhost:5173";
        let goalId;

        if (newGoalData.title) {
          // Creating a new goal with tasks
          console.log('Creating goal with data:', {
            goal_descr: newGoalData.title,
            due_date: newGoalData.targetDate,
            skip_default_task: true
          });
          
          const goalResponse = await fetch(`${api}/api/courses/${courseId}/goals`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              goal_descr: newGoalData.title,
              due_date: newGoalData.targetDate,
              skip_default_task: true
            })
          });

          console.log('Goal response status:', goalResponse.status);
          console.log('Goal response headers:', goalResponse.headers);

          if (!goalResponse.ok) {
            const errorText = await goalResponse.text();
            console.error('Goal creation error response:', errorText);
            throw new Error(`Failed to create goal: ${goalResponse.status} ${goalResponse.statusText}`);
          }

          const goalData = await goalResponse.json();
          goalId = goalData[0].goal_id;
        } else if (currentGoalId) {
          // Adding tasks to an existing goal
          goalId = currentGoalId;
        } else {
          throw new Error('No goal ID available');
        }

        // Save tasks and subtasks
        const tasksData = newGoalData.tasks.map(task => ({
          task_title: task.name,
          task_descr: '',
          task_completed: false,
          task_type: task.type,
          due_date: task.scheduledDate,
          subtasks: task.subtasks.map(subtask => ({
            subtask_descr: subtask.name,
            subtask_completed: false
          }))
        }));
      
        console.log('Saving tasks with data:', { tasks: tasksData });
      
        const tasksResponse = await fetch(`${api}/api/goals/${goalId}/save-tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ tasks: tasksData })
      });
        
        console.log('Tasks response status:', tasksResponse.status);
      
      if (!tasksResponse.ok) {
          const errorText = await tasksResponse.text();
          console.error('Tasks creation error response:', errorText);
          throw new Error(`Failed to save tasks: ${tasksResponse.status} ${tasksResponse.statusText}`);
        }

        // Refresh goals data
        window.location.reload();
        onClose();
        setGoalCreationStep('goal');
        setCurrentGoalId(null);
        setNewGoalData({ title: '', targetDate: '', tasks: [] });
        toast.success('Tasks created successfully!');

      } catch (error) {
        console.error('Error creating tasks:', error);
        toast.error('Failed to create tasks. Please try again.');
      }
    };

    const handleBack = () => {
      if (goalCreationStep === 'tasks') {
        setGoalCreationStep('goal');
      } else if (goalCreationStep === 'subtasks') {
        setGoalCreationStep('tasks');
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative bg-white rounded-lg shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
          
          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${goalCreationStep === 'goal' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                1
              </div>
              <div className={`w-8 h-1 ${goalCreationStep === 'tasks' || goalCreationStep === 'subtasks' ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${goalCreationStep === 'tasks' ? 'bg-blue-600 text-white' : goalCreationStep === 'subtasks' ? 'bg-gray-200 text-gray-600' : 'bg-gray-200 text-gray-600'}`}>
                {currentGoalId ? '1' : '2'}
              </div>
              <div className={`w-8 h-1 ${goalCreationStep === 'subtasks' ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${goalCreationStep === 'subtasks' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {currentGoalId ? '2' : '3'}
              </div>
            </div>
          </div>

          {/* Step 1: Goal Creation */}
          {goalCreationStep === 'goal' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Goal</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Goal Title</label>
                  <input
                    type="text"
                    value={newGoalData.title}
                    onChange={handleGoalTitleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter goal title..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={newGoalData.targetDate}
                    onChange={handleTargetDateChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGoalSubmit}
                    disabled={!newGoalData.title || !newGoalData.targetDate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next: Create Tasks
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Task Creation */}
          {goalCreationStep === 'tasks' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {newGoalData.title ? `Create Tasks for: ${newGoalData.title}` : 'Create New Tasks'}
              </h2>
              <div className="space-y-4">
                {newGoalData.tasks.map((task, index) => (
                  <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">Task {index + 1}</h3>
                      <button
                        onClick={() => handleRemoveTask(task.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Task Name</label>
                        <input
                          type="text"
                          value={task.name}
                          onChange={(e) => handleTaskChange(task.id, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter task name..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Task Type</label>
                        <select
                          value={task.type}
                          onChange={(e) => handleTaskChange(task.id, 'type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {taskTypes.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.icon} {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                        <input
                          type="date"
                          value={task.scheduledDate}
                          onChange={(e) => handleTaskChange(task.id, 'scheduledDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Time (minutes)</label>
                        <input
                          type="number"
                          value={task.estimatedTimeMinutes}
                          onChange={(e) => handleTaskChange(task.id, 'estimatedTimeMinutes', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="flex space-x-3">
                  <button
                    onClick={handleAddTask}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Task
                  </button>
                  <button
                    onClick={() => toast.success('AI task generation coming soon!')}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    🤖 AI Generate Tasks
                  </button>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleTasksSubmit}
                    disabled={newGoalData.tasks.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next: Create Subtasks
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Subtask Creation */}
          {goalCreationStep === 'subtasks' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Create Subtasks</h2>
              <div className="space-y-6">
                {newGoalData.tasks.map((task, taskIndex) => (
                  <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">{task.name}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium text-gray-800 text-base">Subtasks:</h5>
                        <button
                          onClick={() => handleAddSubtask(task.id)}
                          className="bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700 transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add Subtask
                        </button>
                      </div>
                      {task.subtasks.length === 0 ? (
                        <p className="text-gray-500 text-sm">No subtasks yet.</p>
                      ) : (
                        task.subtasks.map(subtask => (
                          <div key={subtask.id} className="flex items-center justify-between p-2 bg-white rounded border">
                            <div className="flex items-center space-x-3">
                              <input
                                type="text"
                                value={subtask.name}
                                onChange={e => handleSubtaskChange(task.id, subtask.id, 'name', e.target.value)}
                                className="text-sm text-gray-700 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter subtask name..."
                              />
                            </div>
                            <button
                              onClick={() => handleRemoveSubtask(task.id, subtask.id)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                              title="Delete subtask"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-4">
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleFinish}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Create Goal & Tasks
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const AddTaskModal = ({ goalId, onClose }: { goalId: string, onClose: () => void }) => {
    const [taskName, setTaskName] = useState('');
    const [taskDate, setTaskDate] = useState(new Date().toISOString().split('T')[0]);
    const [taskType, setTaskType] = useState('reading');
    const [estimatedTime, setEstimatedTime] = useState(60);

    const taskTypes = [
      { value: 'reading', label: 'Reading', icon: '📖' },
      { value: 'studying', label: 'Studying', icon: '📚' },
      { value: 'problems', label: 'Problems', icon: '🧮' },
      { value: 'writing', label: 'Writing', icon: '✍️' },
      { value: 'research', label: 'Research', icon: '🔍' },
      { value: 'practice', label: 'Practice', icon: '🎯' }
    ];

    const handleSubmit = async () => {
      if (!taskName.trim()) {
        toast.error('Please enter a task name');
        return;
      }

      try {
        const api = process.env.BACKEND_URL || "http://localhost:5173";
        
        // Add task to existing goal
        const tasksResponse = await fetch(`${api}/api/goals/${goalId}/save-tasks`, {
          method: 'POST',
        headers: {
            'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            tasks: [{
              task_title: taskName,
              task_descr: '',
              task_completed: false,
              task_type: taskType,
              due_date: taskDate,
              subtasks: []
            }]
          })
        });

        if (!tasksResponse.ok) {
          throw new Error('Failed to save task');
        }

        // Update local state immediately instead of reloading
        const newTask: TaskWithSubtasks = {
          id: `temp-${Date.now()}`, // This will be replaced when data is refetched
          name: taskName,
          scheduledDate: taskDate,
          completed: false,
          type: taskType,
          estimatedTimeMinutes: estimatedTime,
          actualTimeMinutes: 0,
          timeTrackingStart: undefined,
          timeTrackingEnd: undefined,
          isTimeTracking: false,
          subtasks: []
        };

        setTasksData(prev => ({
          ...prev,
          [goalId]: [...(prev[goalId] || []), newTask]
        }));

        onClose();
        toast.success('Task added successfully!');

    } catch (error) {
        console.error('Error adding task:', error);
        toast.error('Failed to add task. Please try again.');
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Task</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Task Name</label>
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter task name..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Task Type</label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {taskTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={taskDate}
                onChange={(e) => setTaskDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Time (minutes)</label>
              <input
                type="number"
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!taskName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AddSubtaskModal = ({ goalId, taskId, onClose }: { goalId: string; taskId: string; onClose: () => void }) => {
    const [subtaskName, setSubtaskName] = useState('');
    const [estimatedTime, setEstimatedTime] = useState(30);

    const handleSubmit = async () => {
      if (!subtaskName.trim()) {
        toast.error('Please enter a subtask name');
        return;
      }

      try {
        const api = process.env.BACKEND_URL || "http://localhost:5173";
        
        const response = await fetch(`${api}/api/goals/tasks/${taskId}/subtasks`, {
          method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            subtask_descr: subtaskName.trim()
        })
      });

        if (response.ok) {
          const newSubtask = await response.json();
          
          // Update local state
          setTasksData(prev => ({
            ...prev,
            [goalId]: prev[goalId].map(task => 
              task.id === taskId 
                ? {
                    ...task,
                    subtasks: [...task.subtasks, {
                      id: newSubtask.subtask_id,
                      name: newSubtask.subtask_descr,
                      type: 'Study',
                      completed: false
                    }]
                  }
                : task
            )
          }));
          
          onClose();
          toast.success('Subtask added successfully!');
        } else {
          toast.error('Failed to add subtask');
        }
      } catch (error) {
        console.error('Error adding subtask:', error);
        toast.error('Failed to add subtask');
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Subtask</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subtask Name</label>
              <input
                type="text"
                value={subtaskName}
                onChange={(e) => setSubtaskName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter subtask name..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Time (minutes)</label>
              <input
                type="number"
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!subtaskName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Subtask
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleAddSubtaskToTask = async (goalId: string, taskId: string) => {
    try {
      const api = process.env.BACKEND_URL || "http://localhost:5173";
      
      const response = await fetch(`${api}/api/goals/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          subtask_descr: 'New Subtask'
        })
      });

      if (response.ok) {
        const newSubtask = await response.json();
        
        // Update local state
        setTasksData(prev => ({
          ...prev,
          [goalId]: prev[goalId].map(task => 
            task.id === taskId 
              ? {
                  ...task,
                  subtasks: [...task.subtasks, {
                    id: newSubtask.subtask_id,
                    name: newSubtask.subtask_descr,
                    type: 'Study',
                    completed: false
                  }]
                }
              : task
          )
        }));
        
        toast.success('Subtask added successfully!');
      } else {
        toast.error('Failed to add subtask');
      }
    } catch (error) {
      console.error('Error adding subtask:', error);
      toast.error('Failed to add subtask');
    }
  };

  const handleSubtaskEdit = (goalId: string, taskId: string, subtaskId: string, currentName: string) => {
    setEditingSubtask({ goalId, taskId, subtaskId });
    setEditingSubtaskName(currentName);
  };

  const handleSubtaskSave = async () => {
    if (!editingSubtask || !editingSubtaskName.trim()) return;

    try {
      const api = process.env.BACKEND_URL || "http://localhost:5173";
      
      const response = await fetch(`${api}/api/goals/tasks/subtasks/${editingSubtask.subtaskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          subtask_descr: editingSubtaskName.trim()
        })
      });

      if (response.ok) {
        // Update local state
        setTasksData(prev => ({
          ...prev,
          [editingSubtask.goalId]: prev[editingSubtask.goalId].map(task => 
            task.id === editingSubtask.taskId 
              ? {
                  ...task,
                  subtasks: task.subtasks.map(subtask => 
                    subtask.id === editingSubtask.subtaskId 
                      ? { ...subtask, name: editingSubtaskName.trim() }
                      : subtask
                  )
                }
              : task
          )
        }));
        
        toast.success('Subtask updated successfully!');
      } else {
        toast.error('Failed to update subtask');
      }
    } catch (error) {
      console.error('Error updating subtask:', error);
      toast.error('Failed to update subtask');
    } finally {
      setEditingSubtask(null);
      setEditingSubtaskName('');
    }
  };

  const handleSubtaskCancel = () => {
    setEditingSubtask(null);
    setEditingSubtaskName('');
  };

  const deleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal? This will also delete all tasks and subtasks.')) {
      return;
    }

    try {
      const api = process.env.BACKEND_URL || "http://localhost:5173";
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Please log in to continue');
        window.location.href = '/login';
        return;
      }
      
      const response = await fetch(`${api}/api/goals/${goalId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 422) {
          toast.error('Your session has expired. Please log in again.');
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to delete goal');
      }

      // Update local state immediately
      setGoals(prev => prev.filter(goal => goal.id !== goalId));
      setTasksData(prev => {
        const newTasksData = { ...prev };
        delete newTasksData[goalId];
        return newTasksData;
      });
      updateProgress();
      toast.success('Goal deleted successfully!');
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete goal. Please try again.');
    }
  };

  const deleteTask = async (goalId: string, taskId: string) => {
    if (!confirm('Are you sure you want to delete this task? This will also delete all subtasks.')) {
      return;
    }

    try {
      const api = process.env.BACKEND_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/goals/${goalId}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      // Update local state immediately
      setTasksData(prev => ({
        ...prev,
        [goalId]: prev[goalId].filter(task => task.id !== taskId)
      }));
      updateProgress();
      toast.success('Task deleted successfully!');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task. Please try again.');
    }
  };

  const deleteSubtask = async (goalId: string, taskId: string, subtaskId: string) => {
    if (!confirm('Are you sure you want to delete this subtask?')) {
      return;
    }

    try {
      const api = process.env.BACKEND_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/goals/tasks/subtasks/${subtaskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete subtask');
      }

      // Update local state immediately
      setTasksData(prev => ({
        ...prev,
        [goalId]: prev[goalId].map(task => 
          task.id === taskId 
            ? {
                ...task,
                subtasks: task.subtasks.filter(subtask => subtask.id !== subtaskId)
              }
            : task
        )
      }));
      updateProgress();
      toast.success('Subtask deleted successfully!');
    } catch (error) {
      console.error('Error deleting subtask:', error);
      toast.error('Failed to delete subtask. Please try again.');
    }
  };

  const editGoal = async (goalId: string, updatedData: { goal_descr?: string; due_date?: string }) => {
    try {
      const api = process.env.BACKEND_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/goals/${goalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updatedData)
      });

      if (!response.ok) {
        throw new Error('Failed to update goal');
      }

      // Update local state
      setGoals(prev => prev.map(goal => 
        goal.id === goalId 
          ? { 
              ...goal, 
              title: updatedData.goal_descr || goal.title,
              targetDate: updatedData.due_date || goal.targetDate
            }
          : goal
      ));

      toast.success('Goal updated successfully!');
    } catch (error) {
      console.error('Error updating goal:', error);
      toast.error('Failed to update goal. Please try again.');
    }
  };

  const editTask = async (goalId: string, taskId: string, updatedData: { task_title?: string; task_descr?: string; due_date?: string; estimated_time_minutes?: number }) => {
    try {
      const api = process.env.BACKEND_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/goals/${goalId}/tasks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          tasks: [{
            task_id: taskId,
            ...updatedData
          }]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      // Update local state
      setTasksData(prev => ({
        ...prev,
        [goalId]: prev[goalId].map(task => 
          task.id === taskId 
            ? { 
                ...task, 
                name: updatedData.task_title || task.name,
                scheduledDate: updatedData.due_date || task.scheduledDate,
                estimatedTimeMinutes: updatedData.estimated_time_minutes || task.estimatedTimeMinutes
              }
            : task
        )
      }));

      toast.success('Task updated successfully!');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task. Please try again.');
    }
  };

  const editSubtask = async (goalId: string, taskId: string, subtaskId: string, updatedData: { subtask_descr?: string; subtask_type?: string }) => {
    try {
      const api = process.env.BACKEND_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/goals/tasks/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updatedData)
      });

      if (!response.ok) {
        throw new Error('Failed to update subtask');
      }

      // Update local state
      setTasksData(prev => ({
        ...prev,
        [goalId]: prev[goalId].map(task => 
          task.id === taskId 
            ? {
                ...task,
                subtasks: task.subtasks.map(subtask => 
                  subtask.id === subtaskId 
                    ? { 
                        ...subtask, 
                        name: updatedData.subtask_descr || subtask.name,
                        type: updatedData.subtask_type || subtask.type
                      }
                    : subtask
                )
              }
            : task
        )
      }));

      toast.success('Subtask updated successfully!');
    } catch (error) {
      console.error('Error updating subtask:', error);
      toast.error('Failed to update subtask. Please try again.');
    }
  };

  const EditGoalModal = ({ goal, onClose }: { goal: any, onClose: () => void }) => {
    const [title, setTitle] = useState(goal.title);
    const [targetDate, setTargetDate] = useState(goal.targetDate.split('T')[0]);

    const handleSubmit = async () => {
      if (!title.trim()) {
        toast.error('Please enter a goal title');
        return;
      }

      try {
        await editGoal(goal.id, {
          goal_descr: title.trim(),
          due_date: targetDate
        });
        onClose();
      } catch (error) {
        console.error('Error updating goal:', error);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Goal</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Goal Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter goal title..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!title.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Goal
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const EditTaskModal = ({ task, goal, onClose }: { task: any, goal: any, onClose: () => void }) => {
    const [name, setName] = useState(task.name);
    const [scheduledDate, setScheduledDate] = useState(task.scheduledDate.split('T')[0]);
    const [estimatedTime, setEstimatedTime] = useState(task.task_estimated_time_minutes || task.estimatedTimeMinutes || 60);

    const handleSubmit = async () => {
      if (!name.trim()) {
        toast.error('Please enter a task name');
        return;
      }

      try {
        await editTask(goal.id, task.id, {
          task_title: name.trim(),
          due_date: scheduledDate,
          estimated_time_minutes: estimatedTime
        });
        onClose();
    } catch (error) {
        console.error('Error updating task:', error);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Task</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Task Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter task name..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Time (minutes)</label>
              <input
                type="number"
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Task
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const EditSubtaskModal = ({ subtask, task, goal, onClose }: { subtask: any, task: any, goal: any, onClose: () => void }) => {
    const [name, setName] = useState(subtask.name);

    const handleSubmit = async () => {
      if (!name.trim()) {
        toast.error('Please enter a subtask name');
        return;
      }

      try {
        await editSubtask(goal.id, task.id, subtask.id, {
          subtask_descr: name.trim()
        });
        onClose();
      } catch (error) {
        console.error('Error updating subtask:', error);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Subtask</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subtask Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter subtask name..."
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Subtask
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const refreshTaskData = async (goalId: string, taskId: string) => {
    try {
      const api = process.env.BACKEND_URL || "http://localhost:5173";
      const token = localStorage.getItem('token');
      
      const tasksResponse = await fetch(`${api}/api/goals/${goalId}/tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        
        // Transform tasks data to match frontend structure
        const taskMap = new Map<string, TaskWithSubtasks>();

        tasksData.forEach((row: any) => {
          const taskIdFromRow = row.task_id;
          
          if (!taskMap.has(taskIdFromRow)) {
            taskMap.set(taskIdFromRow, {
              id: taskIdFromRow,
              name: row.task_title || 'Untitled Task',
              scheduledDate: row.due_date || new Date().toISOString(),
              completed: row.task_completed || false,
              type: row.task_type || row.type || 'Study',
              estimatedTimeMinutes: row.task_estimated_time_minutes || row.estimated_time_minutes || 60,
              actualTimeMinutes: row.task_actual_time_minutes || row.actual_time_minutes || 0,
              timeTrackingStart: row.time_tracking_start || undefined,
              timeTrackingEnd: row.time_tracking_end || undefined,
              isTimeTracking: row.is_time_tracking || false,
              task_is_being_tracked: row.task_is_being_tracked || false,
              task_actual_time_minutes: row.task_actual_time_minutes || 0,
              task_estimated_time_minutes: row.task_estimated_time_minutes || 60,
              subtasks: []
            });
          }

          const task = taskMap.get(taskIdFromRow)!;
          
          // Add subtask if it exists and is not a placeholder
          if (row.subtask_id && row.subtask_id !== 'placeholder' && row.subtask_descr) {
            task.subtasks.push({
              id: row.subtask_id,
              name: row.subtask_descr,
              type: row.subtask_type || 'Study',
              completed: row.subtask_completed || false
            });
          }
        });

        // Update only the specific goal's tasks
        setTasksData(prev => ({
          ...prev,
          [goalId]: Array.from(taskMap.values())
        }));
      }
    } catch (error) {
      console.error('Error refreshing task data:', error);
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

  const handleSubtaskStartTracking = async (goalId: string, taskId: string, subtaskId: string) => {
    try {
      // Start time tracking for the task
      await startTaskTracking(taskId, subtaskId);
      
      toast.success('Time tracking started for this task');
    } catch (error) {
      console.error('Error starting time tracking:', error);
      toast.error('Failed to start time tracking');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-pulse flex flex-col items-center">
          <div className="rounded-full bg-gray-200 h-16 w-16 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">Error: {error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
        
      {/* Header with Add Goal Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Study Plan</h2>
          <p className="text-gray-600 mt-1">Manage your learning goals and track progress</p>
        </div>
        <button
          onClick={() => setShowAddGoalModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Goal
        </button>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Study Goals Yet</h3>
          <p className="text-gray-600 mb-6">Create your first study goal to start tracking your progress</p>
          <button
            onClick={() => setShowAddGoalModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Goal
          </button>
          </div>
      ) : (
        <div className="space-y-4">
          {goals.map(goal => {
            const goalTasks = tasksData[goal.id] || [];
            const completedTasks = goalTasks.filter(task => {
              return task.subtasks.length > 0 && task.subtasks.every(subtask => subtask.completed);
            }).length;
            const totalTasks = goalTasks.length;
            const goalProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
            const completedSubtasks = goalTasks.reduce((sum, task) => 
              sum + task.subtasks.filter(subtask => subtask.completed).length, 0
            );
            const totalSubtasks = goalTasks.reduce((sum, task) => 
              sum + task.subtasks.length, 0
            );

            return (
              <div key={goal.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Goal Header */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleGoalExpansion(goal.id)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        {expandedGoals.has(goal.id) ? (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                      </button>
                      <div>
                        <h4 className="font-medium text-gray-900 text-lg">{goal.title}</h4>
                        <div className="flex items-center space-x-3 text-sm text-gray-600 mt-1">
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            Due: {new Date(goal.targetDate).toLocaleDateString()}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {goal.workMinutesPerDay} min/day
                          </span>
        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-sm text-gray-600 mt-1">
                          {completedSubtasks}/{totalSubtasks} subtasks
                        </p>
                      </div>
          <button
                        onClick={() => setEditGoalModal({ goal })}
                        className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                        title="Edit goal"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="Delete goal"
                      >
                        <Trash2 className="w-4 h-4" />
          </button>
        </div>
                  </div>
                </div>

                {/* Goal Content (Collapsible) */}
                {expandedGoals.has(goal.id) && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium text-gray-800 text-base">Tasks:</h5>
                        <button
                          onClick={() => setShowAddTaskModal({ goalId: goal.id })}
                          className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add Task
                        </button>
                      </div>
                      {goalTasks.length === 0 ? (
                        <p className="text-gray-500 text-sm">No tasks yet. Add your first task!</p>
                      ) : (
                        goalTasks.map(task => {
                          const completedSubtaskCount = task.subtasks.filter(subtask => subtask.completed).length;
                          const taskProgress = task.subtasks.length > 0 ? (completedSubtaskCount / task.subtasks.length) * 100 : 0;
                          const isTaskComplete = task.subtasks.length > 0 && completedSubtaskCount === task.subtasks.length;

                          return (
                            <div key={task.id} className="bg-white rounded-lg border border-gray-200">
                              {/* Task Header */}
                              <div className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <button
                                      onClick={() => toggleTaskExpansion(task.id)}
                                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                                    >
                                      {expandedTasks.has(task.id) ? (
                                        <ChevronDown className="w-4 h-4 text-gray-500" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-500" />
                                      )}
                                    </button>
                                    <div className="flex items-center space-x-2">
                                      {isTaskComplete ? (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                      ) : (
                                        <Circle className="w-4 h-4 text-gray-400" />
                                      )}
                                      <span className={`text-sm font-medium ${isTaskComplete ? 'text-gray-900' : 'text-gray-600'}`}>
                                        {task.name}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                                      <span>{new Date(task.scheduledDate).toLocaleDateString()}</span>
                                      <span>Est: {task.task_estimated_time_minutes || task.estimatedTimeMinutes}min</span>
                                      {task.task_is_being_tracked && currentTaskTimes[task.id] > 0 && (
                                        <span className="text-blue-600 font-medium">
                                          Tracking: {currentTaskTimes[task.id]}min
                                        </span>
                                      )}
                                      {(task.task_actual_time_minutes || task.actualTimeMinutes) > 0 && (
                                        <span>Actual: {task.task_actual_time_minutes || task.actualTimeMinutes}min</span>
                                      )}
                                    </div>

                                    {isTaskComplete && (
                                      <button
                                        onClick={() => setFeedbackModal({ task, goal, feedback: generateFeedbackForTask(task, goal) })}
                                        className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                        title="View feedback"
                                      >
                                        <MessageSquare className="w-3 h-3" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => setEditTaskModal({ task, goal })}
                                      className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                      title="Edit task"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => deleteTask(goal.id, task.id)}
                                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                      title="Delete task"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Subtasks (Collapsible) */}
                              {expandedTasks.has(task.id) && (
                                <div className="border-t border-gray-100 p-3 bg-gray-50">
                                  <div className="flex items-center justify-between mb-3">
                                    <h6 className="font-medium text-gray-700 text-sm">Subtasks:</h6>
                                    <button
                                      onClick={() => setShowAddSubtaskModal({ goalId: goal.id, taskId: task.id })}
                                      className="bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700 transition-colors flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" />
                                      Add Subtask
                                    </button>
                                  </div>
                                  <div className="space-y-2">
                                    {task.subtasks.length === 0 ? (
                                      <p className="text-gray-500 text-sm">No subtasks yet.</p>
                                    ) : (
                                      task.subtasks.map(subtask => (
                                        <div key={subtask.id} className="flex items-center justify-between p-2 bg-white rounded border">
                                          <div className="flex items-center space-x-3">
                                            <input
                                              type="checkbox"
                                              checked={subtask.completed}
                                              onChange={() => handleSubtaskToggleWithAPI(goal.id, task.id, subtask.id)}
                                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                            />
                                            <button
                                              onClick={() => handleSubtaskClick(goal, task, subtask)}
                                              className={`text-sm underline cursor-pointer hover:text-blue-600 transition-colors ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}
                                            >
                                              {subtask.name}
                                            </button>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            {/* Start Tracking Button */}
                                            {!subtask.completed && (
                                              <>
                                                {!task.task_is_being_tracked && (
                                                  <button
                                                    onClick={() => handleSubtaskStartTracking(goal.id, task.id, subtask.id)}
                                                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                                    title="Start time tracking for this task"
                                                  >
                                                    Start
                                                  </button>
                                                )}
                                                {task.task_is_being_tracked && task.started_by_subtask === subtask.id && (
                                                  <span className="px-2 py-1 text-xs bg-gray-500 text-white rounded">
                                                    Started
                                                  </span>
                                                )}
                                                {task.task_is_being_tracked && task.started_by_subtask !== subtask.id && (
                                                  <button
                                                    onClick={() => handleSubtaskStartTracking(goal.id, task.id, subtask.id)}
                                                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                                    title="Time tracking already started by another subtask"
                                                  >
                                                    Start
                                                  </button>
                                                )}
                                              </>
                                            )}
                                            <button
                                              onClick={() => handleSubtaskToggleWithAPI(goal.id, task.id, subtask.id)}
                                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                                subtask.completed 
                                                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                              }`}
                                              title={subtask.completed ? 'Mark incomplete' : 'Mark complete'}
                                            >
                                              {subtask.completed ? '✓ Complete' : 'Mark Complete'}
                                            </button>
                                            <button
                                              onClick={() => setEditSubtaskModal({ subtask, task, goal })}
                                              className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                              title="Edit subtask"
                                            >
                                              <Edit className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={() => deleteSubtask(goal.id, task.id, subtask.id)}
                                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                              title="Delete subtask"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pomodoro Timer Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          Pomodoro Timer
        </h2>
        <div className="bg-white rounded-lg p-8 border border-gray-200">
          <PomodoroTimer large />
        </div>
      </div>

      {/* Modals */}
      {feedbackModal && (
        <FeedbackModal
          task={feedbackModal!.task}
          goal={feedbackModal!.goal}
          feedback={feedbackModal!.feedback}
          onClose={() => setFeedbackModal(null)}
        />
      )}
      {pomodoroTimerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-8 relative flex flex-col items-center">
            <button onClick={() => setPomodoroTimerModal(null)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
              <X className="w-7 h-7" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pomodoro for: <span className="text-blue-600">{pomodoroTimerModal!.subtask.name}</span></h2>
            <p className="text-gray-600 mb-4">Task: <span className="font-medium">{pomodoroTimerModal!.task.name}</span></p>
            <p className="text-gray-600 mb-6">Goal: <span className="font-medium">{pomodoroTimerModal!.goal.title}</span></p>
            <PomodoroTimer large onStart={() => handlePomodoroStart(pomodoroTimerModal!.task.id)} />
          </div>
        </div>
      )}
      {showAddGoalModal && (
        <AddGoalModal onClose={() => {
          setShowAddGoalModal(false);
          setGoalCreationStep('goal');
          setCurrentGoalId(null);
          setNewGoalData({ title: '', targetDate: '', tasks: [] });
        }} />
      )}
      {showAddTaskModal && (
        <AddTaskModal goalId={showAddTaskModal!.goalId} onClose={() => setShowAddTaskModal(null)} />
      )}
      {showAddSubtaskModal && (
        <AddSubtaskModal 
          goalId={showAddSubtaskModal!.goalId} 
          taskId={showAddSubtaskModal!.taskId} 
          onClose={() => setShowAddSubtaskModal(null)} 
        />
      )}
      {editGoalModal && (
        <EditGoalModal
          goal={editGoalModal.goal}
          onClose={() => setEditGoalModal(null)}
        />
      )}
      {editTaskModal && (
        <EditTaskModal
          task={editTaskModal.task}
          goal={editTaskModal.goal}
          onClose={() => setEditTaskModal(null)}
        />
      )}
      {editSubtaskModal && (
        <EditSubtaskModal
          subtask={editSubtaskModal.subtask}
          task={editSubtaskModal.task}
          goal={editSubtaskModal.goal}
          onClose={() => setEditSubtaskModal(null)}
        />
      )}
    </div>
  );
};

export default StudyPlanTab; 