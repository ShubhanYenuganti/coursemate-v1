"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Target, 
  Calendar, 
  Clock, 
  Edit, 
  Plus, 
  Trash2,
  CheckCircle,
  CheckSquare
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { GoalWithProgress, Task, TaskWithProgress, Subtask } from '../../../components/studyplan/types';
import TaskCard from '../../../components/studyplan/TaskCard';
import SubtaskList from '../../../components/studyplan/SubtaskList';
import TaskEditorModal from '../../../components/studyplan/TaskEditorModal';
import { format, parseISO } from 'date-fns';

const GoalDetailPage = () => {
  // Use the useParams hook to get the route parameters
  const params = useParams();
  const courseId = params.courseId as string;
  const goalId = params.goalId as string;
  const router = useRouter();
  
  const [goal, setGoal] = useState<GoalWithProgress | null>(null);
  const [tasks, setTasks] = useState<TaskWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editedGoalTitle, setEditedGoalTitle] = useState('');
  const [editedGoalDate, setEditedGoalDate] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithProgress | null>(null);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictingSubtasks, setConflictingSubtasks] = useState<Subtask[]>([]);
  const [pendingTaskUpdate, setPendingTaskUpdate] = useState<TaskWithProgress | null>(null);

  useEffect(() => {
    const fetchGoalDetails = async () => {
      setLoading(true);
      try {
        const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
        const goalResponse = await fetch(`${api}/api/courses/${courseId}/goals`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!goalResponse.ok) {
          console.error('Goal API response not OK:', goalResponse.status, goalResponse.statusText);
          throw new Error('Failed to fetch goal details');
        }

        const goalsData = await goalResponse.json();
        console.log('Goals data from API:', goalsData);
        console.log('Looking for goal with ID:', goalId);
        
        // Try to find the goal using different possible ID field names
        let currentGoal = goalsData.find((g: any) => 
          g.goal_id === goalId || 
          g.id === goalId || 
          String(g.goal_id) === goalId || 
          String(g.id) === goalId
        );
        
        if (!currentGoal) {
          console.error('Goal not found in response. Available goals:', goalsData.map((g: any) => ({ id: g.id, goal_id: g.goal_id })));
          toast.error('Goal not found');
          router.push(`/courses/${courseId}`);
          return;
        }
        
        console.log('Found goal:', currentGoal);
        
        // Transform goal data
        const transformedGoal: GoalWithProgress = {
          id: currentGoal.goal_id || currentGoal.id,
          courseId: courseId,
          title: currentGoal.goal_descr,
          targetDate: currentGoal.due_date || new Date().toISOString(),
          workMinutesPerDay: 60, // Default value
          frequency: 'daily', // Default value
          createdAt: currentGoal.created_at,
          updatedAt: currentGoal.updated_at,
          progress: currentGoal.progress || 0,
          totalTasks: currentGoal.total_tasks || 0,
          completedTasks: currentGoal.completed_tasks || 0,
          completed: currentGoal.goal_completed || false
        };
        
        setGoal(transformedGoal);
        setEditedGoalTitle(transformedGoal.title);
        setEditedGoalDate(new Date(transformedGoal.targetDate).toISOString().split('T')[0]);
        
        // Fetch tasks for this goal
        console.log('Fetching tasks for goalId:', goalId);
        const tasksResponse = await fetch(`${api}/api/goals/${goalId}/tasks`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!tasksResponse.ok) {
          console.error('Tasks API response not OK:', tasksResponse.status, tasksResponse.statusText);
          throw new Error('Failed to fetch tasks');
        }

        const tasksData = await tasksResponse.json();
        console.log('Tasks data from API:', tasksData);
        
        if (tasksData.length === 0) {
          console.log('No tasks found for this goal');
          setTasks([]);
          setLoading(false);
          return;
        }
        
        // Process and group by task_id
        const taskMap = new Map();
        
        // First pass: create task objects
        tasksData.forEach((item: any) => {
          console.log('Processing task item:', item);
          
          // Filter out placeholder tasks
          if (item.task_id === 'placeholder') {
            return;
          }
          
          // Each row in the response contains goal, task, and subtask data
          // We need to extract and group by task_id
          if (!taskMap.has(item.task_id)) {
            taskMap.set(item.task_id, {
              id: item.task_id,
              goalId: goalId,
              name: item.task_title,
              scheduledDate: item.task_due_date || new Date().toISOString(),
              completed: item.task_completed,
              createdAt: item.created_at,
              updatedAt: item.updated_at,
              subtasks: [],
              totalSubtasks: 0,
              completedSubtasks: 0,
              progress: 0
            });
          }
          
          // Always add the subtask from this row to its task
          const task = taskMap.get(item.task_id);
          if (item.subtask_id !== 'placeholder') {
            task.subtasks.push({
              id: item.subtask_id,
              taskId: item.task_id,
              name: item.subtask_descr,
              type: item.subtask_type || 'other',
              estimatedTimeMinutes: 15, // Default value
              completed: item.subtask_completed,
              createdAt: item.created_at,
              updatedAt: item.updated_at,
              start_time: item.start_time, // <-- add this
              end_time: item.end_time      // <-- add this
            });
          }
        });
        
        // Second pass: calculate progress for each task
        taskMap.forEach(task => {
          // Only count real subtasks (not placeholder)
          const realSubtasks = task.subtasks;
          task.totalSubtasks = realSubtasks.length;
          task.completedSubtasks = realSubtasks.filter((s: any) => s.completed).length;
          task.progress = task.totalSubtasks > 0 
            ? Math.round((task.completedSubtasks / task.totalSubtasks) * 100) 
            : 0;
        });
        
        const processedTasks = Array.from(taskMap.values());
        console.log('Processed tasks:', processedTasks);
        
        // Merge with existing tasks instead of replacing them
        setTasks(currentTasks => {
          // Get existing task IDs to avoid duplicates
          const existingTaskIds = new Set(currentTasks.map(t => t.id));
          
          // Filter out any tasks that already exist in the current tasks array
          const newTasks = processedTasks.filter(task => !existingTaskIds.has(task.id));
          
          console.log('Adding new tasks:', newTasks);
          console.log('Existing tasks:', currentTasks);
          
          // Combine existing and new tasks
          const combinedTasks = [...currentTasks, ...newTasks];
          
          // Update goal progress
          if (goal) {
            const totalSubtasks = combinedTasks.reduce((sum, task) => sum + task.totalSubtasks, 0);
            const completedSubtasks = combinedTasks.reduce((sum, task) => sum + task.completedSubtasks, 0);
            const newProgress = totalSubtasks > 0 
              ? Math.round((completedSubtasks / totalSubtasks) * 100)
              : 0;
            
            const allTasksCompleted = combinedTasks.length > 0 && combinedTasks.every(t => t.completed);
            
            setGoal({
              ...goal,
              progress: newProgress,
              totalTasks: combinedTasks.length,
              completedTasks: combinedTasks.filter(t => t.progress === 100).length,
              completed: allTasksCompleted
            });
          }
          
          return combinedTasks;
        });
      } catch (error) {
        console.error('Error fetching goal details:', error);
        toast.error('Failed to load goal details');
      } finally {
        setLoading(false);
      }
    };

    fetchGoalDetails();
  }, [courseId, goalId, router]);

  const handleGoBack = () => {
    router.push(`/courses/${courseId}`);
  };

  const handleSaveGoalEdit = async () => {
    if (!goal) return;
    
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/goals/${goalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          goal_descr: editedGoalTitle,
          due_date: editedGoalDate,
          goal_completed: goal.completed
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update goal');
      }

      // Update local state
      setGoal({
        ...goal,
        title: editedGoalTitle,
        targetDate: new Date(editedGoalDate).toISOString()
      });
      
      setIsEditingGoal(false);
      toast.success('Goal updated successfully');
    } catch (error) {
      console.error('Error updating goal:', error);
      toast.error('Failed to update goal');
    }
  };

  const handleAddTask = async () => {
    if (!newTaskName.trim()) {
      toast.error('Task name cannot be empty');
      return;
    }
    
    try {
      // Create a new task WITHOUT any subtasks
      const tasksData = [{
        task_title: newTaskName,
        task_descr: '',
        scheduledDate: newTaskDate,
        completed: false
      }];
      
      console.log('Creating new task:', tasksData);
      
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/goals/${goalId}/save-tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ tasks: tasksData })
      });
      
      if (!response.ok) {
        console.error('Failed to add task:', response.status, response.statusText);
        throw new Error('Failed to add task');
      }
      
      // Refresh tasks
      const tasksResponse = await fetch(`${api}/api/goals/${goalId}/tasks`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!tasksResponse.ok) {
        throw new Error('Failed to fetch tasks after adding');
      }

      const tasksData2 = await tasksResponse.json();
      console.log('Tasks data after adding:', tasksData2);
      
      // Process and group by task_id
      const taskMap = new Map();
      
      // First pass: create task objects
      tasksData2.forEach((item: any) => {
        // Filter out placeholder tasks
        if (item.task_id === 'placeholder') {
          return;
        }
        
        // Each row in the response contains goal, task, and subtask data
        // We need to extract and group by task_id
        if (!taskMap.has(item.task_id)) {
          taskMap.set(item.task_id, {
            id: item.task_id,
            goalId: goalId,
            name: item.task_title,
            scheduledDate: item.task_due_date || new Date().toISOString(),
            completed: item.task_completed,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            subtasks: [],
            totalSubtasks: 0,
            completedSubtasks: 0,
            progress: 0
          });
        }
        
        // Always add the subtask from this row to its task
        const task = taskMap.get(item.task_id);
        if (item.subtask_id !== 'placeholder') {
          task.subtasks.push({
            id: item.subtask_id,
            taskId: item.task_id,
            name: item.subtask_descr,
            type: item.subtask_type || 'other',
            estimatedTimeMinutes: 15, // Default value
            completed: item.subtask_completed,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            start_time: item.start_time, // <-- add this
            end_time: item.end_time      // <-- add this
          });
        }
      });
      
      // Second pass: calculate progress for each task
      taskMap.forEach(task => {
        task.totalSubtasks = task.subtasks.length;
        task.completedSubtasks = task.subtasks.filter((s: any) => s.completed).length;
        task.progress = task.totalSubtasks > 0 
          ? Math.round((task.completedSubtasks / task.totalSubtasks) * 100) 
          : 0;
      });
      
      const processedTasks = Array.from(taskMap.values());
      console.log('Processed tasks:', processedTasks);
      
      // Merge with existing tasks instead of replacing them
      setTasks(currentTasks => {
        // Get existing task IDs to avoid duplicates
        const existingTaskIds = new Set(currentTasks.map(t => t.id));
        
        // Filter out any tasks that already exist in the current tasks array
        const newTasks = processedTasks.filter(task => !existingTaskIds.has(task.id));
        
        console.log('Adding new tasks:', newTasks);
        console.log('Existing tasks:', currentTasks);
        
        // Combine existing and new tasks
        const combinedTasks = [...currentTasks, ...newTasks];
        
        // Update goal progress
        if (goal) {
          const totalSubtasks = combinedTasks.reduce((sum, task) => sum + task.totalSubtasks, 0);
          const completedSubtasks = combinedTasks.reduce((sum, task) => sum + task.completedSubtasks, 0);
          const newProgress = totalSubtasks > 0 
            ? Math.round((completedSubtasks / totalSubtasks) * 100)
            : 0;
          
          const allTasksCompleted = combinedTasks.length > 0 && combinedTasks.every(t => t.completed);
          
          setGoal({
            ...goal,
            progress: newProgress,
            totalTasks: combinedTasks.length,
            completedTasks: combinedTasks.filter(t => t.progress === 100).length,
            completed: allTasksCompleted
          });
        }
        
        return combinedTasks;
      });
      
      // Reset form
      setNewTaskName('');
      setNewTaskDate(new Date().toISOString().split('T')[0]);
      setIsAddingTask(false);
      
      toast.success('Task added successfully');
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task');
    }
  };

  const handleTaskUpdated = async (updatedTask: TaskWithProgress, bypass = false) => {
    try {
      // Prepare the data for the API
      const taskData = {
        tasks: [{
          task_id: updatedTask.id,
          task_title: updatedTask.name,
          task_completed: updatedTask.completed,
          task_due_date: updatedTask.scheduledDate,
          task_descr: updatedTask.description,
          subtasks: updatedTask.subtasks.map((subtask, index) => ({
            subtask_id: subtask.id,
            subtask_descr: subtask.name,
            subtask_type: subtask.type,
            subtask_completed: subtask.completed,
            subtask_order: subtask.subtask_order !== undefined ? subtask.subtask_order : index
          }))
        }],
        bypass
      };

      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/goals/${goalId}/tasks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(taskData)
      });

      if (response.status === 409) {
        // Conflict: get the list of conflicting subtask IDs
        const data = await response.json();
        const conflictIds = data.conflicting_subtasks || [];
        // Find the actual subtask objects from updatedTask.subtasks
        const conflicts = updatedTask.subtasks.filter(st => conflictIds.includes(st.id));
        setConflictingSubtasks(conflicts);
        setPendingTaskUpdate(updatedTask);
        setConflictModalOpen(true);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === updatedTask.id ? updatedTask : task
        )
      );
      if (goal) {
        const updatedTasks = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
        const totalTasks = updatedTasks.length;
        const completedTasks = updatedTasks.filter(t => t.completed).length;
        const totalSubtasks = updatedTasks.reduce((sum, t) => sum + t.totalSubtasks, 0);
        const completedSubtasks = updatedTasks.reduce((sum, t) => sum + t.completedSubtasks, 0);
        const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
        const allTasksCompleted = totalTasks > 0 && completedTasks === totalTasks;
        setGoal({
          ...goal,
          completed: allTasksCompleted,
          completedTasks,
          totalTasks,
          progress
        });
      }
      setEditingTask(null);
      const goalResponse = await fetch(`${api}/api/courses/${courseId}/goals`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (goalResponse.ok) {
        const goalsData = await goalResponse.json();
        const currentGoal = goalsData.find((g: any) => 
          g.goal_id === goalId || 
          g.id === goalId || 
          String(g.goal_id) === goalId || 
          String(g.id) === goalId
        );
        if (currentGoal) {
          const updatedGoal: GoalWithProgress = {
            id: currentGoal.goal_id || currentGoal.id,
            courseId: courseId,
            title: currentGoal.goal_descr,
            targetDate: currentGoal.due_date || new Date().toISOString(),
            workMinutesPerDay: 60,
            frequency: 'daily',
            createdAt: currentGoal.created_at,
            updatedAt: currentGoal.updated_at,
            progress: currentGoal.progress || 0,
            totalTasks: currentGoal.total_tasks || 0,
            completedTasks: currentGoal.completed_tasks || 0,
            completed: currentGoal.goal_completed || false
          };
          setGoal(updatedGoal);
        }
      }
      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleBypassConflicts = () => {
    if (pendingTaskUpdate) {
      handleTaskUpdated(pendingTaskUpdate, true);
      setConflictModalOpen(false);
      setConflictingSubtasks([]);
      setPendingTaskUpdate(null);
    }
  };

  const handleTaskDeleted = async (taskId: string) => {
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/goals/${goalId}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      // Update local state
      const updatedTasks = tasks.filter(task => task.id !== taskId);
      setTasks(updatedTasks);
      
      // Update goal progress and completion status
      if (goal) {
        const totalSubtasks = updatedTasks.reduce((sum, task) => sum + task.totalSubtasks, 0);
        const completedSubtasks = updatedTasks.reduce((sum, task) => sum + task.completedSubtasks, 0);
        const newProgress = totalSubtasks > 0 
          ? Math.round((completedSubtasks / totalSubtasks) * 100)
          : 0;
        
        const allTasksCompleted = updatedTasks.length > 0 && updatedTasks.every(t => t.completed);
        
        setGoal({
          ...goal,
          progress: newProgress,
          totalTasks: updatedTasks.length,
          completedTasks: updatedTasks.filter(t => t.progress === 100).length,
          completed: allTasksCompleted
        });
      }
      
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const handleDeleteGoal = () => {
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDeleteGoal = async () => {
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/goals/${goalId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete goal');
      }

      toast.success('Goal deleted successfully');
      router.push(`/courses/${courseId}`);
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete goal');
      setIsDeleteConfirmOpen(false);
    }
  };

  const toggleTaskExpansion = (taskId: string) => {
    if (expandedTaskId === taskId) {
      setExpandedTaskId(null);
    } else {
      setExpandedTaskId(taskId);
    }
  };

  const handleToggleTaskCompletion = async (task: TaskWithProgress) => {
    try {
      // Store the original state for potential rollback
      const originalGoal = goal;
      const originalTasks = tasks;
      
      // Determine new completion status
      const togglingToComplete = !task.completed;
      
      // Prepare updated subtasks
      let updatedSubtasks;
      if (togglingToComplete) {
        // Mark all subtasks as complete
        updatedSubtasks = task.subtasks.map(subtask => ({ ...subtask, completed: true }));
      } else {
        // Leave subtasks as-is
        updatedSubtasks = [...task.subtasks];
      }
      
      // Count completed subtasks
      const completedSubtasksCount = updatedSubtasks.filter(s => s.completed).length;
      const totalSubtasksCount = updatedSubtasks.length;
      const newProgress = totalSubtasksCount > 0 
        ? Math.round((completedSubtasksCount / totalSubtasksCount) * 100)
        : 0;
      
      const updatedTask = {
        ...task,
        completed: togglingToComplete,
        subtasks: updatedSubtasks,
        completedSubtasks: completedSubtasksCount,
        totalSubtasks: totalSubtasksCount,
        progress: newProgress
      };
      
      // Optimistic update - immediately update the UI
      setTasks(prevTasks =>
        prevTasks.map(t => t.id === updatedTask.id ? updatedTask : t)
      );
      
      // Recalculate goal progress and completedTasks
      if (goal) {
        // Use the updated tasks array
        const updatedTasks = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
        const totalTasks = updatedTasks.length;
        const completedTasks = updatedTasks.filter(t => t.completed).length;
        const totalSubtasks = updatedTasks.reduce((sum, t) => sum + t.totalSubtasks, 0);
        const completedSubtasks = updatedTasks.reduce((sum, t) => sum + t.completedSubtasks, 0);
        const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
        const allTasksCompleted = totalTasks > 0 && completedTasks === totalTasks;
        setGoal({
          ...goal,
          completed: allTasksCompleted,
          completedTasks,
          totalTasks,
          progress
        });
      }
      
      // Prepare the data for the API
      const taskData = {
        tasks: [{
          task_id: updatedTask.id,
          task_title: updatedTask.name,
          task_completed: updatedTask.completed,
          subtasks: updatedSubtasks.map((subtask, index) => ({
            subtask_id: subtask.id,
            subtask_descr: subtask.name,
            subtask_type: subtask.type,
            subtask_completed: subtask.completed,
            subtask_order: subtask.subtask_order !== undefined ? subtask.subtask_order : index
          }))
        }]
      };
      
      // Update task in backend
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/goals/${goalId}/tasks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(taskData)
      });

      if (!response.ok) {
        // If API call fails, revert the optimistic updates
        console.error('Task toggle failed, reverting changes');
        setGoal(originalGoal);
        setTasks(originalTasks);
        throw new Error('Failed to update task');
      }

      toast.success('Task completion toggled');
    } catch (error) {
      console.error('Error toggling task completion:', error);
      toast.error('Failed to toggle task completion');
    }
  };

  if (loading || !goal) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatDate = (dateString: string) => {
    // Extract the date part (YYYY-MM-DD) and display as local calendar day
    const [year, month, day] = dateString.split('T')[0].split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Toaster position="top-right" />
      
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleGoBack}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Goal Details</h1>
      </div>
      
      {/* Goal Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm p-8 mb-8">
        {isEditingGoal ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Goal Title</label>
              <input
                type="text"
                value={editedGoalTitle}
                onChange={(e) => setEditedGoalTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={editedGoalDate}
                onChange={(e) => setEditedGoalDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditingGoal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGoalEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">{goal.title}</h2>
                  {goal.completed && (
                    <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-medium">
                      Completed
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg shadow-sm">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">Due {formatDate(goal.targetDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg shadow-sm">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">{goal.workMinutesPerDay} min/day</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-700 font-medium">Progress</span>
                    <span className="font-bold text-lg">{goal.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(goal.progress)}`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <div className="text-sm text-gray-600">
                    {goal.completedTasks} of {goal.totalTasks} tasks completed
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditingGoal(true)}
                  className="p-3 text-gray-500 hover:text-blue-600 hover:bg-white rounded-lg transition-colors shadow-sm"
                  title="Edit Goal"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDeleteGoal}
                  className="p-3 text-gray-500 hover:text-red-600 hover:bg-white rounded-lg transition-colors shadow-sm"
                  title="Delete Goal"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Tasks Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-gray-600 rounded-lg flex items-center justify-center">
              <CheckSquare className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Tasks</h3>
          </div>
          <button
            onClick={() => setIsAddingTask(!isAddingTask)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
        
        {/* Add Task Form */}
        {isAddingTask && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Name</label>
                <input
                  type="text"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="Enter task name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={newTaskDate}
                  onChange={(e) => setNewTaskDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsAddingTask(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTask}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Task
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Tasks List */}
        {tasks.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500">No tasks created yet.</p>
            <button
              onClick={() => setIsAddingTask(true)}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Add your first task
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks
              .slice() // create a shallow copy to avoid mutating state
              .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
              .map(task => (
              <div key={task.id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                {/* Task Header */}
                <div className="p-4 cursor-pointer" onClick={() => toggleTaskExpansion(task.id)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {task.completed ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTaskCompletion(task);
                            }}
                            className="w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors bg-green-500 border-green-500 hover:bg-green-600"
                            title="Mark as incomplete"
                          >
                            <svg className="w-3 h-3 text-white mx-auto" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                        ) : (
                          // Only show checkbox if all subtasks are completed
                          task.totalSubtasks > 0 && task.completedSubtasks === task.totalSubtasks && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTaskCompletion(task);
                            }}
                            className="w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors bg-white border-gray-300 hover:border-green-400"
                            title="Mark as complete"
                          />
                          )
                        )}
                        <h4 className={`font-medium ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{task.name}</h4>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(task.scheduledDate)}</span>
                        </div>
                        <div>
                          <span>{task.completedSubtasks}/{task.totalSubtasks} subtasks</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTaskDeleted(task.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTask(task);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${getProgressColor(task.progress)}`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Expanded Subtasks */}
                {expandedTaskId === task.id && (
                  <div className="border-t border-gray-200 p-4">
                    {task.subtasks.length === 0 ? (
                      <div className="text-center py-4">
                        <button
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                          onClick={() => {
                            // Convert ISO date to YYYY-MM-DD format for URL parameter
                            const dueDateForUrl = task.scheduledDate ? new Date(task.scheduledDate).toISOString().split('T')[0] : '';
                            
                            const params = new URLSearchParams({
                              addSubtaskForTask: task.id,
                              taskDueDate: dueDateForUrl,
                              taskName: encodeURIComponent(task.name || ''),
                              goalId: goalId,
                              courseId: courseId,
                            });
                            router.push(`/calendar?${params.toString()}`);
                          }}
                        >
                          Add Subtask
                        </button>
                      </div>
                    ) : (
                      <SubtaskList 
                        taskId={task.id} 
                        subtasks={task.subtasks.slice().sort((a, b) => (a.subtask_order ?? 0) - (b.subtask_order ?? 0))}
                        taskDueDate={task.scheduledDate}
                        taskName={task.name}
                        goalId={goalId}
                        courseId={courseId}
                        onSubtaskDeleted={(subtaskId) => {
                          // Update the local task state to reflect the deleted subtask
                          const updatedSubtasks = task.subtasks.filter(subtask => subtask.id !== subtaskId);
                          // Keep the order after deletion
                          const sortedSubtasks = updatedSubtasks.slice().sort((a, b) => (a.subtask_order ?? 0) - (b.subtask_order ?? 0));
                          const completedSubtasksCount = updatedSubtasks.filter(s => s.completed).length;
                          const totalSubtasksCount = updatedSubtasks.length;
                          
                          const updatedTask = {
                            ...task,
                            subtasks: sortedSubtasks,
                            totalSubtasks: totalSubtasksCount,
                            completedSubtasks: completedSubtasksCount,
                            // Automatically complete task if all subtasks are done
                            completed: completedSubtasksCount === totalSubtasksCount && totalSubtasksCount > 0
                          };
                          
                          // Recalculate progress
                          updatedTask.progress = updatedTask.totalSubtasks > 0
                            ? Math.round((updatedTask.completedSubtasks / updatedTask.totalSubtasks) * 100)
                            : 0;
                          
                          // Update tasks list
                          handleTaskUpdated(updatedTask);
                        }}
                        onSubtaskAdded={(newSubtask) => {
                          // Update the local task state to reflect the added subtask
                          const updatedSubtasks = [...task.subtasks, newSubtask];
                          // Keep the order after addition
                          const sortedSubtasks = updatedSubtasks.slice().sort((a, b) => (a.subtask_order ?? 0) - (b.subtask_order ?? 0));
                          const completedSubtasksCount = updatedSubtasks.filter(s => s.completed).length;
                          const totalSubtasksCount = updatedSubtasks.length;
                          
                          const updatedTask = {
                            ...task,
                            subtasks: sortedSubtasks,
                            totalSubtasks: totalSubtasksCount,
                            completedSubtasks: completedSubtasksCount,
                            // Automatically complete task if all subtasks are done
                            completed: completedSubtasksCount === totalSubtasksCount && totalSubtasksCount > 0
                          };
                          
                          // Recalculate progress
                          updatedTask.progress = updatedTask.totalSubtasks > 0
                            ? Math.round((updatedTask.completedSubtasks / updatedTask.totalSubtasks) * 100)
                            : 0;
                          
                          // Update tasks list
                          handleTaskUpdated(updatedTask);
                        }}
                        onSubtaskToggled={(subtaskId, completed) => {
                          // Update the local task state to reflect the subtask completion change
                          const updatedSubtasks = task.subtasks.map(subtask => 
                            subtask.id === subtaskId ? { ...subtask, completed } : subtask
                          );
                          // Keep the order after toggle
                          const sortedSubtasks = updatedSubtasks.slice().sort((a, b) => (a.subtask_order ?? 0) - (b.subtask_order ?? 0));
                          
                          const completedSubtasksCount = updatedSubtasks.filter(s => s.completed).length;
                          const totalSubtasksCount = updatedSubtasks.length;
                          
                          const updatedTask = {
                            ...task,
                            subtasks: sortedSubtasks,
                            completedSubtasks: completedSubtasksCount,
                            // Automatically complete task if all subtasks are done
                            completed: completedSubtasksCount === totalSubtasksCount && totalSubtasksCount > 0
                          };
                          
                          // Recalculate progress
                          updatedTask.progress = updatedTask.totalSubtasks > 0
                            ? Math.round((updatedTask.completedSubtasks / updatedTask.totalSubtasks) * 100)
                            : 0;
                          
                          // Update tasks list
                          handleTaskUpdated(updatedTask);
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Delete Goal Confirmation Dialog */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Delete Goal</h3>
            <p className="mb-6">Are you sure you want to delete "{goal.title}"? This will permanently delete this goal and all its tasks. This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDeleteGoal}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete Goal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Editor Modal */}
      {editingTask && (
        <TaskEditorModal
          isOpen={true}
          taskDate={editingTask.scheduledDate}
          onClose={() => setEditingTask(null)}
          task={editingTask}
          onSave={handleTaskUpdated}
        />
      )}

      {/* Conflict Modal */}
      {conflictModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Subtask Scheduling Conflict</h3>
            <p className="mb-4 text-gray-700">The following subtasks have a <b>start time after the proposed task due date</b>:</p>
            <ul className="mb-4">
              {conflictingSubtasks.map(subtask => (
                <li key={subtask.id} className="mb-2">
                  <div className="font-medium">{subtask.name}</div>
                  <div className="text-sm text-gray-600">
                    Start: {subtask.start_time ? new Date(subtask.start_time).toLocaleString() : 'N/A'}<br/>
                    End: {subtask.end_time ? new Date(subtask.end_time).toLocaleString() : 'N/A'}<br/>
                    Proposed Due Date: {pendingTaskUpdate?.scheduledDate ? (() => {
                      const [year, month, day] = pendingTaskUpdate.scheduledDate.split('-').map(Number);
                      return new Date(year, month - 1, day).toLocaleDateString();
                    })() : 'N/A'}
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConflictModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleBypassConflicts}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Bypass and Save Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalDetailPage;
 