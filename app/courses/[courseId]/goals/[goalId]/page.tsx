"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  CheckSquare,
  List,
  CalendarDays,
  Circle,
  MessageCircle,
  Play,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { GoalWithProgress, Task, TaskWithProgress, Subtask } from '../../../components/studyplan/types';
import TaskCard from '../../../components/studyplan/TaskCard';
import { SubtaskList } from '../../../components/studyplan/SubtaskList';
import TaskEditorModal from '../../../components/studyplan/TaskEditorModal';
import { TimerProvider } from '../../../components/TimerContext';
import { AudioProvider } from '../../../components/AudioContext';
import { UnifiedTimer } from '../../../components/UnifiedTimer';
import { format, parseISO, isAfter, startOfDay } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Helper to compare only the date part (YYYY-MM-DD), not affected by timezones
function isAfterDay(dateA: string, dateB: string) {
  const [aYear, aMonth, aDay] = dateA.split('T')[0].split('-').map(Number);
  const [bYear, bMonth, bDay] = dateB.split('T')[0].split('-').map(Number);
  if (aYear !== bYear) return aYear > bYear;
  if (aMonth !== bMonth) return aMonth > bMonth;
  return aDay > bDay;
}
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import confetti from 'canvas-confetti';
import { useTimer } from '../../../components/TimerContext';

// Timer state store to preserve timer state across component boundaries
const timerStateStore = {
  currentState: null as any,
  setState: (state: any) => {
    timerStateStore.currentState = state;
  },
  getState: () => timerStateStore.currentState,
  clearState: () => {
    timerStateStore.currentState = null;
  }
};

// Inactivity Monitor Component
const InactivityMonitor: React.FC<{
  activeSubtask: Subtask;
  onInactivityDetected: () => void;
  onActivityConfirmed: () => void;
  onPauseRequested: () => void;
}> = ({ activeSubtask, onInactivityDetected, onActivityConfirmed, onPauseRequested }) => {
  const { isActive, updateActivity, getCurrentTimerState } = useTimer();
  
  useEffect(() => {
    if (!isActive) {
      // Save current timer state before showing inactivity modal
      const currentState = getCurrentTimerState();
      timerStateStore.setState({
        ...currentState,
        subtaskId: activeSubtask.id,
        timestamp: Date.now()
      });
      onInactivityDetected();
    }
  }, [isActive, onInactivityDetected, getCurrentTimerState, activeSubtask.id]);

  return null; // This component doesn't render anything, it just monitors
};

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
  const [goalDueDateConflictModalOpen, setGoalDueDateConflictModalOpen] = useState(false);
  const [goalDueDateConflicts, setGoalDueDateConflicts] = useState<{ type: 'task' | 'subtask', name: string, date: string }[]>([]);
  const [viewMode, setViewMode] = useState<'tasks' | 'subtasks'>('tasks');
  const [timeDataModal, setTimeDataModal] = useState<{ subtask: Subtask; timeData: any } | null>(null);
  const [analyticsMode, setAnalyticsMode] = useState<'today' | 'week'>('today');
  
  // Subtask functionality state
  const [showStartModal, setShowStartModal] = useState(false);
  const [activeSubtask, setActiveSubtask] = useState<Subtask | null>(null);
  const [subtaskToStart, setSubtaskToStart] = useState<Subtask | null>(null);
  const [pausedSubtasks, setPausedSubtasks] = useState<Set<string>>(new Set());
  const [engagedSubtasks, setEngagedSubtasks] = useState<Set<string>>(new Set());
  
  // Edit and delete subtask state
  const [editingSubtask, setEditingSubtask] = useState<string | null>(null);
  const [editSubtaskName, setEditSubtaskName] = useState('');
  
  // Completion time modal state
  const [showCompletionTimeModal, setShowCompletionTimeModal] = useState(false);
  const [completionTimeMinutes, setCompletionTimeMinutes] = useState('');
  const [subtaskToComplete, setSubtaskToComplete] = useState<Subtask | null>(null);
  const [analyticsUpdateTrigger, setAnalyticsUpdateTrigger] = useState(0);
  const [deleteButtonPosition, setDeleteButtonPosition] = useState<{ x: number; y: number } | null>(null);
  const [hasShownConfetti, setHasShownConfetti] = useState(false);
  const previousProgressRef = useRef<number>(0);
  const wasCompletedRef = useRef<boolean>(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [pausedTimerState, setPausedTimerState] = useState<any>(null);
  const [overdueCollapsed, setOverdueCollapsed] = useState(true);

  // Add at the top of GoalDetailPage:
  const INACTIVITY_THRESHOLD_SECONDS = 600; // 10 minutes
  const INACTIVITY_CONFIRM_TIMEOUT = 180000; // 3 minutes in ms
  const [inactivityConfirmTimeoutId, setInactivityConfirmTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // At the top of GoalDetailPage, after useState for pausedSubtasks:
  useEffect(() => {
    // Restore pausedSubtasks from localStorage on mount
    const stored = localStorage.getItem('pausedSubtasks');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setPausedSubtasks(new Set(parsed));
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    // Persist pausedSubtasks to localStorage whenever it changes
    localStorage.setItem('pausedSubtasks', JSON.stringify(Array.from(pausedSubtasks)));
  }, [pausedSubtasks]);

  // Helper function to get all subtasks from all tasks
  const getAllSubtasks = () => {
    const allSubtasks: Array<Subtask & { taskName: string; taskDueDate: string }> = [];
    tasks.forEach(task => {
      task.subtasks.forEach(subtask => {
        allSubtasks.push({
          ...subtask,
          taskName: task.name,
          taskDueDate: task.scheduledDate
        });
      });
    });
    return allSubtasks;
  };

  // Confetti celebration function
  const triggerConfetti = () => {
    if (hasShownConfetti) return;
    
    // Create a celebration effect
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // since particles fall down, start a bit higher than random
      confetti(Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      }));
      confetti(Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      }));
    }, 250);

    setHasShownConfetti(true);
    toast.success('🎉 Congratulations! Goal completed! 🎉');
  };

  // Monitor goal progress and trigger confetti when completed
  useEffect(() => {
    if (goal) {
      // Check if goal just completed (progress went from <100 to 100)
      const justCompleted = goal.progress === 100 && previousProgressRef.current < 100;
      
      // Check if this is the first time we're seeing this goal as completed
      const firstTimeCompleted = justCompleted && !wasCompletedRef.current;
      
      if (firstTimeCompleted && !hasShownConfetti) {
        triggerConfetti();
      }
      
      // Update refs
      previousProgressRef.current = goal.progress;
      wasCompletedRef.current = goal.progress === 100;
    }
  }, [goal?.progress, hasShownConfetti]);

  // Analytics data aggregation with reactive updates
  const analyticsData = useMemo(() => {
    const allSubtasks = getAllSubtasks();
    
    if (analyticsMode === 'today') {
      // Calculate time spent for each hour of today
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Initialize hours array (0-23)
      const hours: { [key: number]: number } = {};
      for (let i = 0; i < 24; i++) {
        hours[i] = 0;
      }
      
      allSubtasks.forEach(subtask => {
        // Get time data for this subtask
        const totalMinutes = subtask.subtask_total_active_minutes || 0;
        if (totalMinutes <= 0) return;
        
        // Get the engagement start and end times
        const engagementStart = subtask.subtask_engagement_start;
        const engagementEnd = subtask.subtask_engagement_end;
        
        if (!engagementStart) return;
        
        // Check if this subtask was worked on today
        const startDate = new Date(engagementStart);
        const endDate = engagementEnd ? new Date(engagementEnd) : new Date();
        
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        
        // If subtask engagement overlaps with today
        if (startDate <= todayEnd && endDate >= todayStart) {
          // Calculate which hours this subtask was worked on
          for (let hour = 0; hour < 24; hour++) {
            const hourStart = new Date(today);
            hourStart.setHours(hour, 0, 0, 0);
            const hourEnd = new Date(today);
            hourEnd.setHours(hour, 59, 59, 999);
            
            // If subtask engagement overlaps with this hour
            if (startDate <= hourEnd && endDate >= hourStart) {
              // Calculate how much time was spent in this specific hour
              const sessionStart = startDate > hourStart ? startDate : hourStart;
              const sessionEnd = endDate < hourEnd ? endDate : hourEnd;
              
              const sessionMinutes = (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60);
              
              if (sessionMinutes > 0) {
                hours[hour] += sessionMinutes;
              }
            }
          }
        }
      });
      
      // Convert minutes to hours and create hourly data
      return [
        { name: '12 AM', hours: Math.round((hours[0] / 60) * 100) / 100 },
        { name: '1 AM', hours: Math.round((hours[1] / 60) * 100) / 100 },
        { name: '2 AM', hours: Math.round((hours[2] / 60) * 100) / 100 },
        { name: '3 AM', hours: Math.round((hours[3] / 60) * 100) / 100 },
        { name: '4 AM', hours: Math.round((hours[4] / 60) * 100) / 100 },
        { name: '5 AM', hours: Math.round((hours[5] / 60) * 100) / 100 },
        { name: '6 AM', hours: Math.round((hours[6] / 60) * 100) / 100 },
        { name: '7 AM', hours: Math.round((hours[7] / 60) * 100) / 100 },
        { name: '8 AM', hours: Math.round((hours[8] / 60) * 100) / 100 },
        { name: '9 AM', hours: Math.round((hours[9] / 60) * 100) / 100 },
        { name: '10 AM', hours: Math.round((hours[10] / 60) * 100) / 100 },
        { name: '11 AM', hours: Math.round((hours[11] / 60) * 100) / 100 },
        { name: '12 PM', hours: Math.round((hours[12] / 60) * 100) / 100 },
        { name: '1 PM', hours: Math.round((hours[13] / 60) * 100) / 100 },
        { name: '2 PM', hours: Math.round((hours[14] / 60) * 100) / 100 },
        { name: '3 PM', hours: Math.round((hours[15] / 60) * 100) / 100 },
        { name: '4 PM', hours: Math.round((hours[16] / 60) * 100) / 100 },
        { name: '5 PM', hours: Math.round((hours[17] / 60) * 100) / 100 },
        { name: '6 PM', hours: Math.round((hours[18] / 60) * 100) / 100 },
        { name: '7 PM', hours: Math.round((hours[19] / 60) * 100) / 100 },
        { name: '8 PM', hours: Math.round((hours[20] / 60) * 100) / 100 },
        { name: '9 PM', hours: Math.round((hours[21] / 60) * 100) / 100 },
        { name: '10 PM', hours: Math.round((hours[22] / 60) * 100) / 100 },
        { name: '11 PM', hours: Math.round((hours[23] / 60) * 100) / 100 },
      ];
    } else {
      // This week: Sunday to Saturday - get actual time spent each day
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Sunday
      
      const week: { [key: string]: number } = { 
        Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 
      };
      
      allSubtasks.forEach(subtask => {
        // Get time data for this subtask
        const totalMinutes = subtask.subtask_total_active_minutes || 0;
        if (totalMinutes <= 0) return;
        
        // Get the engagement start and end times
        const engagementStart = subtask.subtask_engagement_start;
        const engagementEnd = subtask.subtask_engagement_end;
        
        if (!engagementStart) return;
        
        // Calculate which days this subtask was worked on
        const startDate = new Date(engagementStart);
        const endDate = engagementEnd ? new Date(engagementEnd) : new Date();
        
        // For each day in the current week, calculate how much time was spent
        for (let d = new Date(weekStart); d <= now; d.setDate(d.getDate() + 1)) {
          const dayStr = d.toISOString().split('T')[0];
          const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
          
          // Check if this subtask was worked on this specific day
          const dayStart = new Date(d);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(d);
          dayEnd.setHours(23, 59, 59, 999);
          
          // If subtask engagement overlaps with this day
          if (startDate <= dayEnd && endDate >= dayStart) {
            // Calculate how much time was spent on this specific day
            const sessionStart = startDate > dayStart ? startDate : dayStart;
            const sessionEnd = endDate < dayEnd ? endDate : dayEnd;
            
            const sessionMinutes = (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60);
            
            if (week[dayName] !== undefined && sessionMinutes > 0) {
              week[dayName] += sessionMinutes;
            }
          }
        }
      });
      
      // Convert minutes to hours and round to 2 decimal places
      return [
        { name: 'Sun', hours: Math.round((week['Sun'] / 60) * 100) / 100 },
        { name: 'Mon', hours: Math.round((week['Mon'] / 60) * 100) / 100 },
        { name: 'Tue', hours: Math.round((week['Tue'] / 60) * 100) / 100 },
        { name: 'Wed', hours: Math.round((week['Wed'] / 60) * 100) / 100 },
        { name: 'Thu', hours: Math.round((week['Thu'] / 60) * 100) / 100 },
        { name: 'Fri', hours: Math.round((week['Fri'] / 60) * 100) / 100 },
        { name: 'Sat', hours: Math.round((week['Sat'] / 60) * 100) / 100 },
      ];
    }
  }, [analyticsMode, analyticsUpdateTrigger, tasks]); // Dependencies that trigger recalculation

  // Calculate previous week's average for reference line
  const previousWeekAverage = useMemo(() => {
    const allSubtasks = getAllSubtasks();
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(weekStart.getDate() - 7);
    const prevWeekEnd = new Date(weekStart);
    prevWeekEnd.setDate(weekStart.getDate() - 1);
    
    const prevWeek: { [key: string]: number } = { 
      Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 
    };
    
    allSubtasks.forEach(subtask => {
      if (!subtask.subtask_total_active_minutes) return;
      const engagementStart = subtask.subtask_engagement_start;
      const engagementEnd = subtask.subtask_engagement_end;
      if (!engagementStart) return;
      
      const startDate = new Date(engagementStart);
      const endDate = engagementEnd ? new Date(engagementEnd) : new Date();
      
      for (let d = new Date(prevWeekStart); d <= prevWeekEnd; d.setDate(d.getDate() + 1)) {
        const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
        const dayStart = new Date(d);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(d);
        dayEnd.setHours(23, 59, 59, 999);
        
        if (startDate <= dayEnd && endDate >= dayStart) {
          const sessionStart = startDate > dayStart ? startDate : dayStart;
          const sessionEnd = endDate < dayEnd ? endDate : dayEnd;
          const sessionMinutes = (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60);
          
          if (prevWeek[dayName] !== undefined && sessionMinutes > 0) {
            prevWeek[dayName] += sessionMinutes;
          }
        }
      }
    });
    
    const prevWeekTotal = Object.values(prevWeek).reduce((sum, minutes) => sum + minutes, 0);
    const prevWeekAverage = prevWeekTotal / 7;
    
    // Add placeholder data if no real data exists
    if (prevWeekAverage === 0) {
      return 2.4; // Placeholder: 2.4 hours average
    }
    
    return Math.round((prevWeekAverage / 60) * 100) / 100;
  }, [analyticsUpdateTrigger, tasks]);

  useEffect(() => {
    // Reset confetti state when goal changes
    setHasShownConfetti(false);
    previousProgressRef.current = 0;
    wasCompletedRef.current = false;
    
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
        
        // Debug: Check if any subtasks have calendar scheduling data
        const subtasksWithScheduling = tasksData.filter((item: any) => 
          item.subtask_id !== 'placeholder' && (item.start_time || item.end_time)
        );
        console.log('Subtasks with calendar scheduling:', subtasksWithScheduling);
        
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
              // Include calendar scheduling data
              start_time: item.start_time,
              end_time: item.end_time,
              task_due_date: item.task_due_date,
              // Include time tracking data
              subtask_total_active_minutes: item.subtask_total_active_minutes || 0,
              subtask_engagement_start: item.subtask_engagement_start,
              subtask_engagement_end: item.subtask_engagement_end,
              subtask_last_interaction: item.subtask_last_interaction
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

    // Restrict goal due date to not be before any task due date or subtask start time (date-only, timezone-safe)
    const newGoalDateStr = editedGoalDate.split('T')[0]; // 'YYYY-MM-DD'
    const invalidTasks = tasks.filter(
      (task) => isAfterDay(task.scheduledDate, newGoalDateStr)
    );
    const invalidSubtasks = tasks.flatMap(task => task.subtasks).filter(
      (subtask) => subtask.start_time && isAfterDay(subtask.start_time, newGoalDateStr)
    );
    if (invalidTasks.length > 0 || invalidSubtasks.length > 0) {
      // Collect conflicts for modal
      const conflicts = [
        ...invalidTasks.map(task => ({ type: 'task' as const, name: task.name, date: task.scheduledDate })),
        ...invalidSubtasks.map(subtask => ({ type: 'subtask' as const, name: subtask.name, date: subtask.start_time! }))
      ];
      setGoalDueDateConflicts(conflicts);
      setGoalDueDateConflictModalOpen(true);
      return;
    }
    
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
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No authentication token found');
        toast.error('Authentication required. Please log in again.');
        return;
      }

      console.log('Updating task with data:', taskData);
      
      const response = await fetch(`${api}/api/goals/${goalId}/tasks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(taskData)
      });

      console.log('Task update response status:', response.status);

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
        const errorText = await response.text();
        console.error('Task update failed:', response.status, response.statusText, errorText);
        throw new Error(`Failed to update task: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('Task update successful:', responseData);

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
      
      // Refresh goal data
      const goalResponse = await fetch(`${api}/api/courses/${courseId}/goals`, {
        headers: {
          'Authorization': `Bearer ${token}`
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
            completed: currentGoal.completed || false
          };
          setGoal(updatedGoal);
        }
      }
      
      toast.success('Task updated successfully!');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update task');
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

  const handleDeleteGoal = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const modalWidth = 400; // Approximate modal width
    const modalHeight = 200; // Approximate modal height
    
    // Calculate position to ensure modal stays within viewport
    let x = rect.left;
    let y = rect.bottom + 8;
    
    // Adjust if modal would go off the right edge
    if (x + modalWidth > window.innerWidth) {
      x = window.innerWidth - modalWidth - 16; // 16px margin from edge
    }
    
    // Adjust if modal would go off the bottom edge
    if (y + modalHeight > window.innerHeight) {
      y = rect.top - modalHeight - 8; // Show above the button instead
    }
    
    setDeleteButtonPosition({ x, y });
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

  // Check if a subtask is paused (was started but not completed)
  const isSubtaskPaused = (subtaskId: string) => {
    return pausedSubtasks.has(subtaskId);
  };

  // Check if a subtask is currently engaged (actively being tracked)
  const isSubtaskEngaged = (subtaskId: string) => {
    return engagedSubtasks.has(subtaskId);
  };

  // Handle page visibility change (pause when page is hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && activeSubtask) {
        // Pause the current subtask when page becomes hidden
        pauseCurrentSubtask();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeSubtask]);

  // Handle beforeunload (pause when page is about to unload)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeSubtask) {
        // Pause the current subtask when page is about to unload
        pauseCurrentSubtask();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeSubtask]);

  const pauseCurrentSubtask = async () => {
    if (!activeSubtask) return;

    try {
      // End engagement (this pauses the tracking)
      await endEngagement(activeSubtask.id);
      
      // Mark as paused
      setPausedSubtasks(prev => new Set(prev).add(activeSubtask.id));
      
      // Save the current timer state before clearing activeSubtask
      const currentTimerState = timerStateStore.getState();
      if (currentTimerState) {
        timerStateStore.setState({
          ...currentTimerState,
          subtaskId: activeSubtask.id,
          timestamp: Date.now()
        });
      }
      
      // Clear active subtask
      setActiveSubtask(null);
      
      toast.success('Time tracking paused');
    } catch (error) {
      console.error('Error pausing subtask:', error);
    }
  };

  const handleActivityConfirmed = () => {
    setShowInactivityModal(false);
    // The activity will be updated by the TimerContext automatically
    // when the user interacts with the page
    if (inactivityConfirmTimeoutId) {
      clearTimeout(inactivityConfirmTimeoutId);
      setInactivityConfirmTimeoutId(null);
    }
  };

  // When rendering the Pomodoro timer screen, set the inactivity threshold to 10 minutes:
  // (inside the activeSubtask screen rendering)
  useEffect(() => {
    if (activeSubtask) {
      // Set inactivity threshold to 10 minutes
      window.dispatchEvent(new CustomEvent('setInactivityThreshold', { detail: INACTIVITY_THRESHOLD_SECONDS }));
    }
  }, [activeSubtask]);

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

  // Helper function to check if a subtask is overdue
  const isSubtaskOverdue = (subtask: Subtask) => {
    // If subtask is completed, it's not overdue
    if (subtask.completed) {
      return false;
    }
    
    // Get the subtask's due date - prioritize subtask's own end_time from calendar
    let dueDate: Date | null = null;
    
    if (subtask.end_time) {
      // Use subtask's scheduled end time from calendar
      dueDate = new Date(subtask.end_time);
    } else if (subtask.task_due_date) {
      // Fall back to task's due date if subtask doesn't have its own
      dueDate = new Date(subtask.task_due_date);
    }
    
    // If no due date at all, it's not overdue
    if (!dueDate) {
      return false;
    }
    
    // Compare with current time
    const now = new Date();
    
    // For date-only comparison (without time), reset time to start of day
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return dueDateOnly < todayOnly;
  };

  // Helper function to check if a task is overdue
  const isTaskOverdue = (task: TaskWithProgress) => {
    // If task is completed, it's not overdue
    if (task.completed) {
      return false;
    }
    
    // If no scheduled date, it's not overdue
    if (!task.scheduledDate) {
      return false;
    }
    
    // Compare with current time
    const now = new Date();
    
    // For date-only comparison (without time), reset time to start of day
    const dueDateOnly = new Date(task.scheduledDate);
    dueDateOnly.setHours(0, 0, 0, 0);
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return dueDateOnly < todayOnly;
  };

  // Helper function to organize subtasks by due date
  const getSubtasksByDate = () => {
    const allSubtasks = getAllSubtasks();
    const overdue: Array<Subtask & { taskName: string; taskDueDate: string; isOverdue: boolean; scheduledTime?: string }> = [];
    const subtasksByDate = new Map<string, Array<Subtask & { taskName: string; taskDueDate: string; isOverdue: boolean; scheduledTime?: string }>>();

    allSubtasks.forEach(subtask => {
      // Skip completed subtasks
      if (subtask.completed) return;

      // Prioritize calendar scheduled time (end_time) for grouping
      let dueDate: string;
      let scheduledTime: string | undefined;

      if (subtask.end_time) {
        const endDate = new Date(subtask.end_time);
        dueDate = endDate.toISOString().split('T')[0];
        scheduledTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      } else if (subtask.task_due_date) {
        dueDate = new Date(subtask.task_due_date).toISOString().split('T')[0];
      } else {
        dueDate = 'No Due Date';
      }

      const overdueStatus = isSubtaskOverdue(subtask);
      const subtaskObj = { ...subtask, isOverdue: overdueStatus, scheduledTime };
      if (overdueStatus) {
        overdue.push(subtaskObj);
      } else {
        if (!subtasksByDate.has(dueDate)) subtasksByDate.set(dueDate, []);
        subtasksByDate.get(dueDate)!.push(subtaskObj);
      }
    });

    // Sort dates and subtasks within each date
    const sortedDates = Array.from(subtasksByDate.keys()).sort((a, b) => {
      if (a === 'No Due Date') return 1;
      if (b === 'No Due Date') return -1;
      return a.localeCompare(b);
    });

    const result = new Map<string, Array<Subtask & { taskName: string; taskDueDate: string; isOverdue: boolean; scheduledTime?: string }>>();
    sortedDates.forEach(date => {
      const subtasks = subtasksByDate.get(date)!;
      subtasks.sort((a, b) => {
        if (a.scheduledTime && b.scheduledTime) {
          return a.scheduledTime.localeCompare(b.scheduledTime);
        }
        return 0;
      });
      result.set(date, subtasks);
    });

    // Sort overdue subtasks by due date ascending
    overdue.sort((a, b) => {
      const aDue = a.end_time ? new Date(a.end_time) : a.task_due_date ? new Date(a.task_due_date) : new Date(0);
      const bDue = b.end_time ? new Date(b.end_time) : b.task_due_date ? new Date(b.task_due_date) : new Date(0);
      return aDue.getTime() - bDue.getTime();
    });

    return { overdue, byDate: result };
  };

  // Helper function to get time data for a subtask
  const getTimeData = async (subtaskId: string) => {
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return null;
      }

      const response = await fetch(`${api}/api/goals/tasks/subtasks/${subtaskId}/time-data`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.ok) {
        const timeData = await response.json();
        return timeData;
      } else {
        console.error('Failed to get time data');
        return null;
      }
    } catch (error) {
      console.error('Error getting time data:', error);
      return null;
    }
  };

  const formatTimeData = (timeData: any) => {
    const start = timeData.started ? new Date(timeData.started) : null;
    const lastInteraction = timeData.last_changed ? new Date(timeData.last_changed) : null;
    
    return {
      started: start ? start.toLocaleString() : 'Not started',
      lastChanged: lastInteraction ? lastInteraction.toLocaleString() : 'No interactions',
      totalTime: timeData.total_time_minutes ? `${timeData.total_time_minutes.toFixed(1)} minutes` : '0 minutes'
    };
  };

  // Start Canvas-style time tracking when subtask is clicked
  const startEngagement = async (subtaskId: string) => {
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await fetch(`${api}/api/goals/tasks/subtasks/${subtaskId}/start-engagement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.ok) {
        setEngagedSubtasks(prev => new Set(prev).add(subtaskId));
        toast.success('Time tracking started');
      } else {
        console.error('Failed to start engagement tracking');
      }
    } catch (error) {
      console.error('Error starting engagement tracking:', error);
    }
  };

  // End engagement and calculate total time
  const endEngagement = async (subtaskId: string) => {
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await fetch(`${api}/api/goals/tasks/subtasks/${subtaskId}/end-engagement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.ok) {
        setEngagedSubtasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(subtaskId);
          return newSet;
        });
        toast.success('Time tracking ended');
      } else {
        console.error('Failed to end engagement tracking');
      }
    } catch (error) {
      console.error('Error ending engagement tracking:', error);
    }
  };

  // Modified subtask click handler
  const handleSubtaskClick = async (subtask: Subtask) => {
    console.log('=== SUBTASK CLICK DEBUG ===');
    console.log('Clicked subtask:', subtask.id, subtask.name);
    console.log('Paused subtasks:', Array.from(pausedSubtasks));
    console.log('Engaged subtasks:', Array.from(engagedSubtasks));
    console.log('Is paused:', isSubtaskPaused(subtask.id));
    console.log('Is engaged:', isSubtaskEngaged(subtask.id));
    
    // First check if it's paused locally
    if (isSubtaskPaused(subtask.id)) {
      console.log('SHOWING RESUME MODAL (paused locally)');
      setSubtaskToStart(subtask);
      setShowResumeModal(true);
      return;
    }
    
    // Then check engagement status from API
    console.log('Fetching time data...');
    const timeData = await getTimeData(subtask.id);
    console.log('Time data received:', timeData);
    console.log('Is currently engaged:', timeData?.is_currently_engaged);
    console.log('Total seconds:', timeData?.total_time_seconds);
    console.log('Total minutes:', timeData?.total_time_minutes);
    
    // Check if currently engaged or has time tracked
    if (timeData && (timeData.is_currently_engaged || timeData.total_time_seconds > 0 || timeData.total_time_minutes > 0)) {
      console.log('SHOWING RESUME MODAL (engaged or has time tracked)');
      setSubtaskToStart(subtask);
      setShowResumeModal(true);
      return;
    }
    
    console.log('SHOWING START MODAL');
    setSubtaskToStart(subtask);
    setShowStartModal(true);
  };

  // Start engagement and show active subtask screen
  const confirmStartSubtask = async () => {
    if (!subtaskToStart) return;
    
    // Clear any previous timer state since this is a fresh start
    timerStateStore.clearState();
    
    await startEngagement(subtaskToStart.id);
    setActiveSubtask(subtaskToStart);
    setShowStartModal(false);
    setSubtaskToStart(null);
  };

  // Resume engagement and show active subtask screen
  const confirmResumeSubtask = async () => {
    if (!subtaskToStart) return;
    
    // Remove from paused set
    setPausedSubtasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(subtaskToStart.id);
      return newSet;
    });
    
    // Start engagement again
    await startEngagement(subtaskToStart.id);
    setActiveSubtask(subtaskToStart);
    setShowResumeModal(false);
    setSubtaskToStart(null);
  };

  // Complete subtask from active subtask screen
  const handleCompleteActiveSubtask = async () => {
    if (!activeSubtask) return;
    await endEngagement(activeSubtask.id);
    // Mark as complete in backend and update UI
    await handleToggleSubtask(activeSubtask.id, true);
    setActiveSubtask(null);
    // Clear timer state since subtask is completed
    timerStateStore.clearState();
    // Trigger analytics update
    setAnalyticsUpdateTrigger(prev => prev + 1);
  };

  // Back button handler
  const handleBackFromActiveSubtask = () => {
    if (activeSubtask) {
      // Save the current timer state before adding to paused subtasks
      const currentTimerState = timerStateStore.getState();
      if (currentTimerState) {
        timerStateStore.setState({
          ...currentTimerState,
          subtaskId: activeSubtask.id,
          timestamp: Date.now()
        });
      }
      setPausedSubtasks(prev => new Set(prev).add(activeSubtask.id));
    }
    setActiveSubtask(null);
    // Don't clear timer state - we want to preserve it for when they resume
  };

  const toggleSectionCollapse = (date: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  // Edit subtask function
  const handleEditSubtask = async (subtaskId: string) => {
    if (!editSubtaskName.trim()) return;

    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await fetch(`${api}/api/goals/tasks/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editSubtaskName.trim()
        }),
      });

      if (response.ok) {
        // Update the subtask in the local state
        setTasks(prevTasks => 
          prevTasks.map(task => ({
            ...task,
            subtasks: task.subtasks.map(subtask =>
              subtask.id === subtaskId ? { ...subtask, name: editSubtaskName.trim() } : subtask
            )
          }))
        );
        
        setEditingSubtask(null);
        setEditSubtaskName('');
        toast.success('Subtask updated successfully!');
      } else {
        toast.error('Failed to update subtask');
      }
    } catch (error) {
      console.error('Error updating subtask:', error);
      toast.error('Failed to update subtask');
    }
  };

  // Delete subtask function
  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await fetch(`${api}/api/goals/tasks/subtasks/${subtaskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.ok) {
        // Remove the subtask from local state
        setTasks(prevTasks => 
          prevTasks.map(task => {
            const updatedSubtasks = task.subtasks.filter(subtask => subtask.id !== subtaskId);
            const completedSubtasksCount = updatedSubtasks.filter(s => s.completed).length;
            const totalSubtasksCount = updatedSubtasks.length;
            
            return {
              ...task,
              subtasks: updatedSubtasks,
              completedSubtasks: completedSubtasksCount,
              totalSubtasks: totalSubtasksCount,
              completed: completedSubtasksCount === totalSubtasksCount && totalSubtasksCount > 0,
              progress: totalSubtasksCount > 0 
                ? Math.round((completedSubtasksCount / totalSubtasksCount) * 100) 
                : 0
            };
          })
        );
        
        // Update goal progress
        if (goal) {
          setTasks(prevTasks => {
            const updatedTasks = prevTasks.map(task => {
              const updatedSubtasks = task.subtasks.filter(subtask => subtask.id !== subtaskId);
              const completedSubtasksCount = updatedSubtasks.filter(s => s.completed).length;
              const totalSubtasksCount = updatedSubtasks.length;
              
              return {
                ...task,
                subtasks: updatedSubtasks,
                completedSubtasks: completedSubtasksCount,
                totalSubtasks: totalSubtasksCount,
                completed: completedSubtasksCount === totalSubtasksCount && totalSubtasksCount > 0,
                progress: totalSubtasksCount > 0 
                  ? Math.round((completedSubtasksCount / totalSubtasksCount) * 100) 
                  : 0
              };
            });
            
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
            
            return updatedTasks;
          });
        }
        
        toast.success('Subtask deleted successfully!');
      } else {
        toast.error('Failed to delete subtask');
      }
    } catch (error) {
      console.error('Error deleting subtask:', error);
      toast.error('Failed to delete subtask');
    }
  };

  // Helper function to toggle subtask completion
  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      // If we're completing a subtask, check if it has engagement data
      if (completed) {
        const subtask = getAllSubtasks().find(s => s.id === subtaskId);
        if (subtask) {
          // Check if this subtask has been engaged with (has engagement tracking)
          const hasEngagement = engagedSubtasks.has(subtaskId);
          
          if (!hasEngagement) {
            // No engagement tracking, show completion time modal
            setSubtaskToComplete(subtask);
            setShowCompletionTimeModal(true);
            return;
          }
        }
      }

      const response = await fetch(`${api}/api/goals/tasks/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          completed: completed
        }),
      });

      if (response.ok) {
        // Update local state instead of reloading
        setTasks(prevTasks => 
          prevTasks.map(task => {
            const updatedSubtasks = task.subtasks.map(subtask => 
              subtask.id === subtaskId ? { ...subtask, completed } : subtask
            );
            
            const completedSubtasksCount = updatedSubtasks.filter(s => s.completed).length;
            const totalSubtasksCount = updatedSubtasks.length;
            
            return {
              ...task,
              subtasks: updatedSubtasks,
              completedSubtasks: completedSubtasksCount,
              totalSubtasks: totalSubtasksCount,
              completed: completedSubtasksCount === totalSubtasksCount && totalSubtasksCount > 0,
              progress: totalSubtasksCount > 0 
                ? Math.round((completedSubtasksCount / totalSubtasksCount) * 100) 
                : 0
            };
          })
        );
        
        // Update goal progress
        if (goal) {
          setTasks(prevTasks => {
            const updatedTasks = prevTasks.map(task => {
              const updatedSubtasks = task.subtasks.map(subtask => 
                subtask.id === subtaskId ? { ...subtask, completed } : subtask
              );
              
              const completedSubtasksCount = updatedSubtasks.filter(s => s.completed).length;
              const totalSubtasksCount = updatedSubtasks.length;
              
              return {
                ...task,
                subtasks: updatedSubtasks,
                completedSubtasks: completedSubtasksCount,
                totalSubtasks: totalSubtasksCount,
                completed: completedSubtasksCount === totalSubtasksCount && totalSubtasksCount > 0,
                progress: totalSubtasksCount > 0 
                  ? Math.round((completedSubtasksCount / totalSubtasksCount) * 100) 
                  : 0
              };
            });
            
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
            
            return updatedTasks;
          });
        }
        
        // Trigger analytics update when a subtask is completed
        if (completed) {
          setAnalyticsUpdateTrigger(prev => prev + 1);
        }
        
        toast.success(completed ? 'Subtask completed!' : 'Subtask marked as incomplete');
      } else {
        toast.error('Failed to update subtask');
      }
    } catch (error) {
      console.error('Error updating subtask:', error);
      toast.error('Failed to update subtask');
    }
  };

  const handleSetCompletionTime = async () => {
    if (!subtaskToComplete || !completionTimeMinutes.trim()) {
      toast.error('Please enter a valid completion time');
      return;
    }

    const timeMinutes = parseFloat(completionTimeMinutes);
    if (isNaN(timeMinutes) || timeMinutes <= 0) {
      toast.error('Please enter a valid time in minutes');
      return;
    }

    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      // First, set the completion time
      const timeResponse = await fetch(`${api}/api/goals/tasks/subtasks/${subtaskToComplete.id}/set-completion-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          completion_time_minutes: timeMinutes
        }),
      });

      if (!timeResponse.ok) {
        throw new Error('Failed to set completion time');
      }

      // Then, mark the subtask as completed
      const completionResponse = await fetch(`${api}/api/goals/tasks/subtasks/${subtaskToComplete.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          completed: true
        }),
      });

      if (completionResponse.ok) {
        // Update local state
        setTasks(prevTasks => 
          prevTasks.map(task => {
            const updatedSubtasks = task.subtasks.map(subtask => 
              subtask.id === subtaskToComplete.id ? { ...subtask, completed: true } : subtask
            );
            
            const completedSubtasksCount = updatedSubtasks.filter(s => s.completed).length;
            const totalSubtasksCount = updatedSubtasks.length;
            
            return {
              ...task,
              subtasks: updatedSubtasks,
              completedSubtasks: completedSubtasksCount,
              totalSubtasks: totalSubtasksCount,
              completed: completedSubtasksCount === totalSubtasksCount && totalSubtasksCount > 0,
              progress: totalSubtasksCount > 0 
                ? Math.round((completedSubtasksCount / totalSubtasksCount) * 100) 
                : 0
            };
          })
        );
        
        // Update goal progress
        if (goal) {
          setTasks(prevTasks => {
            const updatedTasks = prevTasks.map(task => {
              const updatedSubtasks = task.subtasks.map(subtask => 
                subtask.id === subtaskToComplete.id ? { ...subtask, completed: true } : subtask
              );
              
              const completedSubtasksCount = updatedSubtasks.filter(s => s.completed).length;
              const totalSubtasksCount = updatedSubtasks.length;
              
              return {
                ...task,
                subtasks: updatedSubtasks,
                completedSubtasks: completedSubtasksCount,
                totalSubtasks: totalSubtasksCount,
                completed: completedSubtasksCount === totalSubtasksCount && totalSubtasksCount > 0,
                progress: totalSubtasksCount > 0 
                  ? Math.round((completedSubtasksCount / totalSubtasksCount) * 100) 
                  : 0
              };
            });
            
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
            
            return updatedTasks;
          });
        }
        
        // Trigger analytics update
        setAnalyticsUpdateTrigger(prev => prev + 1);
        
        toast.success(`Subtask completed! Time recorded: ${timeMinutes} minutes`);
      
        // Reset modal state
        setShowCompletionTimeModal(false);
        setCompletionTimeMinutes('');
        setSubtaskToComplete(null);
      } else {
        throw new Error('Failed to complete subtask');
      }
    } catch (error) {
      console.error('Error setting completion time:', error);
      toast.error('Failed to set completion time');
    }
  };

  // Render active subtask screen if activeSubtask is set
  if (activeSubtask) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-row items-stretch">
        {/* Main content area with PDF reading */}
        <div className="flex-1 flex flex-col">
          {/* Header with Working on text and Complete button */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Working on: {activeSubtask.name}</h2>
            <button
              onClick={handleCompleteActiveSubtask}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Complete Subtask
            </button>
          </div>
          
          {/* PDF reading content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="prose prose-lg max-w-none">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Introduction to Data Structures and Algorithms</h1>
                
                <p className="text-gray-700 leading-relaxed mb-4">
                  Data structures and algorithms are fundamental concepts in computer science that form the backbone of efficient programming. Understanding these concepts is crucial for writing optimized code and solving complex computational problems.
                </p>
                
                <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">What are Data Structures?</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  A data structure is a specialized format for organizing, processing, retrieving, and storing data. There are several basic and advanced types of data structures, all designed to arrange data to suit a specific purpose so that it can be accessed and worked with in appropriate ways.
                </p>
                
                <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Basic Data Structures</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li><strong>Arrays:</strong> A collection of elements stored at contiguous memory locations.</li>
                  <li><strong>Linked Lists:</strong> A linear data structure where elements are stored in nodes, and each node contains data and a reference to the next node.</li>
                  <li><strong>Stacks:</strong> A linear data structure that follows the Last In First Out (LIFO) principle.</li>
                  <li><strong>Queues:</strong> A linear data structure that follows the First In First Out (FIFO) principle.</li>
                </ul>
                
                <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">Understanding Algorithms</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  An algorithm is a finite sequence of well-defined, computer-implementable instructions, typically to solve a class of problems or to perform a computation. Algorithms are always unambiguous and are used as specifications for performing calculations, data processing, automated reasoning, and other tasks.
                </p>
                
                <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Algorithm Analysis</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  When analyzing algorithms, we typically focus on two main aspects: time complexity and space complexity. Time complexity measures the amount of time an algorithm takes to complete as a function of the input size, while space complexity measures the amount of memory space required.
                </p>
                
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 my-6">
                  <p className="text-blue-800 font-medium">Key Takeaway:</p>
                  <p className="text-blue-700">The choice of data structure and algorithm can significantly impact the performance of your program. Always consider the trade-offs between time and space complexity when designing solutions.</p>
                </div>
                
                <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">Practical Applications</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Data structures and algorithms are used in various real-world applications, from simple tasks like sorting a list of names to complex operations like routing algorithms in GPS systems or recommendation algorithms in social media platforms.
                </p>
                
                <p className="text-gray-700 leading-relaxed">
                  As you progress through this course, you'll learn to implement these concepts in practice, analyze their performance characteristics, and apply them to solve real-world problems efficiently.
                </p>
              </div>
            </div>
          </div>
          
          {/* Back button at bottom */}
          <div className="p-6 border-t border-gray-200">
            <button
              onClick={handleBackFromActiveSubtask}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
        
        {/* Timer sidebar */}
        <div className="w-[400px] bg-gray-50 border-l border-gray-200 flex flex-col items-center justify-center p-8">
          <AudioProvider>
            <TimerProvider 
              autoStart={true}
              initialTimerState={timerStateStore.getState()?.subtaskId === activeSubtask.id ? timerStateStore.getState() : undefined}
            >
              <UnifiedTimer />
            </TimerProvider>
          </AudioProvider>
        </div>

        {/* Inactivity Monitor */}
        <InactivityMonitor 
          activeSubtask={activeSubtask}
          onInactivityDetected={() => setShowInactivityModal(true)}
          onActivityConfirmed={handleActivityConfirmed}
          onPauseRequested={pauseCurrentSubtask}
        />
      </div>
    );
  }

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
                  onClick={(e) => handleDeleteGoal(e)}
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
      
      {/* View Toggle and Content Section */}
      <div className="mb-6">
        {/* View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-gray-600 rounded-lg flex items-center justify-center">
              {viewMode === 'tasks' ? (
                <CheckSquare className="w-4 h-4 text-white" />
              ) : (
                <CalendarDays className="w-4 h-4 text-white" />
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {viewMode === 'tasks' ? 'Tasks' : 'Subtasks by Due Date'}
            </h3>
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Toggle Button */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('tasks')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'tasks'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4" />
                <span>Tasks</span>
              </button>
              <button
                onClick={() => setViewMode('subtasks')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'subtasks'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                <span>Subtasks</span>
              </button>
            </div>
            
            {/* Add Task Button - only show in tasks view */}
            {viewMode === 'tasks' && (
              <button
                onClick={() => setIsAddingTask(!isAddingTask)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Task</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Conditional Content Based on View Mode */}
        {viewMode === 'tasks' ? (
          <>
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
              <div key={task.id} className={`rounded-lg border shadow-sm ${
                isTaskOverdue(task) 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-white border-gray-200'
              }`}>
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
                        <h4 className={`font-medium ${
                          task.completed 
                            ? 'text-gray-500 line-through' 
                            : isTaskOverdue(task)
                              ? 'text-red-600'
                              : 'text-gray-900'
                        }`}>{task.name}</h4>
                        {isTaskOverdue(task) && !task.completed && (
                          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                            Overdue
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span className={isTaskOverdue(task) ? 'text-red-600' : ''}>{formatDate(task.scheduledDate)}</span>
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
                          onClick={async () => {
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
          </>
        ) : (
          /* Subtasks by Due Date View */
          <div className="space-y-6">
            {(() => {
              const { overdue, byDate } = getSubtasksByDate();
              const allSubtasks = getAllSubtasks();
              
              if (allSubtasks.length === 0) {
                return (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500">No subtasks found.</p>
                    <p className="text-sm text-gray-400 mt-1">Create tasks and subtasks to see them organized by due date.</p>
                  </div>
                );
              }
              
              // Helper for header formatting
              const renderDateHeader = (dateStr: string) => {
                if (dateStr === 'No Due Date') return <span className="text-gray-500">No Due Date</span>;
                const date = new Date(dateStr);
                const today = new Date();
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                const isToday = date.toDateString() === today.toDateString();
                const isTomorrow = date.toDateString() === tomorrow.toDateString();
                const monthDay = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                const weekday = date.toLocaleDateString(undefined, { weekday: 'long' });
                if (isToday) {
                  return <span className="text-gray-500 font-semibold"><span className="font-normal">{monthDay} · </span><span className="font-bold">Today</span><span className="font-normal"> · {weekday}</span></span>;
                } else if (isTomorrow) {
                  return <span className="text-gray-500 font-semibold"><span className="font-normal">{monthDay} · </span><span className="font-bold">Tomorrow</span><span className="font-normal"> · {weekday}</span></span>;
                } else {
                  return <span className="text-gray-500 font-semibold">{monthDay} · {weekday}</span>;
                }
              };
              
              // Group overdue subtasks by due date
              const overdueByDate = overdue.reduce((acc, subtask) => {
                let dueDate: string;
                if (subtask.end_time) {
                  dueDate = new Date(subtask.end_time).toISOString().split('T')[0];
                } else if (subtask.task_due_date) {
                  dueDate = new Date(subtask.task_due_date).toISOString().split('T')[0];
                } else {
                  dueDate = 'No Due Date';
                }
                if (!acc[dueDate]) acc[dueDate] = [];
                acc[dueDate].push(subtask);
                return acc;
              }, {} as Record<string, typeof overdue>);
              const overdueDateKeys = Object.keys(overdueByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
              
              return (
                <>
                  {/* Overdue Section */}
                  {overdue.length > 0 && (
                    <div className="bg-white rounded-lg border border-red-200 shadow-sm">
                      <div
                        className="px-4 py-3 border-b bg-red-50 border-red-200 cursor-pointer flex items-center gap-2"
                        onClick={() => setOverdueCollapsed((prev) => !prev)}
                      >
                        {overdueCollapsed ? (
                          <ChevronRight size={16} className="text-red-600" />
                        ) : (
                          <ChevronDown size={16} className="text-red-600" />
                        )}
                        <h4 className="font-semibold text-red-700">Overdue</h4>
                        <span className="text-sm text-gray-500 ml-2">{overdue.length} subtasks</span>
                      </div>
                      {!overdueCollapsed && (
                        <div className="p-4 space-y-6">
                          {overdueDateKeys.map(date => (
                            <div key={date}>
                              <div className="mb-2">
                                <h5 className="text-gray-500 font-semibold text-base">{renderDateHeader(date)}</h5>
                              </div>
                              <div className="space-y-3">
                                {overdueByDate[date].map((subtask: any) => (
                                  <div
                                    key={subtask.id}
                                    className="flex items-center gap-3 p-3 rounded-lg border bg-red-50 border-red-200"
                                  >
                                    <button
                                      onClick={() => handleToggleSubtask(subtask.id, !subtask.completed)}
                                      className="flex-shrink-0"
                                    >
                                      <Circle size={20} className="text-red-400 hover:text-gray-600" />
                                    </button>
                                    <div className="flex-1">
                                      <p
                                        className="text-sm text-red-700 font-medium underline cursor-pointer"
                                        onClick={async () => handleSubtaskClick(subtask)}
                                      >
                                        {subtask.name}
                                      </p>
                                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                                        <span>From: {subtask.taskName}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">Overdue</span>
                                      <button
                                        onClick={() => {
                                          setEditingSubtask(subtask.id);
                                          setEditSubtaskName(subtask.name);
                                        }}
                                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                        title="Edit subtask"
                                      >
                                        <Edit size={16} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteSubtask(subtask.id)}
                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                        title="Delete subtask"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Ordered Date Groups: Today, Tomorrow, others, No Due Date */}
                  {(() => {
                    const today = new Date();
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const todayStr = today.toISOString().split('T')[0];
                    const tomorrowStr = tomorrow.toISOString().split('T')[0];
                    const entries = Array.from(byDate.entries());
                    type SubtaskEntry = [string, Array<Subtask & { taskName: string; taskDueDate: string; isOverdue: boolean; scheduledTime?: string }>];
                    const todayEntry = entries.find(([date]) => date === todayStr) as SubtaskEntry | undefined;
                    const tomorrowEntry = entries.find(([date]) => date === tomorrowStr) as SubtaskEntry | undefined;
                    const noDueDateEntry = entries.find(([date]) => date === 'No Due Date') as SubtaskEntry | undefined;
                    const otherEntries = entries.filter(([date]) => date !== todayStr && date !== tomorrowStr && date !== 'No Due Date') as SubtaskEntry[];
                    // Sort otherEntries chronologically
                    otherEntries.sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());
                    // Render in order: Today, Tomorrow, others, No Due Date
                    const ordered: SubtaskEntry[] = [todayEntry, tomorrowEntry, ...otherEntries, noDueDateEntry].filter((entry): entry is SubtaskEntry => Array.isArray(entry?.[1]));
                    return ordered.map(([date, subtasks]) => {
                      const isCollapsed = collapsedSections.has(date);
                      return (
                        <div key={date} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                          <div className={`px-4 py-3 border-b cursor-pointer bg-gray-50 border-gray-200`} onClick={() => toggleSectionCollapse(date)}>
                            <div className="flex items-center gap-2">
                              <h4 className="text-lg font-semibold">{renderDateHeader(date)}</h4>
                              <ChevronDown
                                size={16}
                                className={`transition-transform ${isCollapsed ? 'rotate-180' : ''} text-gray-500`}
                              />
                              <span className="text-sm text-gray-500 ml-2">{subtasks.length} subtasks</span>
                            </div>
                          </div>
                          {!isCollapsed && (
                            <div className="p-4 space-y-3">
                              {subtasks.map((subtask: any) => (
                                <div
                                  key={subtask.id}
                                  className={`flex items-center gap-3 p-3 rounded-lg border bg-gray-50 border-gray-200`}
                                >
                                  <button
                                    onClick={() => handleToggleSubtask(subtask.id, !subtask.completed)}
                                    className="flex-shrink-0"
                                  >
                                    <Circle size={20} className={`text-gray-400 hover:text-gray-600`} />
                                  </button>
                                  <div className="flex-1">
                                    <p
                                      className={`text-sm text-gray-800 underline cursor-pointer`}
                                      onClick={async () => handleSubtaskClick(subtask)}
                                    >
                                      {subtask.name}
                                    </p>
                                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                                      <span>From: {subtask.taskName}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => {
                                        setEditingSubtask(subtask.id);
                                        setEditSubtaskName(subtask.name);
                                      }}
                                      className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                      title="Edit subtask"
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSubtask(subtask.id)}
                                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                      title="Delete subtask"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </>
              );
            })()}
          </div>
        )}
      </div>
      
      {/* Delete Goal Confirmation Dialog */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute bg-white p-6 rounded-lg shadow-lg border border-gray-200"
            style={{
              left: deleteButtonPosition ? `${deleteButtonPosition.x}px` : '50%',
              top: deleteButtonPosition ? `${deleteButtonPosition.y}px` : '50%',
              width: '400px',
              transform: deleteButtonPosition ? 'none' : 'translate(-50%, -50%)'
            }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-sm font-bold">!</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Delete Goal</h3>
              </div>
            </div>
            <p className="mb-6 text-gray-700">
              Are you sure you want to delete <span className="font-semibold">"{goal.title}"</span>? 
              <br />
              This will permanently delete this goal and all its tasks. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setDeleteButtonPosition(null);
                }}
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

      {/* Time Data Modal */}
      {timeDataModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]" onClick={() => setTimeDataModal(null)}>
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setTimeDataModal(null)}>
              <span className="text-xl">&times;</span>
            </button>
            <h3 className="text-lg font-semibold mb-4 text-center">Time Data</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Started:</span>
                <span>{formatTimeData(timeDataModal.timeData).started}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Last Changed:</span>
                <span>{formatTimeData(timeDataModal.timeData).lastChanged}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Total Time:</span>
                <span>{formatTimeData(timeDataModal.timeData).totalTime}</span>
              </div>
            </div>
            <div className="mt-6 text-center">
              <button
                onClick={() => setTimeDataModal(null)}
                className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subtask Modal */}
      {editingSubtask && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]" onClick={() => setEditingSubtask(null)}>
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setEditingSubtask(null)}>
              <span className="text-xl">&times;</span>
            </button>
            <h3 className="text-lg font-semibold mb-4">Edit Subtask</h3>
            <input
              type="text"
              value={editSubtaskName}
              onChange={(e) => setEditSubtaskName(e.target.value)}
              placeholder="Enter subtask name..."
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleEditSubtask(editingSubtask)}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleEditSubtask(editingSubtask)}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
              >
                Update Subtask
              </button>
              <button
                onClick={() => setEditingSubtask(null)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Time Modal */}
      {showCompletionTimeModal && subtaskToComplete && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]" onClick={() => setShowCompletionTimeModal(false)}>
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowCompletionTimeModal(false)}>
              <span className="text-xl">&times;</span>
            </button>
            <h3 className="text-lg font-semibold mb-4 text-center">Record Completion Time</h3>
            <p className="text-sm text-gray-600 mb-4 text-center">
              How long did it take you to complete "{subtaskToComplete.name}"?
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time (minutes)</label>
                <input
                  type="number"
                  value={completionTimeMinutes}
                  onChange={(e) => setCompletionTimeMinutes(e.target.value)}
                  placeholder="e.g., 15.5"
                  min="0.1"
                  step="0.1"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleSetCompletionTime()}
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowCompletionTimeModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSetCompletionTime}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
                >
                  Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Section */}
      <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Study Time Analytics</h3>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setAnalyticsMode('today')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                analyticsMode === 'today'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setAnalyticsMode('week')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                analyticsMode === 'week'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              This Week
            </button>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analyticsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickFormatter={(value) => `${value}h`}
                domain={[0, (dataMax: number) => Math.ceil(dataMax)]}
                ticks={(() => {
                  const maxHours = Math.max(...analyticsData.map((d: any) => d.hours || 0));
                  const maxTick = Math.ceil(maxHours);
                  const ticks = [];
                  for (let i = 0; i <= maxTick; i++) {
                    ticks.push(i);
                  }
                  return ticks;
                })()}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: any) => [`${value} hours`, 'Time Spent']}
                labelFormatter={(label) => `Day: ${label}`}
              />
              <Bar 
                dataKey="hours" 
                fill="#3b82f6" 
                radius={[2, 2, 0, 0]}
                barSize={analyticsMode === 'today' ? 15 : 40}
              />
              {analyticsMode === 'week' && (
                <ReferenceLine 
                  y={previousWeekAverage} 
                  stroke="#ef4444" 
                  strokeDasharray="5 5" 
                  strokeWidth={2}
                  label={{
                    value: `Last week avg: ${previousWeekAverage}h`,
                    position: 'top',
                    fill: '#ef4444',
                    fontSize: 12
                  }}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            {analyticsMode === 'today' 
              ? 'Total time spent on subtasks today'
              : 'Total time spent on subtasks this week (Sunday - Saturday)'
            }
          </p>
        </div>
      </div>

      {/* Start Subtask Modal */}
      {showStartModal && subtaskToStart && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]" onClick={() => setShowStartModal(false)}>
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowStartModal(false)}>
              <span className="text-xl">&times;</span>
            </button>
            <h3 className="text-lg font-semibold mb-4 text-center">Start Subtask</h3>
            <p className="text-center mb-6">Do you want to start "{subtaskToStart.name}"?</p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowStartModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmStartSubtask}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resume Subtask Modal */}
      {showResumeModal && subtaskToStart && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]" onClick={() => setShowResumeModal(false)}>
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowResumeModal(false)}>
              <span className="text-xl">&times;</span>
            </button>
            <h3 className="text-lg font-semibold mb-4 text-center">Resume Subtask</h3>
            <p className="text-center mb-6">Do you want to resume "{subtaskToStart.name}"?</p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowResumeModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmResumeSubtask}
                className="flex-1 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors"
              >
                Resume
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inactivity Modal */}
      {showInactivityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl">⏰</span>
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Are you still working?</h3>
              <p className="text-gray-600 mb-6">
                We haven't detected any activity for a while. Please confirm if you're still working on this subtask.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleActivityConfirmed}
                  className="flex-1 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors"
                >
                  Yes, I'm working
                </button>
                <button
                  onClick={() => {
                    setShowInactivityModal(false);
                    pauseCurrentSubtask();
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Pause tracking
                </button>
              </div>
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
          goalDueDate={goal ? new Date(goal.targetDate).toISOString().split('T')[0] : undefined}
        />
      )}

      {/* Subtask Conflict Modal */}
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

      {/* Goal Due Date Conflict Modal */}
      <Dialog open={goalDueDateConflictModalOpen} onOpenChange={setGoalDueDateConflictModalOpen}>
        <DialogContent>
          <DialogTitle>Goal Due Date Conflict</DialogTitle>
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2 text-red-600">Conflict!</h3>
            <p className="mb-4 text-gray-700">You cannot set the goal due date before the following tasks or subtasks:</p>
            <ul className="mb-4">
              {goalDueDateConflicts.map((item, idx) => (
                <li key={idx} className="mb-2">
                  <div className="font-medium">
                    <span className="capitalize">{item.type}:</span> {item.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {item.type === 'task'
                      ? `Task Due Date: ${item.date ? format(parseISO(item.date.split('T')[0]), 'MMM d, yyyy') : 'N/A'}`
                      : `Subtask Start: ${item.date ? format(parseISO(item.date), 'MMM d, yyyy, h:mm a') : 'N/A'}`}
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                onClick={() => setGoalDueDateConflictModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoalDetailPage;
 