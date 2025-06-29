"use client"

import { useEffect, useRef, useState } from "react"
import {
  ChevronRight,
  Calendar,
  Settings,
  X,
  ChevronDown,
  GripVertical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import useAuthRedirect from "@/hooks/useAuthRedirect"

import { DayView } from "./components/DayView"
import { WeekView } from "./components/WeekView"
import { MonthView } from "./components/MonthView"
import { YearView } from "./components/YearView"
import { colorForCourse } from "./utils/color.utils" 
import { calculateStatus, getStatusColor } from "./utils/goal.status"
import { groupTasksByTaskId } from "./utils/goal.progress"
import { Goal, GoalsByDate } from "./utils/goal.types"
import { startOfToday, getWeekDates, formatHourLabel, getLocalDateKey } from "./utils/date.utils"

export function CalendarScheduler() {
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

  /** Hours array for timeline */
  const hours = Array.from({ length: 24 }, (_, i) => i) // 12 AM (0) to 11 PM (23)

  /** Expanded accordion panels for upcoming-tasks list  */
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({
    [startOfToday().toISOString().split("T")[0]]: true,
  })

  /** Helpers */
  const weekDates = getWeekDates(currentDate) // Sunday‑based week

  const toggleDayExpansion = (dateStr: string) =>
    setExpandedDays((prev) => ({ ...prev, [dateStr]: !prev[dateStr] }))

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
        const updatedSubtasks = prev.subtasks?.map(subtask => 
          subtask.subtask_id === sub.subtask_id ? { ...subtask, subtask_completed: !subtask.subtask_completed } : subtask
        ) || [];
        
        // Recalculate progress
        const completedSubtasks = updatedSubtasks.filter(s => s.subtask_completed).length;
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
      
      // Also optimistically update the main goals data
      setGoalsByDate((prev) => {
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
          const goalsRes = await fetch(`${api}/api/goals/user`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!goalsRes.ok) throw new Error(`Request failed ${goalsRes.status}`);

          const raw: GoalsByDate = await goalsRes.json();
          const all: Goal[] = Object.values(raw).flat();

          const grouped: GoalsByDate = {};
          for (const g of all) {
            const when = new Date(g.start_time ?? g.due_date!);
            const key = getLocalDateKey(when);
            (grouped[key] ??= []).push(g);
          }

          // Sort tasks within each date group for consistent positioning
          Object.keys(grouped).forEach(dateKey => {
            grouped[dateKey].sort((a, b) => {
              // First sort by task_id to keep tasks together
              if (a.task_id !== b.task_id) {
                return (a.task_id || '').localeCompare(b.task_id || '');
              }
              // Then sort by subtask_id for consistent subtask order
              return (a.subtask_id || '').localeCompare(b.subtask_id || '');
            });
          });

          setGoalsByDate(grouped);

          const ordered: GoalsByDate = Object.entries(grouped)
            .sort(([a], [b]) => +new Date(a) - +new Date(b))
            .reduce((acc, [k, v]) => ((acc[k] = v), acc), {} as GoalsByDate);
          setSortedGoalsByDate(ordered);
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

          const raw: GoalsByDate = await goalsRes.json();
          const all: Goal[] = Object.values(raw).flat();

          const grouped: GoalsByDate = {};
          for (const g of all) {
            const when = new Date(g.start_time ?? g.due_date!);
            const key = getLocalDateKey(when);
            (grouped[key] ??= []).push(g);
          }

          // Sort tasks within each date group for consistent positioning
          Object.keys(grouped).forEach(dateKey => {
            grouped[dateKey].sort((a, b) => {
              // First sort by task_id to keep tasks together
              if (a.task_id !== b.task_id) {
                return (a.task_id || '').localeCompare(b.task_id || '');
              }
              // Then sort by subtask_id for consistent subtask order
              return (a.subtask_id || '').localeCompare(b.subtask_id || '');
            });
          });

          setGoalsByDate(grouped);

          const ordered: GoalsByDate = Object.entries(grouped)
            .sort(([a], [b]) => +new Date(a) - +new Date(b))
            .reduce((acc, [k, v]) => ((acc[k] = v), acc), {} as GoalsByDate);
          setSortedGoalsByDate(ordered);
        } catch (err) {
          console.error("fetchGoals error", err);
        }
      };
      
      // Refresh the goals data
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

  const [goalsByDate, setGoalsByDate] = useState<GoalsByDate>({});
  const [sortedGoalsByDate, setSortedGoalsByDate] = useState<GoalsByDate>({});

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

        // 1️⃣ flatten everything we got from the server
        const raw: GoalsByDate = await res.json();
        const all: Goal[] = Object.values(raw).flat();

        // 2️⃣ regroup by *local* YYYY-MM-DD
        const grouped: GoalsByDate = {};
        for (const g of all) {
          // Convert UTC time to local time for grouping
          const when = new Date(g.start_time ?? g.due_date!);
          const key = getLocalDateKey(when);
          (grouped[key] ??= []).push(g);
        }

        // 3️⃣ Sort tasks within each date group for consistent positioning
        Object.keys(grouped).forEach(dateKey => {
          grouped[dateKey].sort((a, b) => {
            // First sort by task_id to keep tasks together
            if (a.task_id !== b.task_id) {
              return (a.task_id || '').localeCompare(b.task_id || '');
            }
            // Then sort by subtask_id for consistent subtask order
            return (a.subtask_id || '').localeCompare(b.subtask_id || '');
          });
        });

        setGoalsByDate(grouped);

        // 4️⃣ optional chronological copy you already had
        const ordered: GoalsByDate = Object.entries(grouped)
          .sort(([a], [b]) => +new Date(a) - +new Date(b))
          .reduce((acc, [k, v]) => ((acc[k] = v), acc), {} as GoalsByDate);
        setSortedGoalsByDate(ordered);
      } catch (err) {
        console.error("fetchGoals error", err);
      }
    };

    fetchGoals();
  }, []);

  // Handle clicking outside to close floating goal display
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
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedGoal, goalDisplayPosition, overflowEvents]);

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
  /** Return the list of goals whose due-date === that calendar day */
  const getGoalsForDate = (date: Date): Goal[] => {
    const key = getLocalDateKey(date);
    return goalsByDate[key] ?? [];
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
      <div className="flex-1 pt-20 flex flex-col overflow-hidden">
        <div className="flex items-center gap-4">
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
          />
        ) : currentView === "month" ? (
          <MonthView 
            currentDate={currentDate} 
            setCurrentDate={setCurrentDate} 
            getGoalsForDate={getGoalsForDate} 
            handleGoalClick={handleGoalClick} 
            handleOverflowClick={handleOverflowClick}
          />
        ) : (
          <YearView 
            currentDate={currentDate} 
            setCurrentDate={setCurrentDate} 
          />
        )}
      </div>

      {/* Right Sidebar */}
      <div className="w-80 bg-[#ffffff] border-l border-[#e5e8eb] p-6 pt-20 overflow-y-auto">
        {/* Add Task Button */}
        <div className="mb-6">
          <Button
            onClick={() => setShowAddTask(true)}
            className="w-full bg-[#0a80ed] hover:bg-[#0369a1] text-white font-medium py-3"
          >
            + Add Task
          </Button>
        </div>
        { /* Dropdown Toggle */}
        <div className="mb-6">
          <Select value={sidebarTab} onValueChange={(val) => setSidebarTab(val as "courses" | "tasks")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a tab" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tasks">Current Tasks</SelectItem>
              <SelectItem value="courses">My Courses</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {sidebarTab === "tasks" ? (
          <>
            {/* Upcoming Tasks list */}
            <div className="space-y-4">
              {
                Object.entries(sortedGoalsByDate).map(([date, goals]) => {
                  const groupedTasks = groupTasksByTaskId(goals);
                  const isExpanded = expandedDays[date] || false;
                  const currentDate = new Date();
                  const taskDate = new Date(date + 'T00:00:00');
                  const isPastDue = taskDate < currentDate && taskDate.toDateString() !== currentDate.toDateString();
                  
                  return (
                    <div key={date} className="border border-[#e5e8eb] rounded-lg">
                      <div 
                        className="p-4 cursor-pointer hover:bg-[#f8f9fa] transition-colors"
                        onClick={() => toggleDayExpansion(date)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className={`font-medium ${isPastDue ? 'text-red-600' : 'text-[#18181b]'}`}>
                              {taskDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                            </div>
                            <div className={`text-sm ${isPastDue ? 'text-red-500' : 'text-[#71717a]'}`}>
                              {Object.keys(groupedTasks).length} task{Object.keys(groupedTasks).length !== 1 ? "s" : ""}
                            </div>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="px-4 pt-4 pb-4 space-y-2 border-t border-[#e5e8eb]">
                          {Object.values(groupedTasks).map((group, index) => (
                            <div 
                              key={index} 
                              className="flex items-start gap-3 p-3 rounded-lg bg-[#f8f9fa] hover:bg-[#f0f0f0]"
                            >
                              <div 
                                className="w-3 h-3 rounded-full mt-1 flex-shrink-0" 
                                style={{ backgroundColor: colorForCourse(group.courseId, group.googleCalendarColor) }}
                              />
                              <div 
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={(e) => {
                                  // Create a complete goal object with all grouped task information
                                  const representativeGoal = {
                                    ...group.subtasks[0], // Use first subtask as base
                                    task_title: group.taskTitle,
                                    task_descr: group.taskDescr,
                                    start_time: group.startTime,
                                    end_time: group.endTime,
                                    course_id: group.courseId,
                                    google_calendar_color: group.googleCalendarColor,
                                    // Add progress information
                                    progress: group.progress,
                                    totalSubtasks: group.totalSubtasks,
                                    completedSubtasks: group.completedSubtasks,
                                    subtasks: group.subtasks,
                                    // Calculate status
                                    status: calculateStatus(group.subtasks[0])
                                  };
                                  handleGoalClick(representativeGoal, e);
                                }}
                              >
                                <div className="text-sm font-medium text-[#18181b] truncate">
                                  {group.taskTitle || "(untitled)"}
                                </div>
                                {group.taskDescr && (
                                  <div className="text-xs text-[#71717a] truncate mt-1">
                                    {group.taskDescr}
                                  </div>
                                )}
                              </div>
                              {/* Task Toggle Button */}
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
                                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                                  group.subtasks[0].task_completed 
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
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              }
            </div>
          </>
        ) : (
          <>
            {/* My Courses list */}
            {/* <h2 className="text-xl font-semibold mb-4 text-[#18181b]">My Courses</h2>
            <div className="space-y-4">
              {courses.map((course) => (
                <div key={course.id} className="flex items-center justify-between p-3 rounded-lg bg-[#f8f9fa]">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: course.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#18181b] truncate">{course.name}</div>
                    </div>
                    <Switch checked={courseVisibility[course.id]} onCheckedChange={() => toggleCourseVisibility(course.id)} className="ml-2" />
                  </div>
                  <Button variant="ghost" size="sm" className="ml-2 text-[#71717a] hover:text-[#18181b] p-1" onClick={() => { setSelectedCourse(course); setShowCourseTasksDialog(true); }}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div> */}
          </>
        )}
      </div>


      {/* Floating Goal Display */}
      {selectedGoal && goalDisplayPosition && (
        <div 
          className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg floating-goal-display"
          style={{
            left: Math.max(10, goalDisplayPosition.x - 320),
            top: Math.max(10, goalDisplayPosition.y - 200),
            maxWidth: Math.min(320, window.innerWidth - 20),
            maxHeight: Math.min(400, window.innerHeight - 20),
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
                    {selectedGoal.goal_id === "Google Calendar" ? "Google Calendar Event" : "Task Details"}
                  </CardTitle>
                </div>
                <button
                  onClick={() => {
                    setSelectedGoal(null)
                    setGoalDisplayPosition(null)
                    setExpandedTaskId(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-2 p-1 hover:bg-gray-100 rounded"
                  style={{ cursor: 'pointer' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto" style={{ 
              maxHeight: `${Math.min(280, window.innerHeight - 160)}px` // Responsive max height for overflow modal
            }}>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: colorForCourse(selectedGoal.course_id, selectedGoal.google_calendar_color) }}></div>
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
                  // Regular Task Display
                  <div className="space-y-3">
                    {selectedGoal.goal_descr && (
                      <div>
                        <span className="text-[#71717a] text-sm">Goal Description:</span>
                        <p className="mt-1 text-sm text-[#18181b] break-words">{selectedGoal.goal_descr}</p>
                      </div>
                    )}
                    {selectedGoal.task_descr && (
                      <div>
                        <span className="text-[#71717a] text-sm">Task Description:</span>
                        <p className="mt-1 text-sm text-[#18181b] break-words">{selectedGoal.task_descr}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span>Task Status:</span>
                      <span className={`font-medium ${getStatusColor(calculateStatus(selectedGoal))}`}>
                        {calculateStatus(selectedGoal)}
                      </span>
                    </div>
                    {/* Show subtask progress for grouped tasks */}
                    {selectedGoal.totalSubtasks && selectedGoal.totalSubtasks > 1 && (
                      <div>
                        <span className="text-[#71717a] text-sm">Progress:</span>
                        <div className="mt-1 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Subtasks completed:</span>
                            <span className="font-medium">{selectedGoal.completedSubtasks || 0}/{selectedGoal.totalSubtasks}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${selectedGoal.progress || 0}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-[#71717a] text-center">
                            {selectedGoal.progress || 0}% complete
                          </div>
                        </div>
                        
                        {/* Subtasks List */}
                        <div className="mt-3">
                          <button
                            onClick={() => setExpandedTaskId(expandedTaskId === selectedGoal.task_id ? null : selectedGoal.task_id)}
                            className="flex items-center gap-2 text-sm text-[#0a80ed] hover:text-[#0369a1] transition-colors"
                          >
                            {expandedTaskId === selectedGoal.task_id ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            View Subtasks ({selectedGoal.totalSubtasks})
                          </button>
                          
                          {expandedTaskId === selectedGoal.task_id && (
                            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                              {selectedGoal.subtasks?.map((subtask, index) => (
                                <div
                                  key={subtask.subtask_id || index}
                                  className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs cursor-pointer hover:bg-gray-100 transition-colors"
                                  onClick={() => handleSubtaskToggle(subtask)}
                                >
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    subtask.subtask_completed ? 'bg-green-500' : 'bg-gray-300'
                                  }`} />
                                  <span className={`flex-1 ${
                                    subtask.subtask_completed ? 'line-through text-gray-500' : 'text-gray-700'
                                  }`}>
                                    {subtask.subtask_descr || `Subtask ${index + 1}`}
                                  </span>
                                  {subtask.subtask_type && subtask.subtask_type !== 'other' && (
                                    <span className="text-xs px-1 py-0.5 bg-gray-200 rounded text-gray-600">
                                      {subtask.subtask_type}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {selectedGoal.updated_at && selectedGoal.due_date && (
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-[#71717a]">Assigned:</span>
                          <span className="ml-2 font-medium break-words">
                            {new Date(selectedGoal.updated_at).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#71717a]">Due:</span>
                          <span className="ml-2 font-medium break-words">
                            {new Date(selectedGoal.due_date).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
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
                    All Events - {overflowEvents.day.toLocaleDateString()}
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
                    className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={(e) => {
                      handleGoalClick(event, e)
                      setOverflowEvents(null)
                    }}
                  >
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: colorForCourse(event.course_id, event.google_calendar_color) }}
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

      {/* Add/Edit Task Dialog */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="border-b border-[#e5e8eb] pb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#0a80ed] rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">C</span>
              </div>
              <DialogTitle className="text-lg font-semibold">CourseHelper</DialogTitle>
            </div>
          </DialogHeader>

          <div className="py-6">
            <h2 className="text-xl font-semibold mb-6">Add/Edit Task</h2>

            <div className="space-y-6">
              <div>
                <Label htmlFor="title" className="text-sm font-medium text-[#18181b] mb-2 block">
                  Title
                </Label>
                <Input
                  id="title"
                  placeholder="Enter task title"
                  className="w-full h-11 border-[#e5e8eb] focus:border-[#0a80ed] focus:ring-[#0a80ed]"
                />
              </div>

              <div>
                <Label htmlFor="deadline" className="text-sm font-medium text-[#18181b] mb-2 block">
                  Deadline
                </Label>
                <div className="relative">
                  <Input
                    id="deadline"
                    type="date"
                    className="w-full h-11 border-[#e5e8eb] focus:border-[#0a80ed] focus:ring-[#0a80ed]"
                  />
                  <Calendar className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-[#71717a] pointer-events-none" />
                </div>
              </div>

              <div>
                <Label htmlFor="priority" className="text-sm font-medium text-[#18181b] mb-2 block">
                  Priority
                </Label>
                <Select>
                  <SelectTrigger className="w-full h-11 border-[#e5e8eb] focus:border-[#0a80ed] focus:ring-[#0a80ed]">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Low
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        Medium
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        High
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="course" className="text-sm font-medium text-[#18181b] mb-2 block">
                  Course
                </Label>
                <Select>
                  <SelectTrigger className="w-full h-11 border-[#e5e8eb] focus:border-[#0a80ed] focus:ring-[#0a80ed]">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: course.color }}></div>
                          {course.name}
                        </div>
                      </SelectItem>
                    ))} */}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="recurring" className="text-sm font-medium text-[#18181b] mb-2 block">
                  Recurring
                </Label>
                <Select>
                  <SelectTrigger className="w-full h-11 border-[#e5e8eb] focus:border-[#0a80ed] focus:ring-[#0a80ed]">
                    <SelectValue placeholder="Convert to Event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#e5e8eb]">
            <Button
              variant="outline"
              onClick={() => setShowAddTask(false)}
              className="px-6 py-2 border-[#e5e8eb] text-[#71717a] hover:bg-[#f8f9fa]"
            >
              Cancel
            </Button>
            <Button
              className="bg-[#0a80ed] hover:bg-[#0369a1] text-white px-6 py-2"
              onClick={() => setShowAddTask(false)}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2">
        <Button size="icon" variant="outline" className="rounded-full w-12 h-12" onClick={() => setShowSettings(true)}>
          <Settings className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}