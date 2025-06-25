"use client"

import { useLayoutEffect, useRef, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar,
  Settings,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Bell, Shield, HelpCircle, LogOut } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import useAuthRedirect from "@/hooks/useAuthRedirect"

/**************************************
 * Utility helpers for dynamic dates  *
 **************************************/
const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// Return Sunday-based week for a reference date
const getWeekDates = (ref: Date) => {
  const start = new Date(ref)
  start.setDate(ref.getDate() - ref.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

// Generate next N days (including today)
const getNextNDays = (n: number) => {
  const base = startOfToday()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    return d
  })
}

const formatHourLabel = (h: number, withMinutes = false) => {
  const date = new Date()
  date.setHours(h, 0, 0, 0)
  return date.toLocaleTimeString("en-US",
    { hour: "2-digit", minute: withMinutes ? "2-digit" : undefined }
  )
}

// Generate all days for a month view (including padding days)
const getMonthDays = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(firstDay.getDate() - firstDay.getDay()) // Start from Sunday

  const days = []
  const current = new Date(startDate)

  // Generate 42 days (6 weeks * 7 days) to ensure we cover the entire month
  for (let i = 0; i < 42; i++) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  return days
}

/** Convert a 12-hour time like "3:00 PM" → 15 (24-hour clock). */
const to24Hour = (time: string): number => {
  const [timePart, period] = time.trim().split(" ");      // "3:00", "PM"
  const [hourStr] = timePart.split(":");                  // "3"
  let hour = parseInt(hourStr, 10);

  if (period === "PM" && hour !== 12) hour += 12; // 1-11 PM → +12
  if (period === "AM" && hour === 12) hour = 0;   // 12 AM  → 0

  return hour;           // minutes ignored; add Math.floor(min/60) if needed
};

const addDays = (iso: string, n = 0) =>
  new Date(new Date(iso).getTime() + n * 86_400_000)
    .toISOString()
    .split("T")[0];


/**************************************
 * Static demo data (unchanged)       *
 **************************************/
const calendarEvents = [
  {
    id: 1,
    title: "PHYS 101",
    subtitle: "Physics Lecture",
    time: "8:00 AM",
    color: "#0ea5e9",
    day: 1,
    course: "PHYS 101",
  },
  {
    id: 2,
    title: "MATH 201",
    subtitle: "Calculus Tutorial",
    time: "9:00 AM",
    color: "#f59e0b",
    day: 2,
    course: "MATH 201",
  },
  {
    id: 3,
    title: "CHEM 101",
    subtitle: "Chemistry Lab",
    time: "10:00 AM",
    color: "#8b5cf6",
    day: 3,
    course: "CHEM 101",
  },
  {
    id: 4,
    title: "ENG 101",
    subtitle: "English Literature",
    time: "11:00 AM",
    color: "#ef4444",
    day: 4,
    course: "ENG 101",
  },
  {
    id: 5,
    title: "HIST 201",
    subtitle: "World History",
    time: "1:00 PM",
    color: "#22c55e",
    day: 5,
    course: "HIST 201",
  },
  {
    id: 6,
    title: "BIO 101",
    subtitle: "Biology Lecture",
    time: "2:00 PM",
    color: "#ec4899",
    day: 6,
    course: "BIO 101",
  },
  { id: 7, title: "CS 101", subtitle: "Programming", time: "3:00 PM", color: "#0ea5e9", day: 0, course: "CS 101" },
]

const courses = [
  { id: "phys101", name: "PHYS 101", color: "#0ea5e9", visible: true },
  { id: "math201", name: "MATH 201", color: "#f59e0b", visible: true },
  { id: "chem101", name: "CHEM 101", color: "#8b5cf6", visible: true },
  { id: "eng101", name: "ENG 101", color: "#ef4444", visible: true },
  { id: "hist201", name: "HIST 201", color: "#22c55e", visible: true },
  { id: "bio101", name: "BIO 101", color: "#ec4899", visible: true },
  { id: "cs101", name: "CS 101", color: "#0ea5e9", visible: true },
]

const allTasks = [
  {
    id: 1,
    title: "Physics Problem Set 4",
    course: "PHYS 101",
    dueDate: new Date().toISOString().split("T")[0],
    priority: "high",
    completed: false,
    description: "Complete problems 1-15 from Chapter 4",
    color: "#0ea5e9",
  },
  {
    id: 2,
    title: "Chemistry Lab Report",
    course: "CHEM 101",
    dueDate: new Date().toISOString().split("T")[0],
    priority: "medium",
    completed: true,
    description: "Write lab report for Experiment 3",
    color: "#8b5cf6",
  },
  {
    id: 3,
    title: "English Essay Draft",
    course: "ENG 101",
    dueDate: new Date().toISOString().split("T")[0],
    priority: "high",
    completed: false,
    description: "First draft of literary analysis essay",
    color: "#ef4444",
  },
  {
    id: 4,
    title: "Math Calculus Quiz",
    course: "MATH 201",
    dueDate: new Date().toISOString().split("T")[0],
    priority: "medium",
    completed: false,
    description: "Quiz on derivatives and integrals",
    color: "#f59e0b",
  },
  {
    id: 5,
    title: "History Research Paper",
    course: "HIST 201",
    dueDate: new Date().toISOString().split("T")[0],
    priority: "low",
    completed: false,
    description: "Research paper on World War II",
    color: "#22c55e",
  },
  {
    id: 6,
    title: "Biology Lab Practical",
    course: "BIO 101",
    dueDate: new Date().toISOString().split("T")[0],
    priority: "high",
    completed: false,
    description: "Practical exam on cell structures",
    color: "#ec4899",
  },
]

export function CalendarScheduler() {
  /** Current selected date -- initialised to today */
  const [currentDate, setCurrentDate] = useState<Date>(() => startOfToday())
  const [currentView, setCurrentView] = useState<"day" | "week" | "month" | "year">("week")

  // Full-day hours array (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i)

  /** Visibility toggle for each course  */
  const [courseVisibility, setCourseVisibility] = useState<Record<string, boolean>>(
    courses.reduce((acc, course) => ({ ...acc, [course.id]: course.visible }), {}),
  )

  /** UI State */
  const [showSettings, setShowSettings] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [showCourseTasksDialog, setShowCourseTasksDialog] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<any>(null)
  const [sidebarTab, setSidebarTab] = useState<"courses" | "tasks">("tasks");


  /** Expanded accordion panels for upcoming-tasks list  */
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({
    [startOfToday().toISOString().split("T")[0]]: true,
  })

  /** Helpers */
  const weekDates = getWeekDates(currentDate) // Sunday‑based week

  const toggleCourseVisibility = (id: string) =>
    setCourseVisibility((prev) => ({ ...prev, [id]: !prev[id] }))

  const getTasksForDate = (dateStr: string) => allTasks.filter((t) => t.dueDate === dateStr)

  const toggleDayExpansion = (dateStr: string) =>
    setExpandedDays((prev) => ({ ...prev, [dateStr]: !prev[dateStr] }))

  const handleTaskClick = (task: any) => setSelectedTask((p: any) => (p?.id === task.id ? null : task))

  const getTasksForCourse = (courseName: string) => allTasks.filter((t) => t.course === courseName)

  const getEventsForDate = (date: Date) => {
    const weekStart = weekDates[0]
    return calendarEvents.filter((ev) => {
      const evDate = new Date(weekStart)
      evDate.setDate(weekStart.getDate() + ev.day)
      const courseVisible = courseVisibility[ev.course.toLowerCase().replace(/\s+/g, "")]
      return courseVisible && evDate.toDateString() === date.toDateString()
    })
  }

  const handleConnectCalendar = () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (!token) return alert("Please log in first.");

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
    window.location.href = `${apiBase}/api/calendar/auth?token=${token}`;
  };

// one ref for both Day + Week
const scrollRef = useRef<HTMLDivElement | null>(null);

/** Scroll-to-current-hour the moment the timeline element is in the DOM */
const setTimelineRef = (node: HTMLDivElement | null) => {
  if (!node) return;            // ref is being cleared
  scrollRef.current = node;

  // compute where "now" should sit
  const hour      = new Date().getHours();
  const rowHeight = currentView === "day" ? 80 : 64;      // h-20 vs h-16
  node.scrollTop  = Math.max(0, hour * rowHeight - 2 * rowHeight);
};

/* no need for useLayoutEffect anymore
useLayoutEffect(() => { … }, [currentView, currentDate]);
*/

  

  const loading = useAuthRedirect()
  if (loading) return <div>Loading...</div>

  /**************************************
   * Render starts here                *
   **************************************/
  return (
    <div className="flex h-screen bg-[#ffffff]">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#ffffff] border-b border-[#e5e8eb] px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#0a80ed] rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">C</span>
              </div>
              <span className="text-[#18181b] font-semibold text-lg">CourseHelper</span>
            </div>
            <div className="flex items-center gap-2 text-[#71717a]">
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">Today</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
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
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#71717a]" />
              <Input placeholder="Search..." className="pl-10 w-64" />
            </div>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder.svg?height=32&width=32" alt="Profile" />
                    <AvatarFallback className="bg-[#0a80ed] text-white">JD</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem onClick={() => setShowSettings(true)}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Bell className="mr-2 h-4 w-4" />
                  <span>Notification Preferences</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <GraduationCap className="mr-2 h-4 w-4" />
                  <span>Academic Information</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Shield className="mr-2 h-4 w-4" />
                  <span>Privacy Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Help and Support</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowSettings(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Calendar - Made Smaller */}
      {/* ───────────────── Main Section ───────────────── */}
      <div className="flex-1 pt-20 flex flex-col overflow-hidden">
        {/* ───────── DAY VIEW ───────── */}
        {currentView === "day" ? (
          <>
            {/* top nav */}
            <div className="border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">
                {currentDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(startOfToday())}>
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date(currentDate.getTime() - 86_400_000))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date(currentDate.getTime() + 86_400_000))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* 24-hour grid */}
            <div className="flex-1 overflow-y-auto flex" ref={setTimelineRef}>
              {/* time column */}
              <div className="w-20 border-r border-gray-200">
                {hours.map((h) => (
                  <div
                    key={h}
                    className="h-20 border-b border-gray-200 p-2 text-xs text-gray-500 flex items-start justify-end pr-1"
                  >
                    {formatHourLabel(h)}
                  </div>
                ))}
              </div>

              {/* events */}
              <div className="flex-1 relative">
                {hours.map((h) => (
                  <div key={h} className="h-20 border-b border-gray-200 relative">
                    {calendarEvents
                      .filter((e) => {
                        const visible = courseVisibility[e.course.toLowerCase().replace(/\s+/g, "")];
                        return (
                          visible &&
                          e.day === currentDate.getDay() && to24Hour(e.time) === h
                        );
                      })
                      .map((e) => (
                        <div
                          key={e.id}
                          className="absolute inset-1 rounded text-white text-sm p-2 cursor-pointer"
                          style={{ backgroundColor: e.color }}
                          onClick={() => handleTaskClick(e)}
                        >
                          {e.title}
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : /* ───────── WEEK VIEW ───────── */ currentView === "week" ? (
          <>
            {/* ───────── WEEK HEADER (wrapper) ───────── */}
            <div className="flex flex-col border-b border-gray-200">
              {/* ─ row 1 : nav bar ─ */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentDate((p) => new Date(p.getFullYear(), p.getMonth(), p.getDate() - 7))
                    }
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(startOfToday())}>
                    This Week
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentDate((p) => new Date(p.getFullYear(), p.getMonth(), p.getDate() + 7))
                    }
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                <h2 className="text-lg font-semibold text-gray-900">
                  {weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
                  {weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </h2>
              </div>

              {/* ─ row 2 : day headers + TZ cell ─ */}
              <div className="flex">
                {/* TZ label  */}
                <div className="w-16 border-r border-gray-200 p-4 text-xs text-gray-500 flex-shrink-0">
                </div>

                {/* weekdays */}
                {weekDates.map((d) => {
                  const isToday = d.toDateString() === startOfToday().toDateString();
                  return (
                    <div
                      key={d.toISOString()}
                      className="flex-1 border-r border-gray-200 p-4 text-center min-w-0"
                    >
                      <div className="text-xs text-gray-500 mb-1">
                        {d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}
                      </div>
                      <div className={`text-2xl font-semibold ${isToday ? "text-blue-600" : "text-gray-900"}`}>
                        {d.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* week grid */}
            <div className="flex-1 overflow-y-auto" ref={setTimelineRef}>
              <div className="flex">
                {/* time column */}
                <div className="w-16 border-r border-gray-200">
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="h-16 border-b border-gray-200 p-2 text-xs text-gray-500"
                    >
                      {formatHourLabel(h)}
                    </div>
                  ))}
                </div>

                {/* days */}
                {weekDates.map((d, dayIdx) => (
                  <div key={d.toISOString()} className="flex-1 border-r border-gray-200">
                    {hours.map((h) => (
                      <div key={h} className="h-16 border-b border-gray-200 relative p-1">
                        {calendarEvents
                          .filter((e) => {
                            const visible = courseVisibility[e.course.toLowerCase().replace(/\s+/g, "")];
                            return (
                              visible && e.day === dayIdx && to24Hour(e.time) == h
                            );
                          })
                          .map((e) => (
                            <div
                              key={e.id}
                              className="absolute inset-1 rounded p-2 text-xs text-white font-medium cursor-pointer"
                              style={{ backgroundColor: e.color }}
                              onClick={() => handleTaskClick(e)}
                            >
                              <div className="font-semibold">{e.title}</div>
                              <div className="text-xs opacity-90">{e.subtitle}</div>
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : /* ───────── MONTH VIEW ───────── */ currentView === "month" ? (
          <>
            {/* ───────── MONTH HEADER (wrapper) ───────── */}
            {/* ───────── MONTH HEADER (keyed wrapper) ───────── */}
            <div
              key={`month-header-${currentDate.getFullYear()}-${currentDate.getMonth()}`}
              className="flex flex-col border-b border-gray-200"
            >
              {/* ─ row 1 : navigation bar ─ */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-2xl font-semibold">
                  {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </h2>

                <div className="flex gap-2">
                  {/* Previous month */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentDate(
                        new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
                      )
                    }
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  {/* Today (optional) */}
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(startOfToday())}>
                    This Month
                  </Button>

                  {/* Next month */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentDate(
                        new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
                      )
                    }
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* ─ row 2 : weekday labels ─ */}
              <div className="grid grid-cols-7 gap-px bg-gray-200">
                {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                  <div
                    key={d}
                    className="bg-gray-50 p-3 text-center text-sm font-medium text-gray-500"
                  >
                    {d}
                  </div>
                ))}
              </div>
            </div>


            {/* month grid */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-7 gap-px bg-gray-200 h-full">
                {getMonthDays(currentDate).map((d) => {
                  const inMonth = d.getMonth() === currentDate.getMonth();
                  const isToday = d.toDateString() === startOfToday().toDateString();
                  const evs = getEventsForDate(d);
                  return (
                    <div
                      key={d.toISOString()}
                      className={`bg-white p-2 min-h-[110px] ${!inMonth ? "bg-gray-50 text-gray-400" : ""}`}
                    >
                      <div
                            className={`text-sm font-medium mb-2 ${isToday ? "bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center" : ""}`}
                      >
                        {d.getDate()}
                      </div>
                      {evs.slice(0, 3).map((e) => (
                        <div
                          key={e.id}
                          className="text-xs p-1 rounded text-white font-medium truncate cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: e.color }}
                          onClick={() => handleTaskClick(e)}
                        >
                          {e.title}
                        </div>
                      ))}
                      {evs.length > 3 && (
                        <div className="text-xs text-gray-500 font-medium">+{evs.length - 3} more</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* ───────── YEAR VIEW ───────── */
          <>
            {/* year nav */}
            <div className="border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">{currentDate.getFullYear()}</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear() - 1, 0, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(startOfToday())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear() + 1, 0, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* mini-month grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-3 gap-6">
                {Array.from({ length: 12 }, (_, m) => {
                  const monthDate = new Date(currentDate.getFullYear(), m, 1);
                  const monthName = monthDate.toLocaleDateString("en-US", { month: "long" });
                  const daysInMonth = new Date(currentDate.getFullYear(), m + 1, 0).getDate();
                  const firstDow = monthDate.getDay();
                  return (
                    <div
                      key={m}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow cursor-pointer"
                      onClick={() => {
                        setCurrentDate(new Date(currentDate.getFullYear(), m, 1));
                        setCurrentView("month");
                      }}
                    >
                      <h3 className="text-lg font-semibold text-center mb-3">{monthName}</h3>
                      <div className="grid grid-cols-7 text-xs gap-1">
                        {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                          <div key={d} className="text-center text-gray-500">{d}</div>
                        ))}
                        {Array.from({ length: firstDow }, (_, i) => (
                          <div key={i} className="h-5"></div>
                        ))}
                        {Array.from({ length: daysInMonth }, (_, dayIdx) => {
                          const d = dayIdx + 1;
                          const full = new Date(currentDate.getFullYear(), m, d);
                          const isToday =
                            full.toDateString() === startOfToday().toDateString() &&
                            full.getFullYear() === startOfToday().getFullYear();
                          return (
                            <div
                              key={d}
                              className={`h-5 flex items-center justify-center ${isToday ? "bg-blue-600 text-white rounded-full" : "text-gray-900 hover:bg-gray-100 rounded"}`}
                            >
                              {d}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
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
              <SelectItem value="tasks">Upcoming Tasks</SelectItem>
              <SelectItem value="courses">My Courses</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {sidebarTab === "tasks" ? (
          <>
            {/* Upcoming Tasks list */}
            <div className="space-y-4">
              {
              // getNextNDays(7).map((d) => {
              //   const ds = d.toISOString().split("T")[0];
              //   const tasksForDay = getTasksForDate(ds);
              //   const isExpanded = expandedDays[ds];
              //   const isToday = ds === "2021-02-21";
              //   return (
              //     <div key={ds} className="border border-[#e5e8eb] rounded-lg">
              //       <Collapsible open={isExpanded} onOpenChange={() => toggleDayExpansion(ds)}>
              //         <CollapsibleTrigger asChild>
              //           <div className={flex items-center justify-between p-4 cursor-pointer hover:bg-[#f8f9fa] rounded-t-lg ${isToday ? "bg-[#eff6ff]" : ""}}>{/* header */}
              //             <div>
              //               <div className={font-medium ${isToday ? "text-[#0a80ed]" : "text-[#18181b]"}}>{d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}{isToday && <span className="ml-2 text-xs">(Today)</span>}</div>
              //               <div className="text-sm text-[#71717a]">{tasksForDay.length} task{tasksForDay.length !== 1 ? "s" : ""}</div>
              //             </div>
              //             {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              //           </div>
              //         </CollapsibleTrigger>
              //         <CollapsibleContent>
              //           <div className="px-4 pb-4 space-y-2">
              //             {tasksForDay.length === 0 ? (
              //               <p className="text-sm text-[#71717a] italic">No tasks for this day</p>
              //             ) : (
              //               tasksForDay.map((task) => (
              //                 <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg bg-[#f8f9fa] hover:bg-[#f0f0f0] cursor-pointer" onClick={() => setSelectedTask(task)}>
              //                   <div className="w-3 h-3 rounded-full mt-1" style={{ backgroundColor: task.color }} />
              //                   <div className="flex-1 min-w-0">
              //                     <div className={text-sm font-medium truncate ${task.completed ? "line-through text-[#71717a]" : "text-[#18181b]"}}>{task.title}</div>
              //                     <div className="text-xs text-[#71717a] truncate">{task.course}</div>
              //                     <div className={text-xs mt-1 px-2 py-1 rounded-full inline-block ${task.priority === "high" ? "bg-red-100 text-red-700" : task.priority === "medium" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}}>{task.priority}</div>
              //                   </div>
              //                 </div>
              //               ))
              //             )}
              //           </div>
              //         </CollapsibleContent>
              //       </Collapsible>
              //     </div>
              //   );
              // })
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


      {/* Bottom Task Display Section */}
      {selectedTask && (
        <div className="fixed bottom-0 left-80 right-80 bg-[#ffffff] border-t border-[#e5e8eb] p-4 z-40">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Task Display</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedTask.color }}></div>
                  <h3 className="font-semibold text-[#18181b]">{selectedTask.title}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-[#71717a]">Course:</span><span className="ml-2 font-medium">{selectedTask.course || selectedTask.subtitle}</span></div>
                  <div><span className="text-[#71717a]">Due Date:</span><span className="ml-2 font-medium">{selectedTask.dueDate || "Not specified"}</span></div>
                  <div><span className="text-[#71717a]">Priority:</span><span className={`ml-2 px-2 py-1 rounded-full text-xs ${selectedTask.priority === "high" ? "bg-red-100 text-red-700" :
                    selectedTask.priority === "medium" ? "bg-yellow-100 text-yellow-700" :
                      "bg-green-100 text-green-700"
                    }`}>{selectedTask.priority || "Medium"}</span></div>
                  <div><span className="text-[#71717a]">Status:</span><span className={`ml-2 px-2 py-1 rounded-full text-xs ${selectedTask.completed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                    }`}>{selectedTask.completed ? "Completed" : "Pending"}</span></div>
                </div>
                {selectedTask.description && (
                  <div>
                    <span className="text-[#71717a] text-sm">Description:</span>
                    <p className="mt-1 text-sm text-[#18181b]">{selectedTask.description}</p>
                  </div>
                )}
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
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: course.color }}></div>
                          {course.name}
                        </div>
                      </SelectItem>
                    ))}
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

      {/* Course Tasks Dialog */}
      <Dialog open={showCourseTasksDialog} onOpenChange={setShowCourseTasksDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader className="border-b border-[#e5e8eb] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: selectedCourse?.color }}></div>
              <DialogTitle className="text-xl font-semibold">{selectedCourse?.name} Tasks</DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            {selectedCourse && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-[#18181b]">Course Tasks</h3>
                    <p className="text-sm text-[#71717a]">
                      {getTasksForCourse(selectedCourse.name).length} total tasks
                    </p>
                  </div>
                  <Button onClick={() => setShowAddTask(true)} className="bg-[#0a80ed] hover:bg-[#0369a1] text-white">
                    + Add Task
                  </Button>
                </div>

                <div className="space-y-3">
                  {getTasksForCourse(selectedCourse.name).length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-[#f0f0f0] rounded-full flex items-center justify-center mx-auto mb-4">
                        <GraduationCap className="w-8 h-8 text-[#71717a]" />
                      </div>
                      <h3 className="text-lg font-medium text-[#18181b] mb-2">No tasks yet</h3>
                      <p className="text-[#71717a] mb-4">Create your first task for this course</p>
                      <Button
                        onClick={() => setShowAddTask(true)}
                        className="bg-[#0a80ed] hover:bg-[#0369a1] text-white"
                      >
                        + Add Task
                      </Button>
                    </div>
                  ) : (
                    getTasksForCourse(selectedCourse.name).map((task) => (
                      <div
                        key={task.id}
                        className="border border-[#e5e8eb] rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer"
                        onClick={() => {
                          handleTaskClick(task)
                          setShowCourseTasksDialog(false)
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: task.color }}></div>
                              <h4
                                className={`font-medium ${task.completed ? "line-through text-[#71717a]" : "text-[#18181b]"}`}
                              >
                                {task.title}
                              </h4>
                            </div>
                            <p className="text-sm text-[#71717a] mb-3">{task.description}</p>
                            <div className="flex items-center gap-4 text-xs">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                              </div>
                              <div
                                className={`px-2 py-1 rounded-full ${task.priority === "high"
                                  ? "bg-red-100 text-red-700"
                                  : task.priority === "medium"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-green-100 text-green-700"
                                  }`}
                              >
                                {task.priority} priority
                              </div>
                              <div
                                className={`px-2 py-1 rounded-full ${task.completed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}
                              >
                                {task.completed ? "Completed" : "Pending"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[#71717a] hover:text-[#18181b]"
                              onClick={(e) => {
                                e.stopPropagation()
                                // Edit task functionality
                                console.log("Edit task:", task.id)
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`${task.completed
                                ? "text-[#71717a] hover:text-[#18181b]"
                                : "text-green-600 hover:text-green-700"}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                // Toggle completion functionality
                                console.log("Toggle completion:", task.id)
                              }}
                            >
                              {task.completed ? "Undo" : "Complete"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
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