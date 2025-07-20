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
  Pencil,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import useAuthRedirect from "@/hooks/useAuthRedirect"
import { Switch } from "@/components/ui/switch"
import { toast } from "react-hot-toast"
import { useSearchParams } from 'next/navigation';

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

// Refactor updateCourseTitles to accept courses array and return new array
async function updateCourseTitles(courseIds: string[], token: string, courses: Course[]): Promise<Course[]> {
  function getBaseCourseId(courseId: string) {
    return courseId.split('+')[0];
  }
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
  const coursePromises = courseIds.map(async courseId => {
    const realCourseId = getBaseCourseId(courseId);
    try {
      const course = await fetch(`${api}/api/courses/${realCourseId}`, {
        headers: { Authorization: `Bearer ${token}` },
        method: "GET"
      });
      if (!course.ok) throw new Error(`Request failed ${course.status}`);
      const courseDetails = await course.json();
      return {
        course_id: realCourseId,
        course_title: courseDetails.title,
        course_description: courseDetails.description
      };
    } catch (error) {
      return {
        course_id: realCourseId,
        course_title: realCourseId,
        course_description: ''
      };
    }
  });
  const courseDetails = await Promise.all(coursePromises);
  const newCourses = courses.map((course: Course) => {
    const realCourseId = getBaseCourseId(course.course_id);
    const details = courseDetails.find(d => d.course_id === realCourseId);
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
  const [sortedGoalsByDate, setSortedGoalsByDate] = useState<GoalsByDate>({});
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
          const goalsRes = await fetch(`${api}/api/goals/subtasks`, {
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
  const [newTaskDueDateError, setNewTaskDueDateError] = useState('');
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

  // Add subtask form state
  const [newSubtaskDescr, setNewSubtaskDescr] = useState('');
  const [newSubtaskTypeForAdd, setNewSubtaskTypeForAdd] = useState('other');
  const [newSubtaskTime, setNewSubtaskTime] = useState(15);

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

  /** Add subtask modal state */
  const [addSubtaskModal, setAddSubtaskModal] = useState<{
    isOpen: boolean;
    task: any;
  } | null>(null);

  /** View Subtask modal state */
  const [viewSubtaskModal, setViewSubtaskModal] = useState<{
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

  /** Drag target state for responsive shading */
  const [dragTargetHour, setDragTargetHour] = useState<number | null>(null);
  const [dragTargetMinute, setDragTargetMinute] = useState<number | null>(null);
  const [dragTargetDate, setDragTargetDate] = useState<Date | null>(null);

  /** Warning modal for past due date drops */
  const [dueDateWarningModal, setDueDateWarningModal] = useState<{
    isOpen: boolean;
    subtask: Goal | null;
    targetDate: Date | null;
    targetHour: number | null;
    targetMinute: number | null;
  } | null>(null);

  /** Drag-to-create subtask state */
  const [isCreatingSubtask, setIsCreatingSubtask] = useState(false);
  const [createSubtaskStart, setCreateSubtaskStart] = useState<{ date: Date; hour: number; minute: number } | null>(null);
  const [createSubtaskEnd, setCreateSubtaskEnd] = useState<{ date: Date; hour: number; minute: number } | null>(null);
  const [showCreateSubtaskModal, setShowCreateSubtaskModal] = useState(false);
  const [createSubtaskModalPosition, setCreateSubtaskModalPosition] = useState({ x: 0, y: 0 });
  const [availableTasks, setAvailableTasks] = useState<Record<string, string>>({});
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [preselectedTaskId, setPreselectedTaskId] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [bannerTaskName, setBannerTaskName] = useState<string | null>(null);
  const [bannerTaskDueDate, setBannerTaskDueDate] = useState<string | null>(null);
  const [newSubtaskDescription, setNewSubtaskDescription] = useState('');
  const [goalIdForRouting, setGoalIdForRouting] = useState<string | null>(null);
  const [courseIdForRouting, setCourseIdForRouting] = useState<string | null>(null);
  const [newSubtaskTypeForCreate, setNewSubtaskTypeForCreate] = useState('other');
  const [storedTaskDueDate, setStoredTaskDueDate] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    startDate: Date;
    startHour: number;
    startMinute: number;
    endDate: Date;
    endHour: number;
    endMinute: number;
  } | null>(null);
  const [initialClickPosition, setInitialClickPosition] = useState<{ x: number; y: number } | null>(null);

  /** Subtasks modal drag state */
  const [isSubtasksModalDragging, setIsSubtasksModalDragging] = useState(false);
  const [subtasksModalDragOffset, setSubtasksModalDragOffset] = useState({ x: 0, y: 0 });

  /** Drag and drop state for task events */
  const [isDraggingTask, setIsDraggingTask] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Goal | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [highlightSubtaskId, setHighlightSubtaskId] = useState<string | null>(null);

  const [showRescheduleTaskModal, setShowRescheduleTaskModal] = useState(false);
  const [rescheduleTaskDueDate, setRescheduleTaskDueDate] = useState<string>('');
  const [rescheduleTaskSubtasks, setRescheduleTaskSubtasks] = useState<any[]>([]);
  const latestSubtaskEnd = rescheduleTaskSubtasks.length > 0
    ? new Date(Math.max(...rescheduleTaskSubtasks.map((sub: any) => sub.end_time ? new Date(sub.end_time).getTime() : 0)))
    : null;
  const minDueDate = latestSubtaskEnd ? latestSubtaskEnd.toISOString().split('T')[0] : undefined;

  /** Edit Subtask Modal */
  const [showEditSubtaskModal, setShowEditSubtaskModal] = useState(false);
  const [editSubtaskData, setEditSubtaskData] = useState<any>(null);
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
    if (!isSubtasksModalDragging) return;

    const newX = e.clientX - subtasksModalDragOffset.x;
    const newY = e.clientY - subtasksModalDragOffset.y;

    // Update subtasks modal if it exists
    if (subtasksModal) {
      setSubtasksModal(prev => prev ? {
        ...prev,
        position: { x: newX, y: newY }
      } : null);
    }

    // Update view subtask modal if it exists
    if (viewSubtaskModal) {
      setViewSubtaskModal(prev => prev ? {
        ...prev,
        position: { x: newX, y: newY }
      } : null);
    }

    // Update create subtask modal if it exists
    if (showCreateSubtaskModal) {
      setCreateSubtaskModalPosition({ x: newX, y: newY });
    }
  };

  const handleSubtasksModalMouseUp = () => {
    setIsSubtasksModalDragging(false);
  };

  // Drag-to-create subtask handlers
  const handleTimeSlotMouseDown = (e: React.MouseEvent, date: Date, hour: number, minute: number = 0) => {
    // Only start drag-to-create if not already dragging a task
    if (isDraggingTask) return;

    // Check if the click target is an event
    const target = e.target as HTMLElement;
    const isEvent = target.closest('div.absolute.rounded') ||
      target.closest('div[style*="background-color"]') ||
      target.closest('div[style*="backgroundColor"]') ||
      (target.classList.contains('absolute') && target.style.backgroundColor);

    // Don't start drag-to-create if clicking on an event
    if (isEvent) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // Store the initial click position
    setInitialClickPosition({ x: e.clientX, y: e.clientY });

    setIsCreatingSubtask(true);
    setCreateSubtaskStart({ date, hour, minute });
    setCreateSubtaskEnd({ date, hour, minute });

    // Initialize drag preview
    setDragPreview({
      startDate: date,
      startHour: hour,
      startMinute: minute,
      endDate: date,
      endHour: hour,
      endMinute: minute
    });
  };

  const handleTimeSlotMouseMove = (e: React.MouseEvent, date: Date, hour: number, minute: number = 0) => {
    if (!isCreatingSubtask || !createSubtaskStart) return;

    // Check if the mouse is over an event
    const target = e.target as HTMLElement;
    const isEvent = target.closest('div.absolute.rounded') ||
      target.closest('div[style*="background-color"]') ||
      target.closest('div[style*="backgroundColor"]') ||
      (target.classList.contains('absolute') && target.style.backgroundColor);

    // Don't continue drag-to-create if over an event
    if (isEvent) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // Adjust hour and minute for display - if minute is 0, use the current hour
    // If minute is 30, use the current hour with 30 minutes
    let displayHour = hour;
    let displayMinute = minute;

    setCreateSubtaskEnd({ date, hour, minute });

    // Update drag preview
    setDragPreview({
      startDate: createSubtaskStart.date,
      startHour: createSubtaskStart.hour,
      startMinute: createSubtaskStart.minute,
      endDate: date,
      endHour: displayHour,
      endMinute: displayMinute
    });
  };

  const handleTimeSlotMouseUp = (e?: React.MouseEvent, date?: Date, hour?: number, minute?: number) => {
    if (isCreatingSubtask && createSubtaskStart) {
      // Check if the mouse is over an event
      if (e) {
        const target = e.target as HTMLElement;
        const isEvent = target.closest('div.absolute.rounded') ||
          target.closest('div[style*="background-color"]') ||
          target.closest('div[style*="backgroundColor"]') ||
          (target.classList.contains('absolute') && target.style.backgroundColor);

        // Don't complete drag-to-create if over an event
        if (isEvent) {
          setIsCreatingSubtask(false);
          setDragPreview(null); // Clear preview
          return;
        }
      }

      setIsCreatingSubtask(false);
      setShowCreateSubtaskModal(true);
      // Initialize modal position so the top-right corner is next to the top-left corner of where the user started the drag
      if (initialClickPosition) {
        setCreateSubtaskModalPosition({
          x: Math.max(10, initialClickPosition.x - 500), // Increased offset to avoid overlap with shaded box
          y: Math.max(10, initialClickPosition.y)
        });
      } else {
        // Fallback to center if no initial position
        setCreateSubtaskModalPosition({
          x: Math.max(10, window.innerWidth / 2 - 200),
          y: Math.max(10, window.innerHeight / 2 - 250)
        });
      }
      fetchAvailableTasks();
      // Keep the drag preview visible during modal creation
      // setDragPreview(null); // Clear preview
    }
  };

  // Fetch available tasks for the dropdown
  const fetchAvailableTasks = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const res = await fetch(`${api}/api/goals/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Request failed ${res.status}`);
      const tasks = await res.json();
      setAvailableTasks(tasks);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      toast.error("Failed to load available tasks");
    }
  };

  // Handle creating the subtask
  const handleCreateSubtaskConfirm = async (bypassDueDateCheck = false, bypass = false) => {
    if (!selectedTaskId || !newSubtaskDescription.trim() || !createSubtaskStart || !createSubtaskEnd) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Check if the scheduled time is past the task's due date
    if (!bypassDueDateCheck) {
      // Get the task details to check due date
      const allGoals = Object.values(goalsByDate).flat();
      const task = allGoals.find(goal => goal.task_id === selectedTaskId);

      // Use stored due date from URL search params if available, otherwise use task's due date
      let taskDueDateStr = storedTaskDueDate;

      // Debug stored due date
      console.log('Due date check:', {
        taskId: selectedTaskId,
        taskDueDateStr,
        storedTaskDueDate,
        taskFound: !!task,
        task: task
      });

      // If no stored due date, try to get it from the task data
      if (!taskDueDateStr && task) {
        taskDueDateStr = task.task_due_date || task.due_date;
      }

      console.log('Due date check:', {
        taskId: selectedTaskId,
        taskDueDateStr,
        storedTaskDueDate,
        taskFound: !!task,
        task: task
      });

      if (taskDueDateStr) {
        console.log('Raw taskDueDateStr:', taskDueDateStr);

        // Parse the due date consistently - always convert to local date
        let dueDateLocal;
        if (storedTaskDueDate) {
          // If it's from stored URL params, it's in YYYY-MM-DD format
          const [year, month, day] = taskDueDateStr.split('-').map(Number);
          dueDateLocal = new Date(year, month - 1, day); // month is 0-indexed
          console.log('Parsed from stored URL param:', { year, month, day, dueDateLocal: dueDateLocal.toISOString() });
        } else {
          // If it's from task data, it might be in ISO format - convert to local date
          const dueDateUTC = new Date(taskDueDateStr);
          dueDateLocal = new Date(
            dueDateUTC.getUTCFullYear(),
            dueDateUTC.getUTCMonth(),
            dueDateUTC.getUTCDate()
          );
          console.log('Parsed from task data:', { dueDateUTC: dueDateUTC.toISOString(), dueDateLocal: dueDateLocal.toISOString() });
        }

        // Create scheduled date consistently in local timezone
        const scheduledDate = new Date(createSubtaskStart.date);
        scheduledDate.setHours(createSubtaskStart.hour, createSubtaskStart.minute, 0, 0);
        const scheduledDateLocal = new Date(
          scheduledDate.getFullYear(),
          scheduledDate.getMonth(),
          scheduledDate.getDate()
        );

        console.log('Date comparison:', {
          dueDateLocal: dueDateLocal.toISOString(),
          scheduledDateLocal: scheduledDateLocal.toISOString(),
          dueDateLocalTime: dueDateLocal.getTime(),
          scheduledDateLocalTime: scheduledDateLocal.getTime(),
          isPastDue: scheduledDateLocal > dueDateLocal
        });

        // Compare local dates consistently (both are now in local timezone, date-only)
        if (scheduledDateLocal > dueDateLocal) {
          console.log('Showing due date warning modal');
          // Show warning modal instead of proceeding
          setDueDateWarningModal({
            isOpen: true,
            subtask: task || {
              id: '',
              user_id: '',
              course_id: '',
              goal_id: '',
              goal_descr: '',
              task_id: selectedTaskId || '',
              task_title: availableTasks && selectedTaskId ? Object.keys(availableTasks).find(title => availableTasks[title] === selectedTaskId) || '' : '',
              task_descr: '',
              task_due_date: taskDueDateStr,
              due_date: taskDueDateStr,
              start_time: '',
              end_time: '',
              subtask_id: '',
              subtask_descr: '',
              subtask_type: '',
              subtask_completed: false,
              task_completed: false,
              progress: 0,
              totalSubtasks: 0,
              completedSubtasks: 0,
              subtasks: [],
              google_calendar_color: '',
              status: null,
              goal_completed: false,
              created_at: '',
              updated_at: '',
              is_conflicting: false // <-- Added field
            },
            targetDate: createSubtaskStart.date,
            targetHour: createSubtaskStart.hour,
            targetMinute: createSubtaskStart.minute
          });
          return;
        }
      }
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";

      // Construct start and end times in local time, then send as UTC ISO string (backend expects UTC)
      const startDate = new Date(createSubtaskStart.date);
      const startDateTime = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        createSubtaskStart.hour,
        createSubtaskStart.minute,
        0, 0
      );

      const endDate = new Date(createSubtaskEnd.date);
      let endDateTime = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        createSubtaskEnd.hour,
        createSubtaskEnd.minute,
        0, 0
      );
      // Ensure end time is after start time (min 30 min)
      if (endDateTime <= startDateTime) {
        endDateTime = new Date(startDateTime.getTime() + 30 * 60000);
      }

      let payload: any = {
        subtask_descr: newSubtaskDescription.trim(),
        subtask_type: newSubtaskTypeForCreate,
        // Send as UTC ISO string (backend expects UTC)
        subtask_start_time: startDateTime.toISOString(),
        subtask_end_time: endDateTime.toISOString(),
        // Don't send task_due_date - let backend use placeholder row's task_due_date
        bypass_due_date: bypass
      };

      const res = await fetch(`${api}/api/goals/tasks/${selectedTaskId}/subtasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Failed to create subtask: ${res.status}`);
      }

      toast.success("Subtask created successfully!");

      // Reset form
      setShowCreateSubtaskModal(false);
      setSelectedTaskId('');
      setNewSubtaskDescription('');
      setNewSubtaskTypeForCreate('other');
      setCreateSubtaskStart(null);
      setCreateSubtaskEnd(null);
      setDragPreview(null); // Clear preview when subtask is created
      setInitialClickPosition(null); // Clear initial click position

      // Refresh goals data
      const fetchGoals = async () => {
        try {
          const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
          if (!token) return console.warn("No JWT in localStorage");

          const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
          const res = await fetch(`${api}/api/goals/subtasks`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error(`Request failed ${res.status}`);

          const grouped = await res.json() as Record<string, Goal[]>;
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

      setShowBanner(false);

      // Route back to goal detail page if goalId and courseId are available
      if (goalIdForRouting && courseIdForRouting) {
        window.location.href = `http://localhost:3001/courses/${courseIdForRouting}/goals/${goalIdForRouting}`;
      }
    } catch (error) {
      console.error('Failed to create subtask:', error);
      toast.error('Failed to create subtask');
    }
  };

  const handleCreateSubtaskCancel = () => {
    setShowCreateSubtaskModal(false);
    // Preserve selectedTaskId for reuse
    // setSelectedTaskId(''); // Commented out to preserve selection
    setNewSubtaskDescription('');
    setNewSubtaskTypeForCreate('other');
    setCreateSubtaskStart(null);
    setCreateSubtaskEnd(null);
    setDragPreview(null); // Clear preview when modal is cancelled
    setInitialClickPosition(null); // Clear initial click position
  };

  // Drag and drop handlers for subtask events
  const handleSubtaskDragStart = (e: React.DragEvent, subtask: Goal) => {
    // Prevent dragging for Google Calendar events
    if (subtask.goal_id === "Google Calendar") {
      e.preventDefault();
      return;
    }

    e.stopPropagation();
    setIsDraggingTask(true);
    setDraggedTask(subtask);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify(subtask));
  };

  const handleSubtaskDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsDraggingTask(false);
    setDraggedTask(null);
    setDragOverDate(null);
    setDragTargetHour(null);
    setDragTargetMinute(null);
    setDragTargetDate(null);
  };

  const handleTimeSlotDragOver = (e: React.DragEvent, date: Date, hour: number, minute: number = 0) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(date);
    setDragTargetHour(hour);
    setDragTargetMinute(minute);
    setDragTargetDate(date);
  };

  const handleTimeSlotDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverDate(null);
    setDragTargetHour(null);
    setDragTargetMinute(null);
    setDragTargetDate(null);
  };

  const performSubtaskDrop = async (subtask: Goal, targetDate: Date, targetHour: number, targetMinute: number = 0, bypass = false) => {
    try {
      // Calculate new start and end times based on drop location in local timezone
      const newStartTime = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        targetHour,
        targetMinute,
        0,
        0
      );

      // Calculate duration from original subtask
      const originalStart = new Date(subtask.start_time!);
      const originalEnd = new Date(subtask.end_time!);
      const durationMs = originalEnd.getTime() - originalStart.getTime();

      // Set new end time based on duration
      const newEndTime = new Date(newStartTime.getTime() + durationMs);

      // Call the update_subtask endpoint
      const token = localStorage.getItem("token");
      if (!token) return alert("Please log in first.");

      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      let payload: any = {
        subtask_start_time: newStartTime.toISOString(),
        subtask_end_time: newEndTime.toISOString(),
        bypass_due_date: bypass
      };

      console.log("Payload", payload)

      const res = await fetch(`${api}/api/goals/tasks/subtasks/${subtask.subtask_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Failed to update subtask: ${res.status}`);
      }

      // Refresh the goals data to show the updated subtask
      const fetchGoals = async () => {
        try {
          const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
          if (!token) return console.warn("No JWT in localStorage");

          const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
          const res = await fetch(`${api}/api/goals/subtasks`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error(`Request failed ${res.status}`);

          const grouped = await res.json() as Record<string, Goal[]>;
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

      toast.success(`Subtask moved to ${targetDate.toLocaleDateString()} at ${targetHour}:${targetMinute.toString().padStart(2, '0')}`);

      // Close the overflow modal if it's open
      if (overflowEvents) {
        setOverflowEvents(null);
      }
    } catch (error) {
      console.error('Failed to move subtask:', error);
      toast.error('Failed to move subtask');
    } finally {
      setDragOverDate(null);
    }
  };

  const handleTimeSlotDrop = async (e: React.DragEvent, targetDate: Date, targetHour: number, targetMinute: number = 0) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedTask) return;

    // Check if the target date is past the task's due date
    const taskDueDate = draggedTask.task_due_date || draggedTask.due_date;
    if (taskDueDate) {
      // Parse the due date from UTC and convert to local date
      const dueDateUTC = new Date(taskDueDate);
      // Convert UTC date to local date by creating a new date with local components
      const dueDateLocal = new Date(
        dueDateUTC.getUTCFullYear(),
        dueDateUTC.getUTCMonth(),
        dueDateUTC.getUTCDate()
      );

      // Create target date in local timezone
      const targetDateTime = new Date(targetDate);
      targetDateTime.setHours(targetHour, targetMinute, 0, 0);
      const targetDateLocal = new Date(
        targetDateTime.getFullYear(),
        targetDateTime.getMonth(),
        targetDateTime.getDate()
      );

      // Compare local dates (ignoring time and timezone)
      if (targetDateLocal > dueDateLocal) {
        // Show warning modal instead of proceeding
        setDueDateWarningModal({
          isOpen: true,
          subtask: draggedTask,
          targetDate: targetDate,
          targetHour: targetHour,
          targetMinute: targetMinute
        });
        return;
      }
    }

    // Proceed with the drop if no due date conflict
    await performSubtaskDrop(draggedTask, targetDate, targetHour, targetMinute);
  };

  // Set pre-filled form state for Editing Subtask
  const handleEditSubtask = () => {
    if (!viewSubtaskModal?.subtask) return;
    const subtask = viewSubtaskModal.subtask;
    // Defensive: Only create Date if not null
    const start = subtask.start_time ? new Date(subtask.start_time) : new Date();
    const end = subtask.end_time ? new Date(subtask.end_time) : new Date();
    setEditSubtaskData({
      subtask_id: subtask.subtask_id,
      subtask_descr: subtask.subtask_descr,
      subtask_type: subtask.subtask_type || 'other',
      startDate: new Date(start.getFullYear(), start.getMonth(), start.getDate()),
      startHour: start.getHours(),
      startMinute: start.getMinutes(),
      endDate: new Date(end.getFullYear(), end.getMonth(), end.getDate()),
      endHour: end.getHours(),
      endMinute: end.getMinutes(),
    });
    setShowEditSubtaskModal(true);
  }

  const handleEditSubtaskCancel = () => {
    setShowEditSubtaskModal(false);
    setEditSubtaskData(null);
  }

  const handleEditSubtaskSave = async (bypass = false) => {
    if (!editSubtaskData) return;
    // Find the parent task (from goalsByDate)
    const allGoals = Object.values(goalsByDate).flat();
    const parentTask = allGoals.find(goal => goal.subtask_id === editSubtaskData.subtask_id);
    let taskDueDateStr = parentTask?.task_due_date || parentTask?.due_date;
    if (taskDueDateStr && !bypass) {
      // Parse the due date as local date
      let dueDateLocal;
      if (taskDueDateStr.includes('-') && !taskDueDateStr.includes('T')) {
        // YYYY-MM-DD format
        const [year, month, day] = taskDueDateStr.split('-').map(Number);
        dueDateLocal = new Date(year, month - 1, day);
      } else {
        // ISO format
        const dueDateUTC = new Date(taskDueDateStr);
        dueDateLocal = new Date(
          dueDateUTC.getUTCFullYear(),
          dueDateUTC.getUTCMonth(),
          dueDateUTC.getUTCDate()
        );
      }
      // Get the new scheduled date from the edit modal
      const scheduledDate = new Date(editSubtaskData.startDate);
      scheduledDate.setHours(editSubtaskData.startHour, editSubtaskData.startMinute, 0, 0);
      const scheduledDateLocal = new Date(
        scheduledDate.getFullYear(),
        scheduledDate.getMonth(),
        scheduledDate.getDate()
      );
      if (scheduledDateLocal > dueDateLocal) {
        setDueDateWarningModal({
          isOpen: true,
          subtask: parentTask || {
            ...editSubtaskData,
            task_due_date: taskDueDateStr,
            due_date: taskDueDateStr,
            start_time: '',
            end_time: '',
            subtask_id: editSubtaskData.subtask_id,
            subtask_descr: editSubtaskData.subtask_descr,
            subtask_type: editSubtaskData.subtask_type,
            subtask_completed: false,
            task_completed: false,
            progress: 0,
            totalSubtasks: 0,
            completedSubtasks: 0,
            subtasks: [],
            google_calendar_color: '',
            status: null,
            goal_completed: false,
            created_at: '',
            updated_at: '',
            is_conflicting: false
          },
          targetDate: scheduledDate,
          targetHour: editSubtaskData.startHour,
          targetMinute: editSubtaskData.startMinute
        });
        return;
      }
    }
    const token = localStorage.getItem("token");
    if (!token) return;
    const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
    // Construct start and end ISO strings
    const startDateTime = new Date(
      editSubtaskData.startDate.getFullYear(),
      editSubtaskData.startDate.getMonth(),
      editSubtaskData.startDate.getDate(),
      editSubtaskData.startHour,
      editSubtaskData.startMinute,
      0, 0
    );
    let endDateTime = new Date(
      editSubtaskData.endDate.getFullYear(),
      editSubtaskData.endDate.getMonth(),
      editSubtaskData.endDate.getDate(),
      editSubtaskData.endHour,
      editSubtaskData.endMinute,
      0, 0
    );
    if (endDateTime <= startDateTime) {
      endDateTime = new Date(startDateTime.getTime() + 30 * 60000);
    }
    const payload = {
      subtask_descr: editSubtaskData.subtask_descr,
      subtask_type: editSubtaskData.subtask_type,
      // Send as UTC ISO string (backend expects UTC)
      subtask_start_time: startDateTime.toISOString(),
      subtask_end_time: endDateTime.toISOString(),
      bypass_due_date: bypass
    };
    try {
      const res = await fetch(`${api}/api/goals/tasks/subtasks/${editSubtaskData.subtask_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to update subtask');
      setShowEditSubtaskModal(false);
      setEditSubtaskData(null);
      setViewSubtaskModal(null);
      // Optionally, refresh goals data here
      // ...
      toast.success('Subtask updated successfully');
      // Refresh goals data
      const fetchGoals = async () => {
        try {
          const res = await fetch(`${api}/api/goals/subtasks`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error(`Request failed ${res.status}`);
          const grouped = await res.json() as Record<string, Goal[]>;
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
      fetchGoals();
    } catch (err) {
      toast.error('Failed to update subtask');
    }
  };

  const handleDueDateWarningConfirm = async () => {
    if (dueDateWarningModal) {
      const { subtask, targetDate, targetHour, targetMinute } = dueDateWarningModal;
      setDueDateWarningModal(null);

      if (subtask && targetDate && targetHour !== null) {
        // Check if this is from drag-to-create or add subtask modal
        if (showCreateSubtaskModal) {
          // This is from drag-to-create, proceed with creating the subtask
          await handleCreateSubtaskConfirm(true, true);
        } else if (addSubtaskModal?.isOpen) {
          // This is from add subtask modal, proceed with creating the subtask
          await handleAddSubtaskConfirm(true, true);
        } else if (showEditSubtaskModal) {
          await handleEditSubtaskSave(true);
        } else {
          // This is from drag-and-drop, proceed with the drop
          await performSubtaskDrop(subtask, targetDate, targetHour, targetMinute || 0, true);
        }
      }
    }
  };

  const handleDueDateWarningCancel = () => {
    setDueDateWarningModal(null);
    // Close the scheduling modal but preserve the selectedTaskId
    if (showCreateSubtaskModal) {
      setShowCreateSubtaskModal(false);
      // Clear the drag preview and time selection
      setDragPreview(null);
      setCreateSubtaskStart(null);
      setCreateSubtaskEnd(null);
      setInitialClickPosition(null);
      // Don't reset selectedTaskId so it can be reused
    } else if (addSubtaskModal?.isOpen) {
      setAddSubtaskModal(null);
      setNewSubtaskDescr('');
      setNewSubtaskTypeForAdd('other');
      setNewSubtaskTime(15);
    }
  };

  // Add this handler inside CalendarScheduler:
  const handleRescheduleTaskSave = async () => {
    // Use the first subtask as a fallback if viewSubtaskModal.subtask is null
    const subtask = viewSubtaskModal?.subtask || rescheduleTaskSubtasks[0];
    if (!subtask) return;
    const taskId = subtask.task_id;
    const goalId = subtask.goal_id;
    const token = localStorage.getItem('token');
    if (!token) return toast.error('Not logged in');
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5173';
      const payload = {
        tasks: [{
          task_id: taskId,
          task_due_date: rescheduleTaskDueDate,
        }],
        bypass: false
      };
      console.log('Sending to backend:', payload); // <-- Added log
      const res = await fetch(`${api}/api/goals/${goalId}/tasks`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.conflicting_subtasks) {
        // Find descriptions for conflicting subtasks
        const descs = rescheduleTaskSubtasks
          .filter((sub: any) => data.conflicting_subtasks.includes(sub.subtask_id))
          .map((sub: any) => sub.subtask_descr || sub.subtask_id);
        alert('Conflicting subtasks: ' + descs.join(', '));
      } else {
        setShowRescheduleTaskModal(false);
        // Refresh goals data
        try {
          const res = await fetch(`${api}/api/goals/subtasks`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error(`Request failed ${res.status}`);
          const grouped: Record<string, any[]> = await res.json();
          const filteredGrouped: Record<string, any[]> = {};
          Object.keys(grouped).forEach((key: string) => {
            filteredGrouped[key] = grouped[key].filter((goal: any) => goal.task_id !== 'placeholder');
          });
          setGoalsByDate(filteredGrouped);
          const ordered = Object.keys(filteredGrouped)
            .sort((a, b) => (a === 'unscheduled' ? 1 : b === 'unscheduled' ? -1 : new Date(a).getTime() - new Date(b).getTime()))
            .reduce((acc: Record<string, any[]>, k: string) => { acc[k] = filteredGrouped[k]; return acc; }, {} as Record<string, any[]>);
          setSortedGoalsByDate(ordered);
        } catch (err) {
          console.error('fetchGoals error', err);
        }
        toast.success('Task due date updated');
        // In handleRescheduleTaskSave, after a successful update_goal_tasks and before refreshing goals:
        if (!data.conflicting_subtasks) {
          // Greedily remove the conflict flag in the main calendar state
          setGoalsByDate(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(dateKey => {
              updated[dateKey] = updated[dateKey].map((goal: any) =>
                rescheduleTaskSubtasks.some((sub: any) => sub.subtask_id === goal.subtask_id)
                  ? { ...goal, is_conflicting: false }
                  : goal
              );
            });
            return updated;
          });
          // Optionally also update rescheduleTaskSubtasks for modal consistency
          setRescheduleTaskSubtasks(prev => prev.map((sub: any) => ({ ...sub, is_conflicting: false })));
          // Update each subtask with bypass_due_date: false
          for (const sub of rescheduleTaskSubtasks) {
            await fetch(`${api}/api/goals/tasks/subtasks/${sub.subtask_id}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                subtask_descr: sub.subtask_descr,
                subtask_type: sub.subtask_type,
                subtask_start_time: sub.start_time,
                subtask_end_time: sub.end_time,
                bypass_due_date: false
              })
            });
          }
        }
      }
    } catch (err) {
      toast.error('Failed to update task due date');
    }
  };

  const handleGoalClick = (event: Goal | any, clickEvent?: React.MouseEvent) => {
    console.log('handleGoalClick called with event:', event);
    console.log('clickEvent:', clickEvent);

    // Check if this is coming from the sidebar (has task_title and represents a task, not a subtask)
    if (event.task_title && (event.totalSubtasks || event.subtasks)) {
      // Show regular task modal for sidebar task events
      console.log('Setting selectedGoal for sidebar task');
      setSelectedGoal(event);
      // Set the position for the floating goal display
      if (clickEvent) {
        setGoalDisplayPosition({ x: clickEvent.clientX - 200, y: clickEvent.clientY });
      } else {
        // Default position if no click event
        setGoalDisplayPosition({ x: 100, y: 100 });
      }
    } else if (event.start_time && event.end_time && event.subtask_descr) {
      // Show View Subtask modal for subtask events (calendar events)
      console.log('Setting viewSubtaskModal for calendar subtask');
      setViewSubtaskModal({
        isOpen: true,
        subtask: event,
        position: { x: clickEvent?.clientX || 100, y: clickEvent?.clientY || 100 }
      });
    } else {
      // Default to task modal
      console.log('Setting selectedGoal for default case');
      setSelectedGoal(event);
      // Set the position for the floating goal display
      if (clickEvent) {
        setGoalDisplayPosition({ x: clickEvent.clientX - 200, y: clickEvent.clientY });
      } else {
        // Default position if no click event
        setGoalDisplayPosition({ x: 100, y: 100 });
      }
    }
  };


  const closeViewSubtaskModal = () => {
    setViewSubtaskModal(null);
  };

  const formatEventTime = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return `${startDate.toLocaleTimeString([], options)} - ${endDate.toLocaleTimeString([], options)}`;
  };

  const getSubtaskTypeDisplay = (type: string) => {
    const typeMap: Record<string, string> = {
      'reading': 'Reading',
      'flashcard': 'Flashcard',
      'quiz': 'Quiz',
      'writing': 'Writing',
      'research': 'Research',
      'presentation': 'Presentation',
      'lab': 'Lab Work',
      'discussion': 'Discussion',
      'other': 'Other'
    };
    return typeMap[type] || type;
  };

  const calculateSubtaskStatus = (subtask: Goal) => {
    if (subtask.subtask_completed) {
      return "Completed";
    }

    if (subtask.end_time) {
      const endTime = new Date(subtask.end_time);
      const now = new Date();

      if (now > endTime) {
        return "Overdue";
      }
    }

    return "In Progress";
  };

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

  const handleAddSubtask = () => {
    if (subtasksModal) {
      setAddSubtaskModal({
        isOpen: true,
        task: subtasksModal.task
      });
    }
  }

  const handleAddSubtaskCancel = () => {
    setAddSubtaskModal(null);
    setNewSubtaskDescr('');
    setNewSubtaskTypeForAdd('other');
    setNewSubtaskTime(15);
  }

  const handleAddSubtaskConfirm = async (bypassDueDateCheck = false, bypass = false) => {
    if (!addSubtaskModal?.task || !newSubtaskDescr.trim()) {
      toast.error('Please enter a subtask description');
      return;
    }

    // Check if the task has a due date and if we're scheduling past it
    if (!bypassDueDateCheck) {
      const task = addSubtaskModal.task;
      // Use stored due date from URL search params if available, otherwise use task's due date
      let taskDueDateStr = storedTaskDueDate || task.task_due_date || task.due_date;

      console.log('Add subtask due date check:', {
        taskId: task.task_id,
        taskDueDateStr,
        storedTaskDueDate,
        task: task
      });

      if (taskDueDateStr) {
        console.log('Raw taskDueDateStr (add subtask):', taskDueDateStr);

        // Parse the due date consistently - always convert to local date
        let dueDateLocal;
        if (storedTaskDueDate) {
          // If it's from stored URL params, it's in YYYY-MM-DD format
          const [year, month, day] = taskDueDateStr.split('-').map(Number);
          dueDateLocal = new Date(year, month - 1, day); // month is 0-indexed
          console.log('Parsed from stored URL param (add subtask):', { year, month, day, dueDateLocal: dueDateLocal.toISOString() });
        } else {
          // If it's from task data, it might be in ISO format - convert to local date
          const dueDateUTC = new Date(taskDueDateStr);
          dueDateLocal = new Date(
            dueDateUTC.getUTCFullYear(),
            dueDateUTC.getUTCMonth(),
            dueDateUTC.getUTCDate()
          );
          console.log('Parsed from task data (add subtask):', { dueDateUTC: dueDateUTC.toISOString(), dueDateLocal: dueDateLocal.toISOString() });
        }

        // For add subtask modal, we don't have a specific scheduled time,
        // so we'll use the current date as a reference
        const currentDate = new Date();
        const currentDateLocal = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate()
        );

        console.log('Add subtask date comparison:', {
          dueDateLocal: dueDateLocal.toISOString(),
          currentDateLocal: currentDateLocal.toISOString(),
          dueDateLocalTime: dueDateLocal.getTime(),
          currentDateLocalTime: currentDateLocal.getTime(),
          isPastDue: currentDateLocal > dueDateLocal
        });

        // Compare local dates consistently (both are now in local timezone, date-only)
        if (currentDateLocal > dueDateLocal) {
          console.log('Showing add subtask due date warning modal');
          // Show warning modal instead of proceeding
          setDueDateWarningModal({
            isOpen: true,
            subtask: task || {
              id: '',
              user_id: '',
              course_id: '',
              goal_id: '',
              goal_descr: '',
              task_id: addSubtaskModal?.task?.task_id || '',
              task_title: addSubtaskModal?.task?.task_title || 'Unknown Task',
              task_descr: '',
              task_due_date: taskDueDateStr,
              due_date: taskDueDateStr,
              start_time: '',
              end_time: '',
              subtask_id: '',
              subtask_descr: '',
              subtask_type: '',
              subtask_completed: false,
              task_completed: false,
              progress: 0,
              totalSubtasks: 0,
              completedSubtasks: 0,
              subtasks: [],
              google_calendar_color: '',
              status: null,
              goal_completed: false,
              created_at: '',
              updated_at: '',
              is_conflicting: false // <-- Added field
            },
            targetDate: currentDate,
            targetHour: currentDate.getHours(),
            targetMinute: currentDate.getMinutes()
          });
          return;
        }
      }
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) return alert("Please log in first.");

      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      let payload: any = {
        subtask_descr: newSubtaskDescr.trim(),
        subtask_type: newSubtaskTypeForAdd,
        // Don't send task_due_date - let backend use placeholder row's task_due_date
        bypass_due_date: bypass
      };


      const res = await fetch(`${api}/api/goals/tasks/${addSubtaskModal.task.task_id}/subtasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Failed to create subtask: ${res.status}`);
      }

      // Refresh the goals data to show the new subtask
      const fetchGoals = async () => {
        try {
          const token =
            typeof window !== "undefined" ? localStorage.getItem("token") : null;
          if (!token) return console.warn("No JWT in localStorage");

          const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
          const res = await fetch(`${api}/api/goals/subtasks`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error(`Request failed ${res.status}`);

          const grouped = await res.json() as Record<string, Goal[]>;
          console.log("Fetched goals from backend:", grouped);
          Object.values(grouped).flat().forEach(goal => {
            console.log("Goal:", {
              task_id: goal.task_id,
              subtask_id: goal.subtask_id,
              task_due_date: goal.task_due_date,
              due_date: goal.due_date,
              start_time: goal.start_time,
              end_time: goal.end_time,
              task_title: goal.task_title,
              subtask_descr: goal.subtask_descr,
            });
          });
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

      handleAddSubtaskCancel();
      toast.success("Subtask created successfully");
      setShowBanner(false);

      // Route back to goal detail page if goalId and courseId are available
      if (goalIdForRouting && courseIdForRouting) {
        window.location.href = `http://localhost:3001/courses/${courseIdForRouting}/goals/${goalIdForRouting}`;
      }
    } catch (err) {
      console.error("handleAddSubtaskConfirm error", err);
      toast.error("Failed to create subtask");
    }
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
          const res = await fetch(`${api}/api/goals/subtasks`, {
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
          const res = await fetch(`${api}/api/goals/subtasks`, {
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
        task_due_date: deletedSubtask.task_due_date || deletedSubtask.due_date,
        subtask_start_time: deletedSubtask.start_time,
        subtask_end_time: deletedSubtask.end_time
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
          const res = await fetch(`${api}/api/goals/subtasks`, {
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

  const searchParams = useSearchParams();

  // On mount or when searchParams changes, check for addSubtaskForTask param
  useEffect(() => {
    const taskParam = searchParams.get('addSubtaskForTask');
    const nameParam = searchParams.get('taskName');
    const goalIdParam = searchParams.get('goalId');
    const courseIdParam = searchParams.get('courseId');
    if (taskParam) {
      setPreselectedTaskId(taskParam);
      const dueDateParam = searchParams.get('taskDueDate');
      if (dueDateParam) {
        setNewTaskDueDate(dueDateParam);
        setBannerTaskDueDate(dueDateParam);
        setStoredTaskDueDate(dueDateParam); // Store the due date for later use
      }
      if (nameParam) {
        setNewTaskName(decodeURIComponent(nameParam));
        setBannerTaskName(decodeURIComponent(nameParam));
      }
      // Store goalId and courseId for routing back
      if (goalIdParam) {
        setGoalIdForRouting(goalIdParam);
      }
      if (courseIdParam) {
        setCourseIdForRouting(courseIdParam);
      }
      setShowBanner(true);
      // Remove the params from the URL for clean UX
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('addSubtaskForTask');
        url.searchParams.delete('taskDueDate');
        url.searchParams.delete('taskName');
        url.searchParams.delete('goalId');
        url.searchParams.delete('courseId');
        window.history.replaceState({}, document.title, url.pathname + url.search);
      }
    }
  }, [searchParams]);

  // When the create subtask modal opens, preselect the task if needed
  useEffect(() => {
    if (showCreateSubtaskModal && preselectedTaskId) {
      setSelectedTaskId(preselectedTaskId);
      setPreselectedTaskId(null);
    }
  }, [showCreateSubtaskModal, preselectedTaskId]);

  // When the add subtask modal (from subtasks modal) opens, preselect the task if needed
  useEffect(() => {
    if (addSubtaskModal?.isOpen && preselectedTaskId) {
      setSelectedTaskId(preselectedTaskId);
      setPreselectedTaskId(null);
    }
  }, [addSubtaskModal, preselectedTaskId]);

  // Global keyboard event listener for delete confirmation
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && hoveredTask && hoveredTask.goal_id !== "Google Calendar") {
        event.preventDefault();
        // For subtask events, use subtask deletion modal instead of task deletion
        if (hoveredTask.subtask_id && hoveredTask.subtask_id !== 'placeholder') {
          setDeleteSubtaskModal({
            isOpen: true,
            subtask: hoveredTask,
            position: { x: window.innerWidth / 2, y: window.innerHeight / 2 }
          });
        } else {
          // For task events (without subtask_id), use task deletion modal
          setDeleteModal({
            isOpen: true,
            task: hoveredTask,
            position: { x: window.innerWidth / 2, y: window.innerHeight / 2 }
          });
        }
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
          const res = await fetch(`${api}/api/goals/subtasks`, {
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
          const res = await fetch(`${api}/api/goals/subtasks`, {
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
          const goalsRes = await fetch(`${api}/api/goals/subtasks`, {
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

    // Validate due date against selected goal's due date
    const goal = courseGoals.find(g => g.goal_id === selectedGoalId) || selectedGoal;
    if (goal && goal.due_date) {
      const taskDate = newTaskDueDate.split('T')[0];
      const goalDate = goal.due_date.split('T')[0];
      if (taskDate > goalDate) {
        setNewTaskDueDateError(`Task due date must be on or before: ${formatDate(goal.due_date)}`);
        return;
      }
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const tasksData = [{
        task_title: newTaskName,
        task_descr: newTaskDescription,
        scheduledDate: newTaskDueDate,
        completed: false
      }];
      const res = await fetch(`${api}/api/goals/${selectedGoalId}/save-tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({tasks: tasksData})
      });
      if (!res.ok) throw new Error(`Failed to create task: ${res.status}`);

      // Refresh goals data to show the newly created task
      const fetchGoals = async () => {
        try {
          const goalsRes = await fetch(`${api}/api/goals/subtasks`, {
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



  // Helper function to get course color from courses array
  const getCourseColor = (courseId: string): string => {
    const course = courses.find(c => c.course_id === courseId);
    return course?.color || "#6b7280"; // fallback to gray
  };

  // Helper function to get task color based on task_id
  const getTaskColor = (taskId: string | null): string => {
    // Handle null task_id
    if (!taskId) {
      return "#6b7280"; // fallback to gray
    }

    // Generate a consistent color based on task_id
    const colors = [
      "#3b82f6", // blue
      "#ef4444", // red
      "#10b981", // green
      "#f59e0b", // amber
      "#8b5cf6", // violet
      "#06b6d4", // cyan
      "#f97316", // orange
      "#ec4899", // pink
      "#84cc16", // lime
      "#6366f1", // indigo
      "#14b8a6", // teal
      "#f43f5e", // rose
    ];

    // Use task_id to generate a consistent index
    let hash = 0;
    for (let i = 0; i < taskId.length; i++) {
      const char = taskId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Helper function to get color for events - uses task color for subtasks, course color for Google Calendar events
  const getEventColor = (goal: Goal): string => {
    // For Google Calendar events, use course color
    if (goal.goal_id === 'Google Calendar') {
      return getCourseColor(goal.course_id);
    }
    // For subtask events, use task color
    return getTaskColor(goal.task_id);
  };

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token) return console.warn("No JWT in localStorage");

        const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
        const res = await fetch(`${api}/api/goals/subtasks`, {
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

      if (viewSubtaskModal) {
        const target = event.target as Element;
        if (!target.closest('.subtasks-modal')) {
          closeViewSubtaskModal();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedGoal, goalDisplayPosition, overflowEvents, subtasksModal, viewSubtaskModal]);

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

  /** Return the list of subtasks whose start_time and end_time fall on that calendar day (local time) */
  const getGoalsForDate = (date: Date): Goal[] => {
    // Always check all events, regardless of backend grouping
    const allGoals = Object.values(goalsByDate).flat();
    return allGoals.filter(goal => {
      if (!goal.start_time || !goal.end_time || courseVisibility[goal.course_id] === false) return false;
      // Convert UTC start_time to local time
      const start = new Date(goal.start_time);
      return (
        start.getFullYear() === date.getFullYear() &&
        start.getMonth() === date.getMonth() &&
        start.getDate() === date.getDate()
      );
    });
  };

  // Helper function to group tasks by task_due_date for sidebar
  const groupTasksByTaskDueDate = (goals: Goal[]) => {
    const groupedByTaskDueDate: { [date: string]: Goal[] } = {};

    console.log("=== TASK DUE DATE GROUPING DEBUG ===");
    console.log("Input goals:", goals.length);

    goals
      .filter(goal => goal.goal_id !== "Google Calendar") // Exclude Google Calendar events
      .forEach(goal => {
        let key: string;

        console.log("Processing goal for sidebar:", {
          task_id: goal.task_id,
          subtask_id: goal.subtask_id,
          task_title: goal.task_title,
          subtask_descr: goal.subtask_descr,
          task_due_date: goal.task_due_date,
          due_date: goal.due_date,
          start_time: goal.start_time,
          end_time: goal.end_time,
          goal_id: goal.goal_id
        });

        // For calendar events, use task_due_date if available, otherwise use start_time
        if (goal.start_time && goal.end_time) {
          if (goal.task_due_date) {
            key = getDateKeyFromDateString(goal.task_due_date);
            console.log("  → Calendar event with task_due_date, using task_due_date for key:", key);
          } else {
            key = getLocalDateKey(new Date(goal.start_time));
            console.log("  → Calendar event without task_due_date, using start_time for key:", key);
          }
        }
        // For non-calendar tasks, use task_due_date if available, otherwise fall back to due_date
        else if (goal.task_due_date) {
          key = getDateKeyFromDateString(goal.task_due_date);
          console.log("  → Non-calendar task, using task_due_date for key:", key);
        } else if (goal.due_date) {
          key = getDateKeyFromDateString(goal.due_date);
          console.log("  → Non-calendar task, using due_date for key:", key);
        } else {
          // Fallback to current date if no date is available
          key = getLocalDateKey(new Date());
          console.log("  → No date available, using current date for key:", key);
        }

        if (!groupedByTaskDueDate[key]) {
          groupedByTaskDueDate[key] = [];
        }
        groupedByTaskDueDate[key].push(goal);
        console.log("  → Added to group:", key);
      });

    console.log("Final groupedByTaskDueDate:", groupedByTaskDueDate);
    return groupedByTaskDueDate;
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

    console.log("=== SIDEBAR GROUPING DEBUG ===");
    console.log("filteredGoals:", filteredGoals);
    console.log("Today:", today.toISOString());
    console.log("Week start:", weekStart.toISOString());
    console.log("Week end:", weekEnd.toISOString());

    // Use the new helper function to group by task_due_date
    const filteredGoalsByDate = groupTasksByTaskDueDate(filteredGoals);

    Object.entries(filteredGoalsByDate).forEach(([date, goals]) => {
      const taskDate = new Date(date + 'T00:00:00');

      console.log("Processing date group:", date, "with", goals.length, "goals");
      console.log("  Task date:", taskDate.toISOString());
      console.log("  Goals:", goals.map(g => ({
        task_id: g.task_id,
        subtask_id: g.subtask_id,
        task_title: g.task_title,
        task_completed: g.task_completed
      })));

      // Separate completed tasks
      const completedGoals = goals.filter(goal => goal.task_completed);
      const incompleteGoals = goals.filter(goal => !goal.task_completed);

      console.log("  Completed goals:", completedGoals.length);
      console.log("  Incomplete goals:", incompleteGoals.length);

      if (completedGoals.length > 0) {
        completed[date] = completedGoals;
        console.log("  → Added to completed section");
      }

      if (incompleteGoals.length > 0) {
        if (taskDate < today) {
          overdue[date] = incompleteGoals;
          console.log("  → Added to overdue section");
        } else if (taskDate >= today && taskDate <= weekEnd) {
          upcoming[date] = incompleteGoals;
          console.log("  → Added to upcoming section");
        } else {
          future[date] = incompleteGoals;
          console.log("  → Added to future section");
        }
      }
    });

    console.log("Final categorization:");
    console.log("  Overdue:", Object.keys(overdue));
    console.log("  Upcoming:", Object.keys(upcoming));
    console.log("  Future:", Object.keys(future));
    console.log("  Completed:", Object.keys(completed));

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
                              style={{ backgroundColor: getTaskColor(group.taskId) }}
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
            getEventColor={getEventColor}
            handleSubtaskDragStart={handleSubtaskDragStart}
            handleSubtaskDragEnd={handleSubtaskDragEnd}
            handleTimeSlotDragOver={handleTimeSlotDragOver}
            handleTimeSlotDragLeave={handleTimeSlotDragLeave}
            handleTimeSlotDrop={handleTimeSlotDrop}
            isDraggingTask={isDraggingTask}
            dragOverDate={dragOverDate}
            dragTargetHour={dragTargetHour}
            dragTargetMinute={dragTargetMinute}
            dragTargetDate={dragTargetDate}
            onDayClick={handleDayClick}
            onTaskHover={handleTaskHover}
            onTaskMouseLeave={handleTaskMouseLeave}
            handleTimeSlotMouseDown={handleTimeSlotMouseDown}
            handleTimeSlotMouseMove={handleTimeSlotMouseMove}
            handleTimeSlotMouseUp={handleTimeSlotMouseUp}
            dragPreview={dragPreview}
            draggedTask={draggedTask}
            highlightSubtaskId={highlightSubtaskId}
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
            getEventColor={getEventColor}
            handleSubtaskDragStart={handleSubtaskDragStart}
            handleSubtaskDragEnd={handleSubtaskDragEnd}
            handleTimeSlotDragOver={handleTimeSlotDragOver}
            handleTimeSlotDragLeave={handleTimeSlotDragLeave}
            handleTimeSlotDrop={handleTimeSlotDrop}
            isDraggingTask={isDraggingTask}
            dragOverDate={dragOverDate}
            dragTargetHour={dragTargetHour}
            dragTargetMinute={dragTargetMinute}
            dragTargetDate={dragTargetDate}
            onDayClick={handleDayClick}
            onTaskHover={handleTaskHover}
            onTaskMouseLeave={handleTaskMouseLeave}
            handleTimeSlotMouseDown={handleTimeSlotMouseDown}
            handleTimeSlotMouseMove={handleTimeSlotMouseMove}
            handleTimeSlotMouseUp={handleTimeSlotMouseUp}
            dragPreview={dragPreview}
            draggedTask={draggedTask}
            highlightSubtaskId={highlightSubtaskId}
          />
        ) : currentView === "month" ? (
          <MonthView
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            getGoalsForDate={getGoalsForDate}
            handleGoalClick={handleGoalClick}
            handleOverflowClick={handleOverflowClick}
            getCourseColor={getCourseColor}
            getEventColor={getEventColor}
            handleSubtaskDragStart={handleSubtaskDragStart}
            handleSubtaskDragEnd={handleSubtaskDragEnd}
            handleTimeSlotDragOver={handleTimeSlotDragOver}
            handleTimeSlotDragLeave={handleTimeSlotDragLeave}
            handleTimeSlotDrop={handleTimeSlotDrop}
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
                    {selectedGoal.goal_id !== "Google Calendar" ? "View Task" : "Google Calendar Event"}
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
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: getEventColor(selectedGoal) }}></div>
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
                    className={`flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-grab active:cursor-grabbing transition-colors ${isDraggingTask ? 'opacity-50' : ''
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
                    onDragStart={(e) => handleSubtaskDragStart(e, event)}
                    onDragEnd={(e) => handleSubtaskDragEnd(e)}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getEventColor(event) }}
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
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-[#18181b] mb-2">Settings</h2>
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
                      // Optionally restrict calendar selection
                      max={selectedGoal?.due_date ? selectedGoal.due_date.split('T')[0] : undefined}
                    />
                    {newTaskDueDateError && (
                      <p className="mt-1 text-sm text-red-600">{newTaskDueDateError}</p>
                    )}
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
                      userCourses
                        .filter(course => course.title !== 'Google Calendar' && course.id !== 'Google Calendar')
                        .map((course) => (
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
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: getEventColor(subtasksModal.task) }}></div>
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
                        {/* Warning icon if is_conflicting, now to the left of the trash icon */}
                        {currentSubtask.is_conflicting === true && (
                          <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ minWidth: '24px' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                        )}
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
                      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: getEventColor(deleteModal.task) }}></div>
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
                      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: getEventColor(deleteSubtaskModal.subtask) }}></div>
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

      {/* Add Subtask Modal */}
      {addSubtaskModal?.isOpen && addSubtaskModal?.task && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Plus className="w-4 h-4 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Add Subtask</h2>
                </div>
                <button
                  onClick={handleAddSubtaskCancel}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Task Info */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: getEventColor(addSubtaskModal.task) }}></div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{addSubtaskModal.task.task_title}</h3>
                      <p className="text-sm text-gray-600">Adding subtask to this task</p>
                    </div>
                  </div>
                </div>

                {/* Subtask Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subtask Description *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter subtask description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newSubtaskDescr}
                    onChange={e => setNewSubtaskDescr(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* Subtask Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={newSubtaskTypeForAdd}
                    onChange={e => setNewSubtaskTypeForAdd(e.target.value)}
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

                {/* Estimated Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Time (minutes)
                  </label>
                  <input
                    type="number"
                    value={newSubtaskTime}
                    onChange={e => setNewSubtaskTime(parseInt(e.target.value) || 15)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="5"
                    max="120"
                  />
                </div>

                {/* Footer */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleAddSubtaskCancel}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAddSubtaskConfirm()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Subtask
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Undo Toast */}
      {showUndoToast && deletedTask && (
        <div className="fixed top-6 right-6 bg-white border border-gray-200 rounded-lg shadow-lg z-[2147483647] max-w-sm">
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
        <div className="fixed top-6 right-6 bg-white border border-gray-200 rounded-lg shadow-lg z-[2147483647] max-w-sm">
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

      {/* View Subtask Modal */}
      {viewSubtaskModal?.isOpen && viewSubtaskModal?.subtask && (
        <>
          {/* Backdrop for click-outside-to-close */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={closeViewSubtaskModal}
          />
          <div
            className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg subtasks-modal"
            style={{
              left: Math.max(10, viewSubtaskModal.position.x),
              top: Math.max(10, viewSubtaskModal.position.y),
              width: '400px',
              maxHeight: '500px',
              minWidth: '320px',
              minHeight: '200px',
            }}
            onMouseDown={(e) => {
              // Prevent backdrop click when clicking on modal
              e.stopPropagation();
            }}
          >
            <Card className="border-0 shadow-none h-full">
              <CardHeader className="pb-3">
                <div
                  className="flex items-center justify-between cursor-move"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsSubtasksModalDragging(true);
                    const rect = e.currentTarget.getBoundingClientRect();
                    setSubtasksModalDragOffset({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top
                    });
                  }}
                  style={{ cursor: isSubtasksModalDragging ? 'grabbing' : 'grab' }}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <CardTitle className="text-lg truncate">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${calculateSubtaskStatus(viewSubtaskModal.subtask) === "Completed"
                        ? "bg-green-100 text-green-800"
                        : calculateSubtaskStatus(viewSubtaskModal.subtask) === "Overdue"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                        }`}>
                        {calculateSubtaskStatus(viewSubtaskModal.subtask)}
                      </span>
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleEditSubtask}
                      className="text-blue-500 hover:text-blue-700 transition-colors flex-shrink-0 p-1 hover:bg-blue-50 rounded"
                      title="Edit subtask"
                      style={{ cursor: 'pointer' }}
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={closeViewSubtaskModal}
                      className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 p-1 hover:bg-gray-100 rounded"
                      style={{ cursor: 'pointer' }}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{viewSubtaskModal.subtask.subtask_descr}</h4>
                      <p className="text-sm text-gray-600">{getSubtaskTypeDisplay(viewSubtaskModal.subtask.subtask_type || 'other')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Time: {formatEventTime(viewSubtaskModal.subtask.start_time!, viewSubtaskModal.subtask.end_time!)}</p>
                    </div>
                    {/* Conflict warning message */}
                    {viewSubtaskModal.subtask.is_conflicting === true && (
                      <div className="flex flex-col gap-2 mt-2">
                        <div className="flex items-center gap-2 text-yellow-800 bg-yellow-100 rounded px-2 py-1 text-xs font-medium">
                          <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                          Conflicts with Task Due Date {(() => {
                            const due = viewSubtaskModal.subtask.task_due_date || viewSubtaskModal.subtask.due_date;
                            if (!due) return '';
                            // Use the same logic as formatDate, but format as 'Tue, Jul 15'
                            const [year, month, day] = due.split('T')[0].split('-');
                            const date = new Date(Number(year), Number(month) - 1, Number(day));
                            return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                          })()}
                        </div>
                        <div className="flex gap-2 mt-1">
                          <button
                            className="px-3 py-1 rounded bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200 transition-colors"
                            onClick={() => {
                              if (viewSubtaskModal.subtask) {
                                // Find all subtasks for this task
                                const allGoals = Object.values(goalsByDate).flat();
                                const taskSubtasks = allGoals.filter((g: any) => g.task_id === viewSubtaskModal.subtask!.task_id);
                                setRescheduleTaskSubtasks(taskSubtasks);
                                const minDueDate = taskSubtasks.length > 0
                                  ? new Date(Math.max(...taskSubtasks.map((sub: any) => sub.end_time ? new Date(sub.end_time).getTime() : 0))).toISOString().split('T')[0]
                                  : undefined;
                                let initialDueDate = (viewSubtaskModal.subtask!.task_due_date || viewSubtaskModal.subtask!.due_date || '').split('T')[0];
                                if (minDueDate && (!initialDueDate || initialDueDate < minDueDate)) {
                                  initialDueDate = minDueDate;
                                }
                                setRescheduleTaskDueDate(initialDueDate);
                                setShowRescheduleTaskModal(true);
                              }
                            }}
                          >
                            Change Task Due Date
                          </button>
                          <button
                            className="px-3 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold hover:bg-green-200 transition-colors"
                            onClick={() => {
                              setViewSubtaskModal(null);
                              if (viewSubtaskModal.subtask) {
                                setHighlightSubtaskId(viewSubtaskModal.subtask.subtask_id);
                                setTimeout(() => setHighlightSubtaskId(null), 3000);
                              }
                            }}
                          >
                            Reschedule Subtask
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      {viewSubtaskModal.subtask.task_title}: {viewSubtaskModal.subtask.goal_descr}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Due Date Warning Modal */}
      {dueDateWarningModal?.isOpen && dueDateWarningModal?.subtask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 999999 }}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Past Due Date Warning</h2>
                </div>
                <button
                  onClick={handleDueDateWarningCancel}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {dueDateWarningModal.subtask.subtask_descr}
                  </p>
                  <p className="text-xs text-gray-600">
                    Task: {dueDateWarningModal.subtask.task_title}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Task due date:</span>
                    <span className="text-sm text-gray-900">
                      {dueDateWarningModal.subtask.task_due_date || dueDateWarningModal.subtask.due_date
                        ? (() => {
                          const dueDateUTC = new Date(dueDateWarningModal.subtask.task_due_date || dueDateWarningModal.subtask.due_date!);
                          const dueDateLocal = new Date(
                            dueDateUTC.getUTCFullYear(),
                            dueDateUTC.getUTCMonth(),
                            dueDateUTC.getUTCDate()
                          );
                          return dueDateLocal.toLocaleDateString();
                        })()
                        : 'Not set'
                      }
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Target date:</span>
                    <span className="text-sm text-gray-900">
                      {dueDateWarningModal.targetDate?.toLocaleDateString()} at {(() => {
                        const hour = dueDateWarningModal.targetHour || 0;
                        const minute = dueDateWarningModal.targetMinute || 0;
                        const period = hour >= 12 ? 'PM' : 'AM';
                        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                        return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
                      })()}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex gap-3">
                    <button
                      onClick={handleDueDateWarningCancel}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDueDateWarningConfirm}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      Continue Anyway
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Subtask Modal (Drag-to-Create) */}
      {showCreateSubtaskModal && (
        <>
          {/* Backdrop for click-outside-to-close */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={handleCreateSubtaskCancel}
          />
          <div
            className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg create-subtask-modal"
            style={{
              left: Math.max(10, createSubtaskModalPosition.x),
              top: Math.max(10, createSubtaskModalPosition.y),
              width: '400px',
              maxHeight: '500px',
              minWidth: '320px',
              minHeight: '400px',
            }}
            onMouseDown={(e) => {
              // Prevent backdrop click when clicking on modal
              e.stopPropagation();
            }}
          >
            <Card className="border-0 shadow-none h-full">
              <CardHeader className="pb-3">
                <div
                  className="flex items-center justify-between cursor-move"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsSubtasksModalDragging(true);
                    const rect = e.currentTarget.getBoundingClientRect();
                    setSubtasksModalDragOffset({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top
                    });
                  }}
                  style={{ cursor: isSubtasksModalDragging ? 'grabbing' : 'grab' }}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <CardTitle className="text-lg truncate">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Plus className="w-4 h-4 text-blue-600" />
                        </div>
                        <span>Create Subtask</span>
                      </div>
                    </CardTitle>
                  </div>
                  <button
                    onClick={handleCreateSubtaskCancel}
                    className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 p-1 hover:bg-gray-100 rounded"
                    style={{ cursor: 'pointer' }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                <div className="space-y-4">
                  {/* Time Range - Simplified */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-900">Time Range</h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          value={(() => {
                            if (!createSubtaskStart) return '';
                            const d = new Date(createSubtaskStart.date);
                            return d.toISOString().split('T')[0];
                          })()}
                          onChange={e => {
                            const val = e.target.value;
                            if (!val) return;
                            // Set as local midnight to avoid timezone issues
                            const d = new Date(val + 'T00:00:00');
                            setCreateSubtaskStart(prev => prev ? { ...prev, date: d } : { date: d, hour: 9, minute: 0 });
                            setCreateSubtaskEnd(prev => prev ? { ...prev, date: d } : { date: d, hour: 10, minute: 0 });
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
                          <input
                            type="time"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            value={(() => {
                              if (!createSubtaskStart) return '';
                              return `${createSubtaskStart.hour.toString().padStart(2, '0')}:${createSubtaskStart.minute.toString().padStart(2, '0')}`;
                            })()}
                            onChange={e => {
                              const val = e.target.value;
                              if (!val) return;
                              const [hours, minutes] = val.split(':').map(Number);
                              setCreateSubtaskStart(prev => prev ? { ...prev, hour: hours, minute: minutes } : { date: new Date(), hour: hours, minute: minutes });
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">End Time</label>
                          <input
                            type="time"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            value={(() => {
                              if (!createSubtaskEnd) return '';
                              return `${createSubtaskEnd.hour.toString().padStart(2, '0')}:${createSubtaskEnd.minute.toString().padStart(2, '0')}`;
                            })()}
                            onChange={e => {
                              const val = e.target.value;
                              if (!val) return;
                              const [hours, minutes] = val.split(':').map(Number);
                              setCreateSubtaskEnd(prev => prev ? { ...prev, hour: hours, minute: minutes } : { date: new Date(), hour: hours, minute: minutes });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Task Selection */}
                  <div className="space-y-3 pt-3 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900">Task Details</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Task *</label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          value={selectedTaskId}
                          onChange={e => setSelectedTaskId(e.target.value)}
                        >
                          <option value="">Select a task</option>
                          {Object.entries(availableTasks).map(([title, id]) => (
                            <option key={id} value={id}>{title}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Subtask Description *</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          value={newSubtaskDescription}
                          onChange={e => setNewSubtaskDescription(e.target.value)}
                          placeholder="Enter subtask description"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                        <select
                          value={newSubtaskTypeForCreate}
                          onChange={e => setNewSubtaskTypeForCreate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          <option value="reading">Reading</option>
                          <option value="flashcard">Flashcard</option>
                          <option value="quiz">Quiz</option>
                          <option value="practice">Practice</option>
                          <option value="review">Review</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={handleCreateSubtaskCancel}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleCreateSubtaskConfirm()}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Create
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
      {showBanner && bannerTaskName && bannerTaskDueDate && (
        <div className="fixed left-1/2 top-8 transform -translate-x-1/2 flex justify-center items-center gap-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in" style={{ minWidth: 320, maxWidth: 480 }}>
          <span>
            Schedule a subtask for "<span className='font-semibold'>{bannerTaskName}</span>" (due <span className='font-semibold'>{formatDate(bannerTaskDueDate)}</span>)
          </span>
          <button
            onClick={() => setShowBanner(false)}
            className="ml-2 text-white hover:text-blue-200 focus:outline-none"
            aria-label="Close notification"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {showEditSubtaskModal && editSubtaskData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Pencil className="w-4 h-4 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Editing: {editSubtaskData.subtask_descr}</h2>
                </div>
                <button
                  onClick={handleEditSubtaskCancel}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                {/* Subtask Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subtask Description *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter subtask description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={editSubtaskData.subtask_descr}
                    onChange={e => setEditSubtaskData((prev: any) => ({ ...prev, subtask_descr: e.target.value }))}
                    autoFocus
                  />
                </div>
                {/* Subtask Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={editSubtaskData.subtask_type}
                    onChange={e => setEditSubtaskData((prev: any) => ({ ...prev, subtask_type: e.target.value }))}
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
                {/* Date and Time Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={editSubtaskData.startDate.toISOString().split('T')[0]}
                      onChange={e => {
                        const d = new Date(e.target.value + 'T00:00:00');
                        setEditSubtaskData((prev: any) => ({ ...prev, startDate: d, endDate: d }));
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                      <input
                        type="time"
                        className="w-36 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={`${String(editSubtaskData.startHour).padStart(2, '0')}:${String(editSubtaskData.startMinute).padStart(2, '0')}`}
                        onChange={e => {
                          const [h, m] = e.target.value.split(':').map(Number);
                          setEditSubtaskData((prev: any) => ({ ...prev, startHour: h, startMinute: m }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                      <input
                        type="time"
                        className="w-36 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={`${String(editSubtaskData.endHour).padStart(2, '0')}:${String(editSubtaskData.endMinute).padStart(2, '0')}`}
                        onChange={e => {
                          const [h, m] = e.target.value.split(':').map(Number);
                          setEditSubtaskData((prev: any) => ({ ...prev, endHour: h, endMinute: m }));
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              {/* Footer */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 mt-6">
                <button
                  onClick={handleEditSubtaskCancel}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleEditSubtaskSave()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Reschedule Task Modal */}
      {showRescheduleTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Reschedule Task</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={rescheduleTaskDueDate}
                  min={minDueDate}
                  onChange={e => setRescheduleTaskDueDate(e.target.value)}
                />
              </div>
              {minDueDate && rescheduleTaskDueDate && rescheduleTaskDueDate < minDueDate && (
                <div className="text-xs text-red-600 mt-1">Due date cannot be before the latest subtask end time.</div>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Subtasks</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {rescheduleTaskSubtasks.map((sub, idx) => (
                    <div key={sub.subtask_id || idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{sub.subtask_descr || `Subtask ${idx + 1}`}</div>
                        <div className="text-xs text-gray-600">
                          {sub.start_time && sub.end_time ?
                            `${new Date(sub.start_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} - ${new Date(sub.end_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`
                            : 'No time scheduled'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setShowRescheduleTaskModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  type="button"
                  disabled={!!(minDueDate && rescheduleTaskDueDate && rescheduleTaskDueDate < minDueDate)}
                  onClick={handleRescheduleTaskSave}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showSettings && (
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-8 relative">
            <button
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setShowSettings(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-semibold mb-6 text-center">Settings</h2>
            <Tabs defaultValue="calendar" className="w-full">
              <TabsList className="w-full flex justify-center mb-6">
                <TabsTrigger value="calendar" className="text-lg">Calendar Integrations</TabsTrigger>
              </TabsList>
              <TabsContent value="calendar">
                <div className="flex flex-col items-center gap-6">
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg w-full max-w-md">
                    <img src="/google-calendar-icon.svg" alt="Google Calendar" className="w-10 h-10" />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">Google Calendar</div>
                      <div className="text-sm text-gray-600">Sync your events and tasks with Google Calendar.</div>
                    </div>
                    <Button onClick={handleConnectCalendar} className="bg-blue-600 text-white hover:bg-blue-700">Connect</Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  )
}

