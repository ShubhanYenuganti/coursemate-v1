"use client"

import { useEffect, useRef, useState } from "react"
import {
  ChevronRight,
  Calendar,
  Settings,
  X,
  ChevronDown,
  GripVertical,
  Eye,
  Plus,
  Save,
  ExternalLink,
  RotateCcw,
  Move,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import useAuthRedirect from "@/hooks/useAuthRedirect"
import { Switch } from "@/components/ui/switch"
import { toast } from "react-hot-toast"

import { DayView } from "./components/DayView"
import { WeekView } from "./components/WeekView"
import { MonthView } from "./components/MonthView"
import { YearView } from "./components/YearView"
import { colorForCourse } from "./utils/color.utils"
import { calculateStatus, getStatusColor } from "./utils/goal.status"
import { groupTasksByTaskId } from "./utils/goal.progress"
import { Goal, GoalsByDate, Course } from "./utils/goal.types"
import { startOfToday, getWeekDates, formatHourLabel, getLocalDateKey, getDateKeyFromDateString } from "./utils/date.utils"

// Add this helper near the top (after imports)
function formatDate(dateString: string) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('T')[0].split('-');
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Helper to get a Date object from a date string, always as UTC for date-only values
function getUtcDate(dateString: string) {
  if (!dateString) return null;
  // Handles both 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:mm:ssZ' formats
  const datePart = dateString.split('T')[0];
  return new Date(datePart + 'T00:00:00Z');
}

// Refactor updateCourseTitles to accept courses array and return new array
async function updateCourseTitles(courseIds: string[], token: string, courses: Course[]): Promise<Course[]> {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
  const coursePromises = courseIds.map(async courseId => {
    try {
      const course = await fetch(`${api}/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
        method: "GET"
      });
      if (!course.ok) throw new Error(`Request failed ${course.status}`);
      const courseDetails = await course.json();
      return {
        course_id: courseId,
        course_title: courseDetails.title,
        course_description: courseDetails.description
      };
    } catch (error) {
      return {
        course_id: courseId,
        course_title: courseId,
        course_description: ''
      };
    }
  });
  const courseDetails = await Promise.all(coursePromises);
  const newCourses = courses.map((course: Course) => {
    const details = courseDetails.find(d => d.course_id === course.course_id);
    return details ? {
      ...course,
      course_title: details.course_title,
      course_description: details.course_description
    } : course;
  });
  return newCourses;
}

export function CalendarScheduler() {

  const [syncing, setSyncing] = useState(false);
  const [goalsByDate, setGoalsByDate] = useState<GoalsByDate>({});
  const [courses, setCourses] = useState<Course[]>([]);

  // SYNC BUTTON HANDLER
  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      
      // Call the new Google Calendar sync endpoint
      const response = await fetch(`${api}/api/calendar/sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      toast.success(result.message || "Google Calendar sync completed successfully");
      
      // Refresh the goals data to show any new events from Google Calendar
      const fetchGoals = async () => {
        try {
          const goalsRes = await fetch(`${api}/api/goals/user`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!goalsRes.ok) throw new Error(`Request failed ${goalsRes.status}`);
          const grouped = await goalsRes.json() as Record<string, Goal[]>;
          // Filter out placeholder tasks from each date group
          const filteredGrouped: Record<string, Goal[]> = {};
          Object.keys(grouped).forEach(key => {
            filteredGrouped[key] = grouped[key].filter(goal => goal.task_id !== 'placeholder');
          });
          setGoalsByDate(filteredGrouped);
          const ordered = Object.keys(filteredGrouped)
            .sort((a, b) => (a === 'unscheduled' ? 1 : b === 'unscheduled' ? -1 : new Date(a).getTime() - new Date(b).getTime()))
            .reduce((acc, k) => { acc[k] = filteredGrouped[k]; return acc; }, {} as Record<string, Goal[]>);
          setSortedGoalsByDate(ordered);
          const all: Goal[] = ([] as Goal[]).concat(...Object.values(grouped));
          const courses: Course[] = [];
          const courseIds = [...new Set(all.map(g => g.course_id))];
          courseIds.forEach(courseId => {
            const courseGoals = all.filter(goal => goal.course_id === courseId);
            const firstGoal = courseGoals[0];
            const color = firstGoal?.google_calendar_color || colorForCourse(courseId, null);
            courses.push({
              goals: courseGoals,
              course_title: courseId,
              course_description: '',
              course_id: courseId,
              color: color
            });
          });
          setCourses(courses);
          updateCourseTitles(courseIds, token, courses).then(setCourses);
        } catch (err) {
          console.error("fetchGoals error", err);
        }
      };

      // Refresh the goals data
      fetchGoals();
      
    } catch (err: any) {
      toast.error("Sync failed: " + (err.message || err));
    } finally {
      setSyncing(false);
    }
  };

  /** Current selected date -- initialised to today */
  const [currentDate, setCurrentDate] = useState<Date>(() => startOfToday())
  const [currentView, setCurrentView] = useState<"day" | "week" | "month" | "year">("week")

  /** UI State */
  const [showSettings, setShowSettings] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [sidebarTab, setSidebarTab] = useState<"courses" | "tasks">("tasks");
  const [goalDisplayPosition, setGoalDisplayPosition] = useState<{ x: number; y: number } | null>(null)
  const [overflowEvents, setOverflowEvents] = useState<{ events: Goal[]; position: { x: number; y: number }; day: Date } | null>(null)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [courseVisibility, setCourseVisibility] = useState<Record<string, boolean>>({});
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);

  // Add task modal state
  const [userCourses, setUserCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [courseGoals, setCourseGoals] = useState<any[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);

  // Add this state near the top of CalendarScheduler
  const [newSubtasks, setNewSubtasks] = useState<{ subtask_descr: string; subtask_type: string; estimatedTimeMinutes: number }[]>([]);

  // Add these state variables near the top for form fields
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');

  /** Hours array for timeline */
  const hours = Array.from({ length: 24 }, (_, i) => i) // 12 AM (0) to 11 PM (23)

  /** Expanded accordion panels for upcoming-tasks list  */
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({
    [startOfToday().toISOString().split("T")[0]]: true,
  })

  /** Expanded sections for task categories */
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overdue: true,
    upcoming: true,
    future: true,
    completed: false,
  })

  /** Expanded subtasks in sidebar */
  const [expandedSidebarSubtasks, setExpandedSidebarSubtasks] = useState<Record<string, boolean>>({});

  /** Subtasks modal state */
  const [subtasksModal, setSubtasksModal] = useState<{
    isOpen: boolean;
    task: any;
    position: { x: number; y: number };
  } | null>(null);

  /** Delete confirmation modal state */
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    task: Goal | null;
    position: { x: number; y: number };
  } | null>(null);

  /** Subtask delete confirmation modal state */
  const [deleteSubtaskModal, setDeleteSubtaskModal] = useState<{
    isOpen: boolean;
    subtask: Goal | null;
    position: { x: number; y: number };
  } | null>(null);

  /** Undo state for deleted tasks */
  const [deletedTask, setDeletedTask] = useState<Goal | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);

  /** Undo state for deleted subtasks */
  const [deletedSubtask, setDeletedSubtask] = useState<Goal | null>(null);
  const [showUndoSubtaskToast, setShowUndoSubtaskToast] = useState(false);

  /** Subtasks modal drag state */
  const [isSubtasksModalDragging, setIsSubtasksModalDragging] = useState(false);
  const [subtasksModalDragOffset, setSubtasksModalDragOffset] = useState({ x: 0, y: 0 });

  /** Drag and drop state for task events */
  const [isDraggingTask, setIsDraggingTask] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Goal | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);

  /** Helpers */
  const weekDates = getWeekDates(currentDate) // Sunday‑based week

  const toggleDayExpansion = (dateStr: string) =>
    setExpandedDays((prev) => ({ ...prev, [dateStr]: !prev[dateStr] }))

  const toggleSectionExpansion = (section: string) =>
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))

  const toggleSidebarSubtaskExpansion = (taskId: string) =>
    setExpandedSidebarSubtasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }))

  const openSubtasksModal = (task: any, event: React.MouseEvent) => {
    event.stopPropagation();
    setSubtasksModal({
      isOpen: true,
      task,
      position: { x: event.clientX - 350, y: event.clientY - 100 } // Further to the left
    });
  };

  const closeSubtasksModal = () => {
    setSubtasksModal(null);
  };

  const handleSubtasksModalMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsSubtasksModalDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setSubtasksModalDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleSubtasksModalMouseMove = (e: MouseEvent) => {
    if (!isSubtasksModalDragging || !subtasksModal) return;

    const newX = e.clientX - subtasksModalDragOffset.x;
    const newY = e.clientY - subtasksModalDragOffset.y;

    setSubtasksModal(prev => prev ? {
      ...prev,
      position: { x: newX, y: newY }
    } : null);
  };

  const handleSubtasksModalMouseUp = () => {
    setIsSubtasksModalDragging(false);
  };

  // Drag and drop handlers for task events
  const handleTaskDragStart = (e: React.DragEvent, task: Goal) => {
    // Prevent dragging for Google Calendar events
    if (task.goal_id === "Google Calendar") {
      e.preventDefault();
      return;
    }
    
    e.stopPropagation();
    setIsDraggingTask(true);
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify(task));
  };

  const handleTaskDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsDraggingTask(false);
    setDraggedTask(null);
    setDragOverDate(null);
  };

  const handleDayDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(date);
  };

  const handleDayDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverDate(null);
  };

  const handleDayDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedTask) return;

    // Convert the target date to ISO string format
    const newDueDate = targetDate.toISOString().split('T')[0];
    
    // Only update if the date actually changed
    const currentDueDate = draggedTask.task_due_date || draggedTask.due_date;
    if (currentDueDate) {
      const currentDateStr = currentDueDate.split('T')[0];
      if (currentDateStr === newDueDate) {
        setDragOverDate(null);
        return; // No change needed
      }
    }

    try {
      // Call the handleTaskDueDateChange function
      await handleTaskDueDateChange(draggedTask, newDueDate);
      toast.success(`Task moved to ${targetDate.toLocaleDateString()}`);
      
      // Close the overflow modal if it's open
      if (overflowEvents) {
        setOverflowEvents(null);
      }
    } catch (error) {
      console.error('Failed to move task:', error);
      toast.error('Failed to move task');
    } finally {
      setDragOverDate(null);
    }
  };

  const handleGoalClick = (event: Goal | any, clickEvent?: React.MouseEvent) => {
    if (clickEvent) {
      setGoalDisplayPosition({ x: clickEvent.clientX, y: clickEvent.clientY })
    }
    // Reset expanded task if clicking on a different task
    if (selectedGoal?.task_id !== event.task_id) {
      setExpandedTaskId(null)
    }
    setSelectedGoal((p: Goal | null) => (p?.id === event.id ? null : event))
  }

  const handleOverflowClick = (events: Goal[], position: { x: number; y: number }, day: Date) => {
    setOverflowEvents({ events, position, day })
  }

  const handleDayClick = (date: Date) => {
    // Open Add Task modal with the selected date pre-filled
    setNewTaskDueDate(date.toISOString().split('T')[0]);
    setShowAddTask(true);
  }

  const [hoveredTask, setHoveredTask] = useState<Goal | null>(null);

  const handleTaskHover = (task: Goal, event: React.MouseEvent) => {
    // Only allow hover for non-Google Calendar events
    if (task.goal_id !== "Google Calendar") {
      setHoveredTask(task);
    }
  }

  const handleTaskMouseLeave = () => {
    // Clear hovered task when mouse leaves
    setHoveredTask(null);
  }

  const handleDeleteConfirm = async () => {
    if (deleteModal?.task) {
      // Close the modal immediately
      setDeleteModal(null);
      // Also close the overflow events modal if it's open
      if (overflowEvents) {
        setOverflowEvents(null);
      }
      // Then handle the deletion
      await handleTaskDelete(deleteModal.task);
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModal(null);
    // Also close the overflow events modal if it's open
    if (overflowEvents) {
      setOverflowEvents(null);
    }
  }

  const handleSubtaskDeleteConfirm = async () => {
    if (deleteSubtaskModal?.subtask) {
      // Close the modal immediately
      setDeleteSubtaskModal(null);
      // Then handle the deletion
      await handleSubtaskDelete(deleteSubtaskModal.subtask);
    }
  }

  const handleSubtaskDeleteCancel = () => {
    setDeleteSubtaskModal(null);
  }

  const handleUndoDelete = async () => {
    if (!deletedTask) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) return alert("Please log in first.");

      // Recreate the task using the create-task endpoint
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const payload = {
        task_title: deletedTask.task_title,
        task_descr: deletedTask.task_descr || '',
        task_due_date: deletedTask.task_due_date || deletedTask.due_date,
        subtasks: deletedTask.subtasks?.map((subtask: any, index: number) => ({
          subtask_descr: subtask.subtask_descr,
          subtask_type: subtask.subtask_type || 'other',
          subtask_completed: subtask.subtask_completed || false,
          subtask_order: index,
          estimatedTimeMinutes: subtask.estimatedTimeMinutes
        })) || [{
          subtask_descr: 'Default Subtask',
          subtask_type: 'other',
          subtask_completed: false,
          subtask_order: 0
        }]
      };

      const res = await fetch(`${api}/api/goals/${deletedTask.goal_id}/create-task`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Failed to restore task: ${res.status}`);
      }

      // Refresh the goals data to show the restored task
      const fetchGoals = async () => {
        try {
          const token =
            typeof window !== "undefined" ? localStorage.getItem("token") : null;
          if (!token) return console.warn("No JWT in localStorage");

          const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
          const res = await fetch(`${api}/api/goals/user`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error(`Request failed ${res.status}`);
          
          const grouped = await res.json() as Record<string, Goal[]>;
          // Filter out placeholder tasks from each date group
          const filteredGrouped: Record<string, Goal[]> = {};
          Object.keys(grouped).forEach(key => {
            filteredGrouped[key] = grouped[key].filter(goal => goal.task_id !== 'placeholder');
          });
          setGoalsByDate(filteredGrouped);
          const ordered = Object.keys(filteredGrouped)
            .sort((a, b) => (a === 'unscheduled' ? 1 : b === 'unscheduled' ? -1 : new Date(a).getTime() - new Date(b).getTime()))
            .reduce((acc, k) => { acc[k] = filteredGrouped[k]; return acc; }, {} as Record<string, Goal[]>);
          setSortedGoalsByDate(ordered);
        } catch (err) { 
          console.error("fetchGoals error", err);
        }
      };

      await fetchGoals();
      
      setShowUndoToast(false);
      setDeletedTask(null);
      toast.success("Task restored successfully");
    } catch (err) {
      console.error("handleUndoDelete error", err);
      toast.error("Failed to restore task");
    }
  }

  const handleSubtaskDelete = async (subtask: Goal) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return alert("Please log in first.");

      // Store the deleted subtask for undo functionality
      setDeletedSubtask(subtask);
      setShowUndoSubtaskToast(true);

      // Store original state for potential rollback
      const originalSubtasksModal = subtasksModal;
      const originalGoalsByDate = goalsByDate;
      const originalSortedGoalsByDate = sortedGoalsByDate;

      // Greedy optimistic update - immediately remove the subtask from UI
      setSubtasksModal((prev) => {
        if (!prev) return prev;

        const updatedSubtasks = prev.task.subtasks?.filter((s: any) => s.subtask_id !== subtask.subtask_id) || [];
        const completedSubtasks = updatedSubtasks.filter((s: any) => s.subtask_completed).length;
        const totalSubtasks = updatedSubtasks.length;
        const newProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

        return {
          ...prev,
          task: {
            ...prev.task,
            subtasks: updatedSubtasks,
            completedSubtasks,
            totalSubtasks,
            progress: newProgress,
            task_completed: totalSubtasks > 0 && completedSubtasks === totalSubtasks
          }
        };
      });

      // Also optimistically update the main goals data
      setGoalsByDate((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach(dateKey => {
          updated[dateKey] = updated[dateKey].filter(goal => goal.subtask_id !== subtask.subtask_id);
        });
        return updated;
      });

      setSortedGoalsByDate((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach(dateKey => {
          updated[dateKey] = updated[dateKey].filter(goal => goal.subtask_id !== subtask.subtask_id);
        });
        return updated;
      });

      // Call the delete_subtask route
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const res = await fetch(`${api}/api/goals/tasks/subtasks/${subtask.subtask_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      if (!res.ok) {
        // If API call fails, revert the optimistic updates
        console.error("Subtask deletion failed, reverting changes");
        setSubtasksModal(originalSubtasksModal);
        setGoalsByDate(originalGoalsByDate);
        setSortedGoalsByDate(originalSortedGoalsByDate);
        setDeletedSubtask(null);
        setShowUndoSubtaskToast(false);
        throw new Error(`Failed to delete subtask: ${res.status}`);
      }

      // If successful, refresh the data to ensure consistency with server
      const fetchGoals = async () => {
        try {
          const token =
            typeof window !== "undefined" ? localStorage.getItem("token") : null;
          if (!token) return console.warn("No JWT in localStorage");

          const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
          const res = await fetch(`${api}/api/goals/user`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error(`Request failed ${res.status}`);
          
          const grouped = await res.json() as Record<string, Goal[]>;
          // Filter out placeholder tasks from each date group
          const filteredGrouped: Record<string, Goal[]> = {};
          Object.keys(grouped).forEach(key => {
            filteredGrouped[key] = grouped[key].filter(goal => goal.task_id !== 'placeholder');
          });
          setGoalsByDate(filteredGrouped);
          const ordered = Object.keys(filteredGrouped)
            .sort((a, b) => (a === 'unscheduled' ? 1 : b === 'unscheduled' ? -1 : new Date(a).getTime() - new Date(b).getTime()))
            .reduce((acc, k) => { acc[k] = filteredGrouped[k]; return acc; }, {} as Record<string, Goal[]>);
          setSortedGoalsByDate(ordered);
        } catch (err) { 
          console.error("fetchGoals error", err);
        }
      };

      // Refresh the goals data to ensure consistency
      await fetchGoals();
      
      // Auto-hide undo toast after 5 seconds
      setTimeout(() => {
        setShowUndoSubtaskToast(false);
        setDeletedSubtask(null);
      }, 5000);
      
      toast.success("Subtask deleted successfully");
    } catch (err) {
      console.error("handleSubtaskDelete error", err);
      toast.error("Failed to delete subtask");
    }
  }

  const handleUndoSubtaskDelete = async () => {
    if (!deletedSubtask) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) return alert("Please log in first.");

      // Recreate the subtask using the create_subtask endpoint
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const payload = {
        subtask_descr: deletedSubtask.subtask_descr,
        subtask_type: deletedSubtask.subtask_type || 'other',
        subtask_completed: deletedSubtask.subtask_completed || false,
        task_due_date: deletedSubtask.task_due_date || deletedSubtask.due_date
      };

      const res = await fetch(`${api}/api/goals/tasks/${deletedSubtask.task_id}/subtasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Failed to restore subtask: ${res.status}`);
      }

      // Refresh the goals data to show the restored subtask
      const fetchGoals = async () => {
        try {
          const token =
            typeof window !== "undefined" ? localStorage.getItem("token") : null;
          if (!token) return console.warn("No JWT in localStorage");

          const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
          const res = await fetch(`${api}/api/goals/user`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error(`Request failed ${res.status}`);
          
          const grouped = await res.json() as Record<string, Goal[]>;
          // Filter out placeholder tasks from each date group
          const filteredGrouped: Record<string, Goal[]> = {};
          Object.keys(grouped).forEach(key => {
            filteredGrouped[key] = grouped[key].filter(goal => goal.task_id !== 'placeholder');
          });
          setGoalsByDate(filteredGrouped);
          const ordered = Object.keys(filteredGrouped)
            .sort((a, b) => (a === 'unscheduled' ? 1 : b === 'unscheduled' ? -1 : new Date(a).getTime() - new Date(b).getTime()))
            .reduce((acc, k) => { acc[k] = filteredGrouped[k]; return acc; }, {} as Record<string, Goal[]>);
          setSortedGoalsByDate(ordered);
        } catch (err) { 
          console.error("fetchGoals error", err);
        }
      };

      await fetchGoals();
      
      setShowUndoSubtaskToast(false);
      setDeletedSubtask(null);
      toast.success("Subtask restored successfully");
    } catch (err) {
      console.error("handleUndoSubtaskDelete error", err);
      toast.error("Failed to restore subtask");
    }
  }

  // Global keyboard event listener for delete confirmation
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && hoveredTask && hoveredTask.goal_id !== "Google Calendar") {
        event.preventDefault();
        // Position modal in center of screen since we don't have mouse position from keyboard event
        setDeleteModal({
          isOpen: true,
          task: hoveredTask,
          position: { x: window.innerWidth / 2, y: window.innerHeight / 2 }
        });
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [hoveredTask]);

  const toggleCourseVisibility = (courseId: string) => {
    setCourseVisibility(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  }

  const handleTaskDelete = async (task: Goal) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return alert("Please log in first.");

      // Store the deleted task for undo functionality
      setDeletedTask(task);
      setShowUndoToast(true);

      // Store original state for potential rollback
      const originalSelectedGoal = selectedGoal;
      const originalGoalsByDate = goalsByDate;
      const originalSortedGoalsByDate = sortedGoalsByDate;

      // Greedy optimistic update - immediately remove the task from UI
      setSelectedGoal((prev) => {
        if (!prev || prev.task_id !== task.task_id) return prev;
        return null; // Close the task modal
      });

      // Remove all instances of this task from all date groups
      setGoalsByDate((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach(dateKey => {
          updated[dateKey] = updated[dateKey].filter(goal => goal.task_id !== task.task_id);
        });
        return updated;
      });

      setSortedGoalsByDate((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach(dateKey => {
          updated[dateKey] = updated[dateKey].filter(goal => goal.task_id !== task.task_id);
        });
        return updated;
      });

      // Call the delete_task route
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const res = await fetch(`${api}/api/goals/${task.goal_id}/tasks/${task.task_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      if (!res.ok) {
        // If API call fails, revert the optimistic updates
        console.error("Task deletion failed, reverting changes");
        setSelectedGoal(originalSelectedGoal);
        setGoalsByDate(originalGoalsByDate);
        setSortedGoalsByDate(originalSortedGoalsByDate);
        setDeletedTask(null);
        setShowUndoToast(false);
        throw new Error(`Failed to delete task: ${res.status}`);
      }

      // If successful, refresh the data to ensure consistency with server
      const fetchGoals = async () => {
        try {
          const token =
            typeof window !== "undefined" ? localStorage.getItem("token") : null;
          if (!token) return console.warn("No JWT in localStorage");

          const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
          const res = await fetch(`${api}/api/goals/user`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error(`Request failed ${res.status}`);
          
          const grouped = await res.json() as Record<string, Goal[]>;
          // Filter out placeholder tasks from each date group
          const filteredGrouped: Record<string, Goal[]> = {};
          Object.keys(grouped).forEach(key => {
            filteredGrouped[key] = grouped[key].filter(goal => goal.task_id !== 'placeholder');
          });
          setGoalsByDate(filteredGrouped);
          const ordered = Object.keys(filteredGrouped)
            .sort((a, b) => (a === 'unscheduled' ? 1 : b === 'unscheduled' ? -1 : new Date(a).getTime() - new Date(b).getTime()))
            .reduce((acc, k) => { acc[k] = filteredGrouped[k]; return acc; }, {} as Record<string, Goal[]>);
          setSortedGoalsByDate(ordered);
        } catch (err) { 
          console.error("fetchGoals error", err);
        }
      };

      // Refresh the goals data to ensure consistency
      await fetchGoals();
      
      // Auto-hide undo toast after 5 seconds
      setTimeout(() => {
        setShowUndoToast(false);
        setDeletedTask(null);
      }, 5000);
      
      toast.success("Task deleted successfully");
    } catch (err) {
      console.error("handleTaskDelete error", err);
      toast.error("Failed to delete task");
    }
  }

  const handleTaskDueDateChange = async (task: Goal, newDueDate: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return alert("Please log in first.")

      // Store original state for potential rollback
      const originalSelectedGoal = selectedGoal;
      const originalGoalsByDate = goalsByDate;
      const originalSortedGoalsByDate = sortedGoalsByDate;

      // Greedy optimistic update - immediately update the UI for all instances of this task
      setSelectedGoal((prev) => {
        if (!prev || prev.task_id !== task.task_id) return prev;
        return {
          ...prev,
          task_due_date: newDueDate
        };
      });

      // Update all instances of this task across all date groups
      setGoalsByDate((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach(dateKey => {
          updated[dateKey] = updated[dateKey].map(goal => 
            goal.task_id === task.task_id ? { ...goal, task_due_date: newDueDate } : goal
          );
        });
        return updated;
      });

      setSortedGoalsByDate((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach(dateKey => {
          updated[dateKey] = updated[dateKey].map(goal => 
            goal.task_id === task.task_id ? { ...goal, task_due_date: newDueDate } : goal
          );
        });
        return updated;
      });

      // Call the update_task route with the new due date
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const res = await fetch(`${api}/api/goals/tasks/${task.task_id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          task_due_date: newDueDate 
        }),
      });

      if (!res.ok) {
        // If API call fails, revert the optimistic updates
        console.error("Task due date change failed, reverting changes");
        setSelectedGoal(originalSelectedGoal);
        setGoalsByDate(originalGoalsByDate);
        setSortedGoalsByDate(originalSortedGoalsByDate);
        throw new Error(`Failed to update task due date: ${res.status}`);
      }

      // If successful, refresh the data to ensure consistency with server
      const fetchGoals = async () => {
        try {
          const token =
            typeof window !== "undefined" ? localStorage.getItem("token") : null;
          if (!token) return console.warn("No JWT in localStorage");

          const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
          const res = await fetch(`${api}/api/goals/user`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error(`Request failed ${res.status}`);
          
          const grouped = await res.json() as Record<string, Goal[]>;
          // Filter out placeholder tasks from each date group
          const filteredGrouped: Record<string, Goal[]> = {};
          Object.keys(grouped).forEach(key => {
            filteredGrouped[key] = grouped[key].filter(goal => goal.task_id !== 'placeholder');
          });
          setGoalsByDate(filteredGrouped);
          const ordered = Object.keys(filteredGrouped)
            .sort((a, b) => (a === 'unscheduled' ? 1 : b === 'unscheduled' ? -1 : new Date(a).getTime() - new Date(b).getTime()))
            .reduce((acc, k) => { acc[k] = filteredGrouped[k]; return acc; }, {} as Record<string, Goal[]>);
          setSortedGoalsByDate(ordered);
        } catch (err) { 
          console.error("fetchGoals error", err);
        }
      };

      // Refresh the goals data to ensure consistency
      await fetchGoals();
    } catch (err) {
      console.error("handleTaskDueDateChange error", err);
      toast.error("Failed to update task due date");
    }
  }

  const handleSubtaskToggle = async (sub: Goal) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return alert("Please log in first.");

      // Store the original state for potential rollback
      const originalSelectedGoal = selectedGoal;
      const originalGoalsByDate = goalsByDate;
      const originalSortedGoalsByDate = sortedGoalsByDate;

      // Optimistic update - immediately update the UI
      setSelectedGoal((prev) => {
        if (!prev) return null;

        // Update the specific subtask in the selected goal
        const updatedSubtasks = prev.subtasks?.map((subtask: any) =>
          subtask.subtask_id === sub.subtask_id ? { ...subtask, subtask_completed: !subtask.subtask_completed } : subtask
        ) || [];

        // Recalculate progress
        const completedSubtasks = updatedSubtasks.filter((s: any) => s.subtask_completed).length;
        const totalSubtasks = updatedSubtasks.length;
        const newProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

        // Calculate if task is completed (all subtasks completed)
        const taskCompleted = totalSubtasks > 0 && completedSubtasks === totalSubtasks;

        return {
          ...prev,
          subtasks: updatedSubtasks,
          completedSubtasks,
          totalSubtasks,
          progress: newProgress,
          task_completed: taskCompleted // Update task completion status
        };
      });

      // Also update the subtasks modal if it's open
      setSubtasksModal((prev) => {
        if (!prev) return prev;

        // Update the specific subtask in the modal
        const updatedSubtasks = prev.task.subtasks?.map((subtask: any) =>
          subtask.subtask_id === sub.subtask_id ? { ...subtask, subtask_completed: !subtask.subtask_completed } : subtask
        ) || [];

        // Recalculate progress for the modal
        const completedSubtasks = updatedSubtasks.filter((s: any) => s.subtask_completed).length;
        const totalSubtasks = updatedSubtasks.length;
        const newProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

        return {
          ...prev,
          task: {
            ...prev.task,
            subtasks: updatedSubtasks,
            completedSubtasks,
            totalSubtasks,
            progress: newProgress,
            task_completed: totalSubtasks > 0 && completedSubtasks === totalSubtasks
          }
        };
      });

      // Also optimistically update the main goals data
      setGoalsByDate((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach(dateKey => {
          updated[dateKey] = updated[dateKey].map(goal => {
            let updatedGoal = { ...goal };
            if (goal.subtask_id === sub.subtask_id) {
              updatedGoal = { ...updatedGoal, subtask_completed: !goal.subtask_completed };
            }
            if (goal.task_id === sub.task_id) {
              // Get all subtasks for this task to calculate completion
              const taskSubtasks = updated[dateKey].filter(g => g.task_id === sub.task_id);
              // Calculate completed subtasks, accounting for the current subtask being toggled
              const taskCompletedSubtasks = taskSubtasks.reduce((count, g) => {
                if (g.subtask_id === sub.subtask_id) {
                  return count + (!sub.subtask_completed ? 1 : 0);
                } else {
                  return count + (g.subtask_completed ? 1 : 0);
                }
              }, 0);
              const taskTotalSubtasks = taskSubtasks.length;
              const taskCompleted = taskTotalSubtasks > 0 && taskCompletedSubtasks === taskTotalSubtasks;
              updatedGoal = { ...updatedGoal, task_completed: taskCompleted };
            }
            return updatedGoal;
          });
        });
        return updated;
      });

      setSortedGoalsByDate((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach(dateKey => {
          updated[dateKey] = updated[dateKey].map(goal => {
            if (goal.subtask_id === sub.subtask_id) {
              return { ...goal, subtask_completed: !goal.subtask_completed };
            }
            // Also update task_completed for all rows with the same task_id
            if (goal.task_id === sub.task_id) {
              // Get all subtasks for this task to calculate completion
              const taskSubtasks = updated[dateKey].filter(g => g.task_id === sub.task_id);
              // Calculate completed subtasks, accounting for the current subtask being toggled
              const taskCompletedSubtasks = taskSubtasks.reduce((count, g) => {
                if (g.subtask_id === sub.subtask_id) {
                  // This is the subtask being toggled, use the new completion status
                  return count + (!sub.subtask_completed ? 1 : 0);
                } else {
                  // Use the current completion status
                  return count + (g.subtask_completed ? 1 : 0);
                }
              }, 0);
              const taskTotalSubtasks = taskSubtasks.length;
              const taskCompleted = taskTotalSubtasks > 0 && taskCompletedSubtasks === taskTotalSubtasks;
              return { ...goal, task_completed: taskCompleted };
            }
            return goal;
          });
        });
        return updated;
      });

      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const res = await fetch(`${api}/api/goals/tasks/subtasks/${sub.subtask_id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ subtask_completed: !sub.subtask_completed }),
      });

      if (!res.ok) {
        // If API call fails, revert the optimistic updates
        console.error("Subtask toggle failed, reverting changes");
        setSelectedGoal(originalSelectedGoal);
        setGoalsByDate(originalGoalsByDate);
        setSortedGoalsByDate(originalSortedGoalsByDate);

        throw new Error(`Request failed ${res.status}`);
      }

      // If successful, refresh the data to ensure consistency with server
      const fetchGoals = async () => {
        try {
          const token =
            typeof window !== "undefined" ? localStorage.getItem("token") : null;
          if (!token) return console.warn("No JWT in localStorage");

          const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
          const res = await fetch(`${api}/api/goals/user`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error(`Request failed ${res.status}`);

          // Use backend grouping directly
          const grouped = await res.json() as Record<string, Goal[]>;
          // Filter out placeholder tasks from each date group
          const filteredGrouped: Record<string, Goal[]> = {};
          Object.keys(grouped).forEach(key => {
            filteredGrouped[key] = grouped[key].filter(goal => goal.task_id !== 'placeholder');
          });
          setGoalsByDate(filteredGrouped);
          // Optionally, sort the keys for display order
          const ordered = Object.keys(filteredGrouped)
            .sort((a, b) => (a === 'unscheduled' ? 1 : b === 'unscheduled' ? -1 : new Date(a).getTime() - new Date(b).getTime()))
            .reduce((acc, k) => { acc[k] = filteredGrouped[k]; return acc; }, {} as Record<string, Goal[]>);
          setSortedGoalsByDate(ordered);

          // set courses by grouping goals by course_id - set colors immediately
          const all: Goal[] = ([] as Goal[]).concat(...Object.values(grouped));
          const courses: Course[] = [];
          const courseIds = [...new Set(all.map(g => g.course_id))]; // Get unique course IDs
          courseIds.forEach(courseId => {
            const courseGoals = all.filter(goal => goal.course_id === courseId);
            const firstGoal = courseGoals[0];
            const color = firstGoal?.google_calendar_color || colorForCourse(courseId, null);
            courses.push({
              goals: courseGoals,
              course_title: courseId,
              course_description: '',
              course_id: courseId,
              color: color
            });
          });
          setCourses(courses);
          updateCourseTitles(courseIds, token, courses).then(setCourses);
          console.log('Courses set with colors:', courses);

          // Initialize all courses as visible by default
          const initialVisibility: Record<string, boolean> = {};
          courseIds.forEach(courseId => {
            initialVisibility[courseId] = true;
          });
          setCourseVisibility(initialVisibility);
        } catch (err) {
          console.error("fetchGoals error", err);
        }
      };

      // Refresh the goals data
      fetchGoals();
    } catch (err) {
      console.error("handleSubtaskToggle error", err);
    }
  }

  const handleTaskToggle = async (task: Goal) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return alert("Please log in first.");

      // Store the original state for potential rollback
      const originalSelectedGoal = selectedGoal;
      const originalGoalsByDate = goalsByDate;
      const originalSortedGoalsByDate = sortedGoalsByDate;

      // Determine the new completion status based on current toggle state
      // If task is currently completed (task_completed is true), we want to mark it as incomplete
      // If task is currently incomplete, we want to mark it as complete
      const newTaskCompleted = !task.task_completed;

      // Optimistic update - immediately update the UI
      setSelectedGoal((prev) => {
        if (!prev || prev.task_id !== task.task_id) return prev;

        return {
          ...prev,
          task_completed: newTaskCompleted
        };
      });

      // Also optimistically update the main goals data
      setGoalsByDate((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach(dateKey => {
          updated[dateKey] = updated[dateKey].map(goal => {
            if (goal.task_id === task.task_id) {
              return { ...goal, task_completed: newTaskCompleted };
            }
            return goal;
          });
        });
        return updated;
      });

      setSortedGoalsByDate((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach(dateKey => {
          updated[dateKey] = updated[dateKey].map(goal => {
            if (goal.task_id === task.task_id) {
              return { ...goal, task_completed: newTaskCompleted };
            }
            return goal;
          });
        });
        return updated;
      });

      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const res = await fetch(`${api}/api/goals/tasks/${task.task_id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ task_completed: newTaskCompleted }),
      });

      if (!res.ok) {
        // If API call fails, revert the optimistic updates
        console.error("Task toggle failed, reverting changes");
        setSelectedGoal(originalSelectedGoal);
        setGoalsByDate(originalGoalsByDate);
        setSortedGoalsByDate(originalSortedGoalsByDate);

        throw new Error(`Request failed ${res.status}`);
      }

      // If successful, refresh the goals data to ensure consistency with server
      const fetchGoals = async () => {
        try {
          const goalsRes = await fetch(`${api}/api/goals/user`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!goalsRes.ok) throw new Error(`Request failed ${goalsRes.status}`);
          const grouped = await goalsRes.json() as Record<string, Goal[]>;
          // Filter out placeholder tasks from each date group
          const filteredGrouped: Record<string, Goal[]> = {};
          Object.keys(grouped).forEach(key => {
            filteredGrouped[key] = grouped[key].filter(goal => goal.task_id !== 'placeholder');
          });
          setGoalsByDate(filteredGrouped);
          const ordered = Object.keys(filteredGrouped)
            .sort((a, b) => (a === 'unscheduled' ? 1 : b === 'unscheduled' ? -1 : new Date(a).getTime() - new Date(b).getTime()))
            .reduce((acc, k) => { acc[k] = filteredGrouped[k]; return acc; }, {} as Record<string, Goal[]>);
          setSortedGoalsByDate(ordered);
          const all: Goal[] = ([] as Goal[]).concat(...Object.values(grouped));
          const courses: Course[] = [];
          const courseIds = [...new Set(all.map(g => g.course_id))];
          courseIds.forEach(courseId => {
            const courseGoals = all.filter(goal => goal.course_id === courseId);
            const firstGoal = courseGoals[0];
            const color = firstGoal?.google_calendar_color || colorForCourse(courseId, null);
            courses.push({
              goals: courseGoals,
              course_title: courseId,
              course_description: '',
              course_id: courseId,
              color: color
            });
          });
          setCourses(courses);
          updateCourseTitles(courseIds, token, courses).then(setCourses);
        } catch (err) {
          console.error("fetchGoals error", err);
        }
      };
      fetchGoals();

    } catch (err) {
      console.error("handleTaskToggle error", err);
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    const rect = e.currentTarget.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return

    const newX = e.clientX - dragOffset.x
    const newY = e.clientY - dragOffset.y

    if (selectedGoal && goalDisplayPosition) {
      setGoalDisplayPosition({ x: newX + 320, y: newY + 200 })
    }

    if (overflowEvents) {
      setOverflowEvents(prev => prev ? {
        ...prev,
        position: { x: newX, y: newY + 300 }
      } : null)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleConnectCalendar = () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (!token) return alert("Please log in first.");

    const apiBase = process.env.BACKEND_URL;
    window.location.href = `${apiBase}/api/calendar/auth?token=${token}`;
  };

  // Fetch user courses for add task modal
  const fetchUserCourses = async () => {
    try {
      setIsLoadingCourses(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/courses/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch courses');

      const coursesData = await response.json();
      setUserCourses(coursesData);
    } catch (error) {
      console.error('Error fetching user courses:', error);
    } finally {
      setIsLoadingCourses(false);
    }
  };

  // Fetch goals for selected course
  const fetchCourseGoals = async (courseId: string) => {
    try {
      setIsLoadingGoals(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/courses/${courseId}/goals`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch goals');

      const goalsData = await response.json();
      setCourseGoals(goalsData);
    } catch (error) {
      console.error('Error fetching course goals:', error);
    } finally {
      setIsLoadingGoals(false);
    }
  };

  // Handle course selection
  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedGoalId(''); // Reset goal selection when course changes
    setCourseGoals([]); // Clear previous goals

    if (courseId) {
      fetchCourseGoals(courseId);
    }
  };

  // Reset add task form
  const resetAddTaskForm = () => {
    setSelectedCourseId('');
    setSelectedGoalId('');
    setCourseGoals([]);
    setUserCourses([]);
  };

  // Handle modal close
  const handleCloseAddTaskModal = () => {
    setShowAddTask(false);
    resetAddTaskForm();
  };

  // Add the submit handler function inside CalendarScheduler
  const handleCreateTask = async () => {
    if (!selectedGoalId || !newTaskName || !newTaskDueDate) {
      alert('Please fill in all required fields.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const payload = {
        task_title: newTaskName,
        task_descr: newTaskDescription,
        task_due_date: newTaskDueDate,
        subtasks: newSubtasks.map((sub: { subtask_descr: string; subtask_type: string; estimatedTimeMinutes: number }, index: number) => ({
          subtask_descr: sub.subtask_descr,
          subtask_type: sub.subtask_type,
          subtask_completed: false,
          subtask_order: index,
          estimatedTimeMinutes: sub.estimatedTimeMinutes
        }))
      };
      const res = await fetch(`${api}/api/goals/${selectedGoalId}/create-task`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`Failed to create task: ${res.status}`);
      alert('Task created successfully!');

      // Refresh goals data to show the newly created task
      const fetchGoals = async () => {
        try {
          const goalsRes = await fetch(`${api}/api/goals/user`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!goalsRes.ok) throw new Error(`Request failed ${goalsRes.status}`);
          const grouped = await goalsRes.json() as Record<string, Goal[]>;
          // Filter out placeholder tasks from each date group
          const filteredGrouped: Record<string, Goal[]> = {};
          Object.keys(grouped).forEach(key => {
            filteredGrouped[key] = grouped[key].filter(goal => goal.task_id !== 'placeholder');
          });
          setGoalsByDate(filteredGrouped);
          const ordered = Object.keys(filteredGrouped)
            .sort((a, b) => (a === 'unscheduled' ? 1 : b === 'unscheduled' ? -1 : new Date(a).getTime() - new Date(b).getTime()))
            .reduce((acc, k) => { acc[k] = filteredGrouped[k]; return acc; }, {} as Record<string, Goal[]>);
          setSortedGoalsByDate(ordered);
          const all: Goal[] = ([] as Goal[]).concat(...Object.values(grouped));
          const courses: Course[] = [];
          const courseIds = [...new Set(all.map(g => g.course_id))];
          courseIds.forEach(courseId => {
            const courseGoals = all.filter(goal => goal.course_id === courseId);
            const firstGoal = courseGoals[0];
            const color = firstGoal?.google_calendar_color || colorForCourse(courseId, null);
            courses.push({
              goals: courseGoals,
              course_title: courseId,
              course_description: '',
              course_id: courseId,
              color: color
            });
          });
          setCourses(courses);
          updateCourseTitles(courseIds, token, courses).then(setCourses);
        } catch (err) {
          console.error("fetchGoals error", err);
        }
      };

      // Refresh the goals data
      fetchGoals();

      // Close modal and reset form fields
      handleCloseAddTaskModal();
      setNewTaskName('');
      setNewTaskDueDate('');
      setNewTaskDescription('');
      setNewSubtasks([]);
    } catch (err: any) {
      alert('Error creating task: ' + err.message);
    }
  };

  // one ref for both Day + Week
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledToCurrentHour = useRef(false);

  /** Scroll-to-current-hour the moment the timeline element is in the DOM */
  const setTimelineRef = (node: HTMLDivElement | null) => {
    if (!node) return;            // ref is being cleared
    scrollRef.current = node;

    // Only scroll to current hour on initial load, not when clicking events
    if (!hasScrolledToCurrentHour.current) {
      // compute where "now" should sit
      const hour = new Date().getHours();
      const rowHeight = currentView === "day" ? 80 : 64;      // h-20 vs h-16
      node.scrollTop = Math.max(0, hour * rowHeight - 2 * rowHeight);
      hasScrolledToCurrentHour.current = true;
    }
  };

  const [sortedGoalsByDate, setSortedGoalsByDate] = useState<GoalsByDate>({});

  // Helper function to get course color from courses array
  const getCourseColor = (courseId: string): string => {
    const course = courses.find(c => c.course_id === courseId);
    return course?.color || "#6b7280"; // fallback to gray
  };

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token) return console.warn("No JWT in localStorage");

        const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
        const res = await fetch(`${api}/api/goals/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Request failed ${res.status}`);

        // Use backend grouping directly
        const grouped = await res.json() as Record<string, Goal[]>;
        // Filter out placeholder tasks from each date group
        const filteredGrouped: Record<string, Goal[]> = {};
        Object.keys(grouped).forEach(key => {
          filteredGrouped[key] = grouped[key].filter(goal => goal.task_id !== 'placeholder');
        });

        // Reprocess the data to group calendar events by their start_time instead of goal date
        const reprocessedGrouped: Record<string, Goal[]> = {};
        
        Object.values(filteredGrouped).flat().forEach(goal => {
          let key: string;
          
          // For calendar events, use start_time for grouping
          if (goal.start_time && goal.end_time) {
            key = getLocalDateKey(new Date(goal.start_time));
          } 
          // For non-calendar tasks, use task_due_date if available, otherwise fall back to due_date
          else if (goal.task_due_date) {
            key = getDateKeyFromDateString(goal.task_due_date);
          } else if (goal.due_date) {
            key = getDateKeyFromDateString(goal.due_date);
          } else {
            // Fallback to current date if no date is available
            key = getLocalDateKey(new Date());
          }
          
          if (!reprocessedGrouped[key]) {
            reprocessedGrouped[key] = [];
          }
          reprocessedGrouped[key].push(goal);
        });

        setGoalsByDate(reprocessedGrouped);
        // Optionally, sort the keys for display order
        const ordered = Object.keys(reprocessedGrouped)
          .sort((a, b) => (a === 'unscheduled' ? 1 : b === 'unscheduled' ? -1 : new Date(a).getTime() - new Date(b).getTime()))
          .reduce((acc, k) => { acc[k] = reprocessedGrouped[k]; return acc; }, {} as Record<string, Goal[]>);
        setSortedGoalsByDate(ordered);

        // set courses by grouping goals by course_id - set colors immediately
        const all: Goal[] = ([] as Goal[]).concat(...Object.values(grouped));
        const courses: Course[] = [];
        const courseIds = [...new Set(all.map(g => g.course_id))]; // Get unique course IDs
        courseIds.forEach(courseId => {
          const courseGoals = all.filter(goal => goal.course_id === courseId);
          const firstGoal = courseGoals[0];
          const color = firstGoal?.google_calendar_color || colorForCourse(courseId, null);
          courses.push({
            goals: courseGoals,
            course_title: courseId,
            course_description: '',
            course_id: courseId,
            color: color
          });
        });
        setCourses(courses);
        updateCourseTitles(courseIds, token, courses).then(setCourses);
        console.log('Courses set with colors:', courses);

        // Initialize all courses as visible by default
        const initialVisibility: Record<string, boolean> = {};
        courseIds.forEach(courseId => {
          initialVisibility[courseId] = true;
        });
        setCourseVisibility(initialVisibility);
      } catch (err) {
        console.error("fetchGoals error", err);
      }
    };
    fetchGoals();
  }, []);

  // Handle clicking outside to close floating goal display and subtasks modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectedGoal && goalDisplayPosition) {
        const target = event.target as Element;
        if (!target.closest('.floating-goal-display')) {
          setSelectedGoal(null);
          setGoalDisplayPosition(null);
          setExpandedTaskId(null);
        }
      }

      if (overflowEvents) {
        const target = event.target as Element;
        if (!target.closest('.floating-goal-display')) {
          setOverflowEvents(null);
        }
      }

      if (subtasksModal) {
        const target = event.target as Element;
        if (!target.closest('.subtasks-modal')) {
          closeSubtasksModal();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedGoal, goalDisplayPosition, overflowEvents, subtasksModal]);

  // Handle mouse events for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset, selectedGoal, goalDisplayPosition, overflowEvents]);

  // Handle mouse events for subtasks modal dragging
  useEffect(() => {
    if (isSubtasksModalDragging) {
      document.addEventListener('mousemove', handleSubtasksModalMouseMove);
      document.addEventListener('mouseup', handleSubtasksModalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleSubtasksModalMouseMove);
        document.removeEventListener('mouseup', handleSubtasksModalMouseUp);
      };
    }
  }, [isSubtasksModalDragging, subtasksModalDragOffset, subtasksModal]);

  // Handle window resize to reposition modals
  useEffect(() => {
    const handleResize = () => {
      if (overflowEvents) {
        // Reposition overflow modal to ensure it's still visible
        const modalWidth = Math.min(320, window.innerWidth - 40);
        const modalHeight = Math.min(400, window.innerHeight - 40);
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let newLeft = overflowEvents.position.x;
        let newTop = overflowEvents.position.y - 300;

        // Adjust horizontal position
        if (newLeft + modalWidth > viewportWidth - 20) {
          newLeft = Math.max(10, viewportWidth - modalWidth - 20);
        }
        if (newLeft < 10) {
          newLeft = 10;
        }

        // Adjust vertical position
        if (newTop < 10) {
          newTop = Math.min(viewportHeight - modalHeight - 10, overflowEvents.position.y + 10);
        }
        if (newTop + modalHeight > viewportHeight - 10) {
          newTop = Math.max(10, overflowEvents.position.y - modalHeight - 10);
        }

        setOverflowEvents(prev => prev ? {
          ...prev,
          position: { x: newLeft, y: newTop + 300 } // Convert back to original format
        } : null);
      }

      if (selectedGoal && goalDisplayPosition) {
        // Reposition goal display modal
        const modalWidth = Math.min(320, window.innerWidth - 40);
        const modalHeight = Math.min(400, window.innerHeight - 40);
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let newX = goalDisplayPosition.x - 320;
        let newY = goalDisplayPosition.y - 200;

        // Adjust horizontal position
        if (newX + modalWidth > viewportWidth - 20) {
          newX = Math.max(10, viewportWidth - modalWidth - 20);
        }
        if (newX < 10) {
          newX = 10;
        }

        // Adjust vertical position
        if (newY < 10) {
          newY = 10;
        }
        if (newY + modalHeight > viewportHeight - 10) {
          newY = Math.max(10, viewportHeight - modalHeight - 10);
        }

        setGoalDisplayPosition({ x: newX + 320, y: newY + 200 });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [overflowEvents, selectedGoal, goalDisplayPosition]);

  console.log(sortedGoalsByDate)
  // Filter goals based on course visibility
  useEffect(() => {
    const allGoals = Object.values(goalsByDate).flat();
    const filtered = allGoals.filter(goal => courseVisibility[goal.course_id] !== false);
    setFilteredGoals(filtered);
  }, [goalsByDate, courseVisibility]);

  /** Return the list of goals whose due-date === that calendar day */
  const getGoalsForDate = (date: Date): Goal[] => {
    const key = getLocalDateKey(date);
    const dateGoals = goalsByDate[key] ?? [];
    // Filter goals based on course visibility
    return dateGoals.filter(goal => courseVisibility[goal.course_id] !== false);
  };

  // Helper functions to categorize tasks
  const categorizeTasks = () => {
    const today = startOfToday();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Sunday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Saturday

    const overdue: { [date: string]: Goal[] } = {};
    const upcoming: { [date: string]: Goal[] } = {};
    const future: { [date: string]: Goal[] } = {};
    const completed: { [date: string]: Goal[] } = {};

    // Group filtered goals by date, excluding Google Calendar events
    const filteredGoalsByDate: GoalsByDate = {};
    filteredGoals
      .filter(goal => goal.goal_id !== "Google Calendar") // Exclude Google Calendar events
      .forEach(goal => {
        let key: string;
        
        // For calendar events, use the existing logic
        if (goal.start_time && goal.end_time) {
          key = getLocalDateKey(new Date(goal.start_time));
        } 
        // For non-calendar tasks, use task_due_date if available, otherwise fall back to due_date
        else if (goal.task_due_date) {
          key = getDateKeyFromDateString(goal.task_due_date);
        } else if (goal.due_date) {
          key = getDateKeyFromDateString(goal.due_date);
        } else {
          // Fallback to current date if no date is available
          key = getLocalDateKey(new Date());
        }
        (filteredGoalsByDate[key] ??= []).push(goal);
      });

    Object.entries(filteredGoalsByDate).forEach(([date, goals]) => {
      const taskDate = new Date(date + 'T00:00:00');

      // Separate completed tasks
      const completedGoals = goals.filter(goal => goal.task_completed);
      const incompleteGoals = goals.filter(goal => !goal.task_completed);

      if (completedGoals.length > 0) {
        completed[date] = completedGoals;
      }

      if (incompleteGoals.length > 0) {
        if (taskDate < today) {
          overdue[date] = incompleteGoals;
        } else if (taskDate >= today && taskDate <= weekEnd) {
          upcoming[date] = incompleteGoals;
        } else {
          future[date] = incompleteGoals;
        }
      }
    });

    return { overdue, upcoming, future, completed };
  };

  const renderTaskSection = (title: string, tasks: { [date: string]: Goal[] }, sectionKey: string, color: string) => {
    const taskEntries = Object.entries(tasks);
    if (taskEntries.length === 0) return null;

    const totalTasks = taskEntries.reduce((sum, [_, goals]) => {
      const groupedTasks = groupTasksByTaskId(goals);
      return sum + Object.keys(groupedTasks).length;
    }, 0);

    const isExpanded = expandedSections[sectionKey] || false;
    const isCompletedSection = sectionKey === 'completed';

    return (
      <div key={sectionKey} className="border border-[#e5e8eb] rounded-lg">
        <div
          className="p-4 cursor-pointer hover:bg-[#f8f9fa] transition-colors"
          onClick={() => toggleSectionExpansion(sectionKey)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div>
                <div className="font-medium text-[#18181b]">{title}</div>
                <div className="text-sm text-[#71717a]">
                  {totalTasks} task{totalTasks !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {isExpanded && (
          <div className="px-4 pt-4 pb-4 space-y-3 border-t border-[#e5e8eb]">
            {taskEntries
              .sort(([dateA], [dateB]) => {
                // Sort by date (ascending)
                const dateAObj = new Date(dateA + 'T00:00:00');
                const dateBObj = new Date(dateB + 'T00:00:00');
                return dateAObj.getTime() - dateBObj.getTime();
              })
              .map(([date, goals]) => {
              const groupedTasks = groupTasksByTaskId(goals);
              const taskDate = new Date(date + 'T00:00:00');
              const isPastDue = taskDate < startOfToday() && taskDate.toDateString() !== startOfToday().toDateString();

              return (
                <div key={date} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className={`text-sm font-medium ${isPastDue && !isCompletedSection ? 'text-red-600' : 'text-[#18181b]'}`}>
                      {taskDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </div>
                    <div className={`text-xs ${isPastDue && !isCompletedSection ? 'text-red-500' : 'text-[#71717a]'}`}>
                      {Object.keys(groupedTasks).length} task{Object.keys(groupedTasks).length !== 1 ? "s" : ""}
                    </div>
                  </div>

                  <div className="space-y-2 ml-2">
                    {Object.values(groupedTasks).map((group, index) => {
                      const taskId = `${group.subtasks[0].task_id}-${date}`;
                      const isSubtaskExpanded = expandedSidebarSubtasks[taskId];
                      
                      return (
                        <div
                          key={index}
                          className={`flex items-start gap-3 p-3 rounded-lg hover:bg-[#f0f0f0] ${isCompletedSection ? 'bg-[#f8f9fa] opacity-75' : 'bg-[#f8f9fa]'
                            }`}
                        >
                          <div
                            className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                            style={{ backgroundColor: getCourseColor(group.courseId) }}
                          />
                          <div className="flex-1 min-w-0">
                            <div
                              className="cursor-pointer"
                              onClick={(e) => {
                                const representativeGoal = {
                                  ...group.subtasks[0],
                                  task_title: group.taskTitle,
                                  task_descr: group.taskDescr,
                                  start_time: group.startTime,
                                  end_time: group.endTime,
                                  course_id: group.courseId,
                                  google_calendar_color: group.googleCalendarColor,
                                  progress: group.progress,
                                  totalSubtasks: group.totalSubtasks,
                                  completedSubtasks: group.completedSubtasks,
                                  subtasks: group.subtasks,
                                  status: calculateStatus(group.subtasks[0])
                                };
                                handleGoalClick(representativeGoal, e);
                              }}
                            >
                              <div className={`text-sm font-medium truncate ${isCompletedSection ? 'text-[#71717a] line-through' : 'text-[#18181b]'
                                }`}>
                                {group.taskTitle || "(untitled)"}
                              </div>
                              {group.taskDescr && (
                                <div className={`text-xs truncate mt-1 ${isCompletedSection ? 'text-[#a1a1aa] line-through' : 'text-[#71717a]'
                                  }`}>
                                  {group.taskDescr}
                                </div>
                              )}
                            </div>
                            
                            {/* View Subtasks Button */}
                            {group.totalSubtasks && group.totalSubtasks >= 1 && (
                              <div className="mt-2">
                                <button
                                  onClick={(e) => {
                                    const representativeGoal = {
                                      ...group.subtasks[0],
                                      task_title: group.taskTitle,
                                      task_descr: group.taskDescr,
                                      start_time: group.startTime,
                                      end_time: group.endTime,
                                      course_id: group.courseId,
                                      google_calendar_color: group.googleCalendarColor,
                                      progress: group.progress,
                                      totalSubtasks: group.totalSubtasks,
                                      completedSubtasks: group.completedSubtasks,
                                      subtasks: group.subtasks,
                                      status: calculateStatus(group.subtasks[0])
                                    };
                                    openSubtasksModal(representativeGoal, e);
                                  }}
                                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors hover:underline"
                                >
                                  <Eye className="w-3 h-3" />
                                  View Subtasks ({group.completedSubtasks}/{group.totalSubtasks})
                                </button>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const representativeGoal = {
                                ...group.subtasks[0],
                                task_title: group.taskTitle,
                                task_descr: group.taskDescr,
                                start_time: group.startTime,
                                end_time: group.endTime,
                                course_id: group.courseId,
                                google_calendar_color: group.googleCalendarColor,
                                progress: group.progress,
                                totalSubtasks: group.totalSubtasks,
                                completedSubtasks: group.completedSubtasks,
                                subtasks: group.subtasks,
                                status: calculateStatus(group.subtasks[0])
                              };
                              handleTaskToggle(representativeGoal);
                            }}
                            className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${group.subtasks[0].task_completed
                                ? 'bg-green-500 border-green-500'
                                : 'bg-white border-gray-300 hover:border-green-400'
                              }`}
                            title={group.subtasks[0].task_completed ? "Mark as incomplete" : "Mark as complete"}
                          >
                            {group.subtasks[0].task_completed && (
                              <svg className="w-3 h-3 text-white mx-auto" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const loading = useAuthRedirect()
  if (loading) return <div>Loading...</div>

  /**************************************
   * Render starts here                *
   **************************************/
  return (
    <div className="flex h-screen bg-[#ffffff]">
      {/* Main Calendar - Made Smaller */}
      {/* ───────────────── Main Section ───────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden"> {/* Removed pt-20 */}
        <div className="flex items-center gap-4 px-6 pt-4 pb-2"> {/* Added px-6 pt-4 pb-2 for spacing */}
          <Button
            variant={currentView === "day" ? "default" : "ghost"}
            size="sm"
            className={currentView === "day" ? "bg-[#0a80ed] text-white" : "text-[#71717a]"}
            onClick={() => setCurrentView("day")}
          >
            Day
          </Button>
          <Button
            variant={currentView === "week" ? "default" : "ghost"}
            size="sm"
            className={currentView === "week" ? "bg-[#0a80ed] text-white" : "text-[#71717a]"}
            onClick={() => setCurrentView("week")}
          >
            Week
          </Button>
          <Button
            variant={currentView === "month" ? "default" : "ghost"}
            size="sm"
            className={currentView === "month" ? "bg-[#0a80ed] text-white" : "text-[#71717a]"}
            onClick={() => setCurrentView("month")}
          >
            Month
          </Button>
          <Button
            variant={currentView === "year" ? "default" : "ghost"}
            size="sm"
            className={currentView === "year" ? "bg-[#0a80ed] text-white" : "text-[#71717a]"}
            onClick={() => setCurrentView("year")}
          >
            Year
          </Button>
        </div>
        {/* ───────── DAY VIEW ───────── */}
        {currentView === "day" ? (
          <DayView
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            hours={hours}
            getGoalsForDate={getGoalsForDate}
            handleGoalClick={handleGoalClick}
            setTimelineRef={setTimelineRef}
            formatHourLabel={formatHourLabel}
            handleOverflowClick={handleOverflowClick}
            getCourseColor={getCourseColor}
            handleTaskDragStart={handleTaskDragStart}
            handleTaskDragEnd={handleTaskDragEnd}
            handleDayDragOver={handleDayDragOver}
            handleDayDragLeave={handleDayDragLeave}
            handleDayDrop={handleDayDrop}
            isDraggingTask={isDraggingTask}
            dragOverDate={dragOverDate}
            onDayClick={handleDayClick}
            onTaskHover={handleTaskHover}
            onTaskMouseLeave={handleTaskMouseLeave}
          />
        ) : currentView === "week" ? (
          <WeekView
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            weekDates={weekDates}
            hours={hours}
            getGoalsForDate={getGoalsForDate}
            handleGoalClick={handleGoalClick}
            setTimelineRef={setTimelineRef}
            formatHourLabel={formatHourLabel}
            handleOverflowClick={handleOverflowClick}
            getCourseColor={getCourseColor}
            handleTaskDragStart={handleTaskDragStart}
            handleTaskDragEnd={handleTaskDragEnd}
            handleDayDragOver={handleDayDragOver}
            handleDayDragLeave={handleDayDragLeave}
            handleDayDrop={handleDayDrop}
            isDraggingTask={isDraggingTask}
            dragOverDate={dragOverDate}
            onDayClick={handleDayClick}
            onTaskHover={handleTaskHover}
            onTaskMouseLeave={handleTaskMouseLeave}
          />
        ) : currentView === "month" ? (
          <MonthView
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            getGoalsForDate={getGoalsForDate}
            handleGoalClick={handleGoalClick}
            handleOverflowClick={handleOverflowClick}
            getCourseColor={getCourseColor}
            handleTaskDragStart={handleTaskDragStart}
            handleTaskDragEnd={handleTaskDragEnd}
            handleDayDragOver={handleDayDragOver}
            handleDayDragLeave={handleDayDragLeave}
            handleDayDrop={handleDayDrop}
            isDraggingTask={isDraggingTask}
            dragOverDate={dragOverDate}
            onDayClick={handleDayClick}
            onTaskHover={handleTaskHover}
            onTaskMouseLeave={handleTaskMouseLeave}
          />
        ) : (
          <YearView
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
          />
        )}
      </div>

      {/* Right Sidebar */}
      <div className="w-80 bg-[#ffffff] border-l border-[#e5e8eb] p-6 pt-0 overflow-y-auto flex flex-col"> {/* pt-0, flex-col for vertical alignment */}
        {/* Add Task Button */}
        <div className="mb-6 mt-0 px-6 pt-4"> {/* Match header padding */}
          <Button
            onClick={() => setShowAddTask(true)}
            className="w-full bg-[#0a80ed] hover:bg-[#0369a1] text-white font-medium py-3"
            style={{ marginTop: 0 }}
          >
            + Add Task
          </Button>
        </div>
        {/* Dropdown Toggle */}
        <div className="mb-6">
          <Select value={sidebarTab} onValueChange={(val) => setSidebarTab(val as "courses" | "tasks")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a tab" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tasks">My Tasks</SelectItem>
              <SelectItem value="courses">My Courses</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {sidebarTab === "tasks" ? (
          <>
            {/* Categorized Tasks */}
            <div className="space-y-4">
              {(() => {
                const { overdue, upcoming, future, completed } = categorizeTasks();
                return (
                  <>
                    {renderTaskSection("Overdue", overdue, "overdue", "#ef4444")}
                    {renderTaskSection("This Week", upcoming, "upcoming", "#10b981")}
                    {renderTaskSection("Future", future, "future", "#3b82f6")}
                    {renderTaskSection("Completed", completed, "completed", "#0a80ed")}
                  </>
                );
              })()}
            </div>
          </>
        ) : (
          <>
            {sidebarTab === "courses" && (
              <>
                {/* List All Courses in the sidebar */}
                <div className="space-y-4">
                  {courses.map((course) => {
                    const courseEventCount = filteredGoals.filter(goal => goal.course_id === course.course_id).length;
                    const isVisible = courseVisibility[course.course_id] !== false;

                    return (
                      <div key={course.course_id} className="flex items-center justify-between p-3 rounded-lg bg-[#f8f9fa] hover:bg-[#f0f0f0] transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: course.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[#18181b] truncate">
                              {course.course_title === course.course_id ? (
                                <span className="text-gray-400">Loading...</span>
                              ) : (
                                course.course_title
                              )}
                            </div>
                            <div className="text-xs text-[#71717a] mt-1">
                              {courseEventCount} event{courseEventCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={isVisible}
                            onCheckedChange={() => toggleCourseVisibility(course.course_id)}
                            className="ml-2"
                          />
                          <Eye className={`w-4 h-4 ${isVisible ? 'text-blue-600' : 'text-gray-400'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>



      {/* Floating Goal Display */}
      {selectedGoal && goalDisplayPosition && (
        <div
          className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg floating-goal-display"
          style={{
            left: Math.max(10, goalDisplayPosition.x - 200),
            top: Math.max(10, goalDisplayPosition.y - 100),
            width: '400px',
            maxHeight: '500px',
            minWidth: '320px',
            minHeight: '200px',
          }}
        >
          <Card className="border-0 shadow-none h-full">
            <CardHeader className="pb-3">
              <div
                className="flex items-center justify-between cursor-move"
                onMouseDown={(e) => handleMouseDown(e)}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <CardTitle className="text-lg truncate">
                    {selectedGoal.goal_id !== "Google Calendar" ? "Edit Task" : "Google Calendar Event"}
                  </CardTitle>
                  {selectedGoal.goal_id !== "Google Calendar" && (
                    <button
                      onClick={() => {
                        const url = `http://localhost:3001/courses/${selectedGoal.course_id}/goals/${selectedGoal.goal_id}`;
                        window.open(url, '_blank');
                      }}
                      className="text-blue-500 hover:text-blue-700 transition-colors flex-shrink-0 p-1 hover:bg-blue-50 rounded"
                      title="Open in full view"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedGoal(null)
                      setGoalDisplayPosition(null)
                      setExpandedTaskId(null)
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 p-1 hover:bg-gray-100 rounded"
                    style={{ cursor: 'pointer' }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto" style={{
              maxHeight: `${Math.min(280, window.innerHeight - 160)}px` // Responsive max height for overflow modal
            }}>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: getCourseColor(selectedGoal.course_id) }}></div>
                  <h3 className="font-semibold text-[#18181b] truncate">{selectedGoal.task_title}</h3>
                </div>

                {selectedGoal.goal_id === "Google Calendar" ? (
                  // Google Calendar Event Display
                  <div className="space-y-3">
                    {selectedGoal.subtask_descr && (
                      <div>
                        <span className="text-[#71717a] text-sm">Description:</span>
                        <p className="mt-1 text-sm text-[#18181b] break-words">{selectedGoal.subtask_descr}</p>
                      </div>
                    )}
                    {selectedGoal.goal_descr && (
                      <div>
                        <span className="text-[#71717a] text-sm">Calendar:</span>
                        <p className="mt-1 text-sm text-[#18181b] truncate">{selectedGoal.goal_descr}</p>
                      </div>
                    )}
                    {selectedGoal.start_time && selectedGoal.end_time && (
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-[#71717a]">Start:</span>
                          <span className="ml-2 font-medium break-words">
                            {new Date(selectedGoal.start_time).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#71717a]">End:</span>
                          <span className="ml-2 font-medium break-words">
                            {new Date(selectedGoal.end_time).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // Simplified Regular Task Display
                  <div className="space-y-3">
                    <div className="mb-2">
                      {selectedGoal.task_descr && (
                        <div className="text-sm text-gray-700 mb-1">{selectedGoal.task_descr}</div>
                      )}
                    </div>
                    <ul className="text-sm text-gray-800 space-y-1">
                      <li><strong>Status:</strong> <span className={`font-medium ${getStatusColor(calculateStatus(selectedGoal))}`}>{calculateStatus(selectedGoal)}</span></li>
                      <li><strong>Assigned:</strong> {formatDate(selectedGoal.updated_at || '')}</li>
                      <li><strong>Due:</strong> {formatDate(selectedGoal.task_due_date || selectedGoal.due_date || '')}</li>
                                          {/* Progress Bar */}
                    {selectedGoal.totalSubtasks && selectedGoal.totalSubtasks >= 1 && (
                      <li><strong>Progress:</strong> {selectedGoal.completedSubtasks}/{selectedGoal.totalSubtasks} subtasks ({selectedGoal.progress || 0}%)</li>
                    )}
                  </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overflow Events Modal */}
      {overflowEvents && (
        <div
          className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg floating-goal-display"
          style={{
            left: (() => {
              const modalWidth = Math.min(320, window.innerWidth - 40); // Responsive width
              const viewportWidth = window.innerWidth;
              const requestedLeft = overflowEvents.position.x;

              // Ensure modal doesn't go off the right edge
              if (requestedLeft + modalWidth > viewportWidth - 20) {
                return Math.max(10, viewportWidth - modalWidth - 20);
              }

              // Ensure modal doesn't go off the left edge
              return Math.max(10, requestedLeft);
            })(),
            top: (() => {
              const modalHeight = Math.min(400, window.innerHeight - 40); // Responsive height
              const viewportHeight = window.innerHeight;
              const requestedTop = overflowEvents.position.y - 300;

              // If modal would go off the top, position it below the click point
              if (requestedTop < 10) {
                return Math.min(viewportHeight - modalHeight - 10, overflowEvents.position.y + 10);
              }

              // If modal would go off the bottom, position it above the click point
              if (requestedTop + modalHeight > viewportHeight - 10) {
                return Math.max(10, overflowEvents.position.y - modalHeight - 10);
              }

              return requestedTop;
            })(),
            width: `${Math.min(320, window.innerWidth - 40)}px`,
            maxHeight: `${Math.min(400, window.innerHeight - 40)}px`,
            minWidth: '280px', // Ensure minimum readable width
            minHeight: '200px', // Ensure minimum readable height
          }}
        >
          <Card className="border-0 shadow-none h-full">
            <CardHeader className="pb-3">
              <div
                className="flex items-center justify-between cursor-move"
                onMouseDown={(e) => handleMouseDown(e)}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <CardTitle className="text-lg truncate">
                    Additional Tasks
                  </CardTitle>
                </div>
                <button
                  onClick={() => setOverflowEvents(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-2 p-1 hover:bg-gray-100 rounded"
                  style={{ cursor: 'pointer' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto" style={{ maxHeight: '320px' }}>
              <div className="space-y-2">
                {overflowEvents.events.map((event, index) => (
                  <div
                    key={`${event.goal_id}-${event.task_id}-${event.subtask_id}-${index}`}
                    className={`flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-grab active:cursor-grabbing transition-colors ${
                      isDraggingTask ? 'opacity-50' : ''
                    }`}
                    tabIndex={0}
                    onClick={(e) => {
                      // Prevent click if we're dragging
                      if (!isDraggingTask) {
                        handleGoalClick(event, e)
                        setOverflowEvents(null)
                      }
                    }}
                    onMouseEnter={(e) => handleTaskHover(event, e)}
                    onMouseLeave={handleTaskMouseLeave}
                    draggable={event.goal_id !== "Google Calendar"}
                    onDragStart={(e) => handleTaskDragStart(e, event)}
                    onDragEnd={(e) => handleTaskDragEnd(e)}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getCourseColor(event.course_id) }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {event.task_title ?? "(untitled)"}
                      </div>
                      {event.goal_descr && (
                        <div className="text-xs text-gray-600 truncate">
                          {event.goal_descr}
                        </div>
                      )}
                    </div>
                    <Move className="w-4 h-4 text-gray-400 opacity-50 hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader className="border-b border-[#e5e8eb] pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#0a80ed] rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">C</span>
                </div>
                <DialogTitle className="text-xl font-semibold">CourseHelper</DialogTitle>
              </div>
              <div className="flex items-center gap-4 text-sm text-[#71717a]">
                <span>Track Progress</span>
                <span>Docs</span>
                <span>My Tasks</span>
                <span>Calendar</span>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-[#18181b] mb-2">Settings</h2>
                <p className="text-[#71717a]">Manage your account and preferences</p>
              </div>

              <Tabs defaultValue="integrations" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  <TabsTrigger value="general" className="text-sm">
                    General
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="text-sm">
                    Notifications
                  </TabsTrigger>
                  <TabsTrigger value="integrations" className="text-sm">
                    Integrations
                  </TabsTrigger>
                  <TabsTrigger value="about" className="text-sm">
                    About
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="integrations" className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Calendar integrations</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-[#e5e8eb] rounded-lg hover:bg-[#f8f9fa] transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-[#4285f4] rounded-lg flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-[#18181b]">Google Calendar</div>
                            <div className="text-sm text-[#71717a]">
                              Connect your Google calendar to sync events and tasks
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="border-[#0a80ed] text-[#0a80ed] hover:bg-[#0a80ed] hover:text-white"
                          onClick={handleConnectCalendar}
                        >
                          Connect
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-4 border border-[#e5e8eb] rounded-lg hover:bg-[#f8f9fa] transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-[#0078d4] rounded-lg flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-[#18181b]">Outlook Calendar</div>
                            <div className="text-sm text-[#71717a]">
                              Connect your Outlook calendar to sync events and tasks
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="border-[#0a80ed] text-[#0a80ed] hover:bg-[#0a80ed] hover:text-white"
                        >
                          Connect
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>



      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2">
        <Button size="icon" variant="outline" className="rounded-full w-12 h-12" onClick={handleSyncAll} disabled={syncing}>
          <RotateCcw className={`w-6 h-6 text-blue-600 ${syncing ? 'animate-spin' : ''}`} />
        </Button>
        <Button size="icon" variant="outline" className="rounded-full w-12 h-12" onClick={() => setShowSettings(true)}>
          <Settings className="w-5 h-5" />
        </Button>
      </div>



      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Plus className="w-4 h-4 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Add New Task</h2>
                </div>
                <button
                  onClick={handleCloseAddTaskModal}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Task Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Task Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Enter task name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={newTaskName}
                      onChange={e => setNewTaskName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={newTaskDueDate}
                      onChange={e => setNewTaskDueDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Course Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={selectedCourseId}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    onFocus={() => {
                      if (userCourses.length === 0) {
                        fetchUserCourses();
                      }
                    }}
                  >
                    <option value="">Select a course</option>
                    {isLoadingCourses ? (
                      <option value="" disabled>Loading courses...</option>
                    ) : (
                      userCourses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title || course.id}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Goal Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Goal *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={selectedGoalId}
                    onChange={(e) => setSelectedGoalId(e.target.value)}
                    disabled={!selectedCourseId}
                  >
                    <option value="">Select a goal</option>
                    {isLoadingGoals ? (
                      <option value="" disabled>Loading goals...</option>
                    ) : (
                      courseGoals.map((goal) => (
                        <option key={goal.goal_id} value={goal.goal_id}>
                          {goal.goal_descr || goal.goal_id}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Task Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Description
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add a description for this task (optional)"
                    value={newTaskDescription}
                    onChange={e => setNewTaskDescription(e.target.value)}
                  />
                </div>

                {/* Subtasks */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Subtasks</h3>
                    <button
                      type="button"
                      className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                      onClick={() => setNewSubtasks([...newSubtasks, { subtask_descr: '', subtask_type: 'other', estimatedTimeMinutes: 15 }])}
                    >
                      <Plus className="w-4 h-4" />
                      Add Subtask
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {newSubtasks.map((subtask, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Subtask {index + 1} *
                            </label>
                            <input
                              type="text"
                              value={subtask.subtask_descr}
                              onChange={e => {
                                const updated = [...newSubtasks];
                                updated[index].subtask_descr = e.target.value;
                                setNewSubtasks(updated);
                              }}
                              placeholder={`Enter subtask ${index + 1} name`}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Type
                            </label>
                            <select
                              value={subtask.subtask_type}
                              onChange={e => {
                                const updated = [...newSubtasks];
                                updated[index].subtask_type = e.target.value;
                                setNewSubtasks(updated);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="reading">Reading</option>
                              <option value="flashcard">Flashcard</option>
                              <option value="quiz">Quiz</option>
                              <option value="practice">Practice</option>
                              <option value="review">Review</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Time (min)
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={subtask.estimatedTimeMinutes || 15}
                                onChange={e => {
                                  const updated = [...newSubtasks];
                                  updated[index].estimatedTimeMinutes = parseInt(e.target.value) || 0;
                                  setNewSubtasks(updated);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                min="5"
                                max="120"
                              />
                              <button
                                onClick={() => setNewSubtasks(newSubtasks.filter((_, i) => i !== index))}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove subtask"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {newSubtasks.length === 0 && (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      <p>No subtasks yet. Add your first subtask to get started.</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleCloseAddTaskModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    onClick={handleCreateTask}
                  >
                    <Save className="w-4 h-4" />
                    Create Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtasks Modal */}
      {subtasksModal && (
        <div
          className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg subtasks-modal"
          style={{
            left: Math.max(10, subtasksModal.position.x),
            top: Math.max(10, subtasksModal.position.y),
            width: '400px',
            maxHeight: '500px',
            minWidth: '320px',
            minHeight: '200px',
          }}
        >
          <Card className="border-0 shadow-none h-full">
            <CardHeader className="pb-3">
                              <div
                  className="flex items-center justify-between"
                  onMouseDown={(e) => handleSubtasksModalMouseDown(e)}
                  style={{ cursor: isSubtasksModalDragging ? 'grabbing' : 'grab' }}
                >
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <CardTitle className="text-lg truncate">
                    Subtasks
                  </CardTitle>
                </div>
                <button
                  onClick={closeSubtasksModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 p-1 hover:bg-gray-100 rounded"
                  style={{ cursor: 'pointer' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto" style={{ maxHeight: '400px' }}>
              <div className="space-y-3">
                {/* Task Info */}
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: getCourseColor(subtasksModal.task.course_id) }}></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{subtasksModal.task.task_title}</h3>
                    {subtasksModal.task.task_descr && (
                      <p className="text-sm text-gray-600 mt-1">{subtasksModal.task.task_descr}</p>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      Progress: {subtasksModal.task.completedSubtasks}/{subtasksModal.task.totalSubtasks} subtasks
                    </div>
                  </div>
                </div>

                {/* Subtasks List */}
                <div className="space-y-2">
                  {subtasksModal.task.subtasks?.map((subtask: any, index: number) => {
                    // Find the updated subtask from the current goals data
                    const updatedSubtask = Object.values(goalsByDate)
                      .flat()
                      .find(goal => goal.subtask_id === subtask.subtask_id);
                    
                    // Use updated data if available, otherwise fall back to original
                    const currentSubtask = updatedSubtask || subtask;
                    
                    return (
                      <div
                        key={currentSubtask.subtask_id || index}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div 
                          className={`w-3 h-3 rounded-full flex-shrink-0 cursor-pointer ${currentSubtask.subtask_completed ? 'bg-green-500' : 'bg-gray-300'}`}
                          onClick={() => handleSubtaskToggle(currentSubtask)}
                        />
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleSubtaskToggle(currentSubtask)}>
                          <div className={`text-sm font-medium ${currentSubtask.subtask_completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {currentSubtask.subtask_descr || `Subtask ${index + 1}`}
                          </div>
                          {currentSubtask.subtask_type && currentSubtask.subtask_type !== 'other' && (
                            <span className="text-xs px-2 py-1 bg-gray-200 rounded text-gray-600 mt-1 inline-block">
                              {currentSubtask.subtask_type}
                            </span>
                          )}
                          {currentSubtask.estimatedTimeMinutes && (
                            <div className="text-xs text-gray-500 mt-1">
                              Estimated: {currentSubtask.estimatedTimeMinutes} minutes
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteSubtaskModal({
                              isOpen: true,
                              subtask: currentSubtask,
                              position: { x: e.clientX, y: e.clientY }
                            });
                          }}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          title="Delete subtask"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal?.isOpen && deleteModal?.task && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Delete Task</h2>
                </div>
                <button
                  onClick={handleDeleteCancel}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-gray-700 text-lg mb-4">
                    Are you sure you want to delete this task?
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: getCourseColor(deleteModal.task.course_id) }}></div>
                      <div className="flex-1 text-left">
                        <h3 className="font-semibold text-gray-900">{deleteModal.task.task_title || '(untitled)'}</h3>
                        {deleteModal.task.task_descr && (
                          <p className="text-sm text-gray-600 mt-1">{deleteModal.task.task_descr}</p>
                        )}
                        {deleteModal.task.task_due_date && (
                          <p className="text-sm text-gray-500 mt-1">
                            Due: {new Date(deleteModal.task.task_due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleDeleteCancel}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtask Delete Confirmation Modal */}
      {deleteSubtaskModal?.isOpen && deleteSubtaskModal?.subtask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Delete Subtask</h2>
                </div>
                <button
                  onClick={handleSubtaskDeleteCancel}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-gray-700 text-lg mb-4">
                    Are you sure you want to delete this subtask?
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: getCourseColor(deleteSubtaskModal.subtask.course_id) }}></div>
                      <div className="flex-1 text-left">
                        <h3 className="font-semibold text-gray-900">{deleteSubtaskModal.subtask.subtask_descr || '(untitled)'}</h3>
                        {deleteSubtaskModal.subtask.task_title && (
                          <p className="text-sm text-gray-600 mt-1">Task: {deleteSubtaskModal.subtask.task_title}</p>
                        )}
                        {deleteSubtaskModal.subtask.subtask_type && deleteSubtaskModal.subtask.subtask_type !== 'other' && (
                          <p className="text-sm text-gray-500 mt-1">
                            Type: {deleteSubtaskModal.subtask.subtask_type}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSubtaskDeleteCancel}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubtaskDeleteConfirm}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Subtask
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Undo Toast */}
      {showUndoToast && deletedTask && (
        <div className="fixed bottom-6 left-6 bg-white border border-gray-200 rounded-lg shadow-lg z-[10000] max-w-sm">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  Task deleted
                </p>
                <p className="text-xs text-gray-600 truncate">
                  {deletedTask.task_title || '(untitled)'}
                </p>
              </div>
              <button
                onClick={handleUndoDelete}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              >
                Undo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Undo Subtask Toast */}
      {showUndoSubtaskToast && deletedSubtask && (
        <div className="fixed bottom-6 left-6 bg-white border border-gray-200 rounded-lg shadow-lg z-[10000] max-w-sm">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  Subtask deleted
                </p>
                <p className="text-xs text-gray-600 truncate">
                  {deletedSubtask.subtask_descr || '(untitled)'}
                </p>
              </div>
              <button
                onClick={handleUndoSubtaskDelete}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              >
                Undo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
