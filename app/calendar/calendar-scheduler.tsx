"use client"

import { useState } from "react"
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
    dueDate: "2021-02-21",
    priority: "high",
    completed: false,
    description: "Complete problems 1-15 from Chapter 4",
    color: "#0ea5e9",
  },
  {
    id: 2,
    title: "Chemistry Lab Report",
    course: "CHEM 101",
    dueDate: "2021-02-21",
    priority: "medium",
    completed: true,
    description: "Write lab report for Experiment 3",
    color: "#8b5cf6",
  },
  {
    id: 3,
    title: "English Essay Draft",
    course: "ENG 101",
    dueDate: "2021-02-22",
    priority: "high",
    completed: false,
    description: "First draft of literary analysis essay",
    color: "#ef4444",
  },
  {
    id: 4,
    title: "Math Calculus Quiz",
    course: "MATH 201",
    dueDate: "2021-02-22",
    priority: "medium",
    completed: false,
    description: "Quiz on derivatives and integrals",
    color: "#f59e0b",
  },
  {
    id: 5,
    title: "History Research Paper",
    course: "HIST 201",
    dueDate: "2021-02-23",
    priority: "low",
    completed: false,
    description: "Research paper on World War II",
    color: "#22c55e",
  },
  {
    id: 6,
    title: "Biology Lab Practical",
    course: "BIO 101",
    dueDate: "2021-02-24",
    priority: "high",
    completed: false,
    description: "Practical exam on cell structures",
    color: "#ec4899",
  },
]

export function CalendarScheduler() {
  const [showSettings, setShowSettings] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date(2021, 1, 21)) // February 21, 2021
  const [currentView, setCurrentView] = useState<"day" | "week" | "month" | "year">("week")
  const [courseVisibility, setCourseVisibility] = useState(
    courses.reduce((acc, course) => ({ ...acc, [course.id]: course.visible }), {}),
  )
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [expandedDays, setExpandedDays] = useState<{ [key: string]: boolean }>({
    "2021-02-21": true,
    "2021-02-22": true,
  })

  const [showCourseTasksDialog, setShowCourseTasksDialog] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<any>(null)

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const dates = [21, 22, 23, 24, 25, 26, 27]
  const hours = Array.from({ length: 13 }, (_, i) => i + 8) // 8 AM to 8 PM

  const getDayName = (index: number) => {
    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
    return dayNames[index]
  }

  const getMonthDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    const current = new Date(startDate)

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return days
  }

  const getEventsForDate = (date: Date) => {
    const dayOfMonth = date.getDate()
    return calendarEvents.filter((event) => {
      const eventDay = 21 + event.day
      const courseVisible = courseVisibility[event.course.toLowerCase().replace(" ", "")]
      return dayOfMonth === eventDay && date.getMonth() === currentDate.getMonth() && courseVisible
    })
  }

  const toggleCourseVisibility = (courseId: string) => {
    setCourseVisibility((prev) => ({ ...prev, [courseId]: !prev[courseId] }))
  }

  const getTasksForDate = (dateString: string) => {
    return allTasks.filter((task) => task.dueDate === dateString)
  }

  const getNext7Days = () => {
    const days = []
    const today = new Date(2021, 1, 21) // Starting from Feb 21, 2021

    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      days.push(date)
    }
    return days
  }

  const toggleDayExpansion = (dateString: string) => {
    setExpandedDays((prev) => ({ ...prev, [dateString]: !prev[dateString] }))
  }

  const handleTaskClick = (task: any) => {
    setSelectedTask(task)
  }

  const getTasksForCourse = (courseName: string) => {
    return allTasks.filter((task) => task.course === courseName)
  }

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

      {/* Left Sidebar - Course Toggles */}
      <div className="w-80 bg-[#252537] text-white p-6 pt-20 overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Scheduler</h2>

          {/* Mini Calendar */}
          <div className="bg-[#18181b] rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-medium">
                {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              <div className="flex gap-1">
                <ChevronLeft
                  className="w-4 h-4 cursor-pointer hover:text-white"
                  onClick={() => {
                    const newDate = new Date(currentDate)
                    newDate.setMonth(newDate.getMonth() - 1)
                    setCurrentDate(newDate)
                  }}
                />
                <ChevronRight
                  className="w-4 h-4 cursor-pointer hover:text-white"
                  onClick={() => {
                    const newDate = new Date(currentDate)
                    newDate.setMonth(newDate.getMonth() + 1)
                    setCurrentDate(newDate)
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-xs text-center mb-2">
              {["S", "M", "T", "W", "T", "F", "S"].map((day) => (
                <div key={day} className="text-[#71717a] py-1">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 text-sm">
              {Array.from({ length: 35 }, (_, i) => {
                const date = i - 6
                const isCurrentMonth = date > 0 && date <= 28
                const isSelected = date === currentDate.getDate() && currentDate.getMonth() === 1 // February
                const clickableDate = new Date(2021, 1, date) // February 2021

                return (
                  <div
                    key={i}
                    className={`h-8 flex items-center justify-center cursor-pointer rounded transition-colors ${
                      isSelected
                        ? "bg-[#0a80ed] text-white"
                        : isCurrentMonth
                          ? "text-white hover:bg-[#71717a]"
                          : "text-[#71717a]"
                    }`}
                    onClick={() => {
                      if (isCurrentMonth) {
                        setCurrentDate(clickableDate)
                        setCurrentView("day")
                      }
                    }}
                  >
                    {isCurrentMonth ? date : ""}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Add Task Button */}
          <div className="mb-6">
            <Button
              onClick={() => setShowAddTask(true)}
              className="w-full bg-[#0a80ed] hover:bg-[#0369a1] text-white font-medium py-3"
            >
              + Add Task
            </Button>
          </div>

          {/* Course Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#71717a]">MY COURSES</span>
            </div>

            {courses.map((course) => (
              <div key={course.id} className="flex items-center justify-between p-3 rounded-lg bg-[#18181b]">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: course.color }}></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{course.name}</div>
                  </div>
                  <Switch
                    checked={courseVisibility[course.id]}
                    onCheckedChange={() => toggleCourseVisibility(course.id)}
                    className="ml-2"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 text-[#71717a] hover:text-white hover:bg-[#71717a] p-1"
                  onClick={() => {
                    setSelectedCourse(course)
                    setShowCourseTasksDialog(true)
                  }}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Calendar - Made Smaller */}
      <div className="flex-1 pt-20 overflow-hidden">
        <div className="h-full flex flex-col">
          {currentView === "day" ? (
            <>
              {/* Day View */}
              <div className="border-b border-[#e5e8eb] p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-[#18181b]">
                    {currentDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newDate = new Date(currentDate)
                        newDate.setDate(newDate.getDate() - 1)
                        setCurrentDate(newDate)
                      }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date(2021, 1, 21))}>
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newDate = new Date(currentDate)
                        newDate.setDate(newDate.getDate() + 1)
                        setCurrentDate(newDate)
                      }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="flex">
                  <div className="w-20 border-r border-[#e5e8eb]">
                    {hours.map((hour) => (
                      <div key={hour} className="h-20 border-b border-[#e5e8eb] p-3 text-sm text-[#71717a]">
                        {hour === 12 ? "12:00 PM" : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1">
                    {hours.map((hour) => (
                      <div key={hour} className="h-20 border-b border-[#e5e8eb] relative p-2">
                        {calendarEvents
                          .filter((event) => {
                            const courseVisible = courseVisibility[event.course.toLowerCase().replace(" ", "")]
                            const eventDate = new Date(2021, 1, 21 + event.day) // Calculate event date
                            const isSameDay = eventDate.toDateString() === currentDate.toDateString()
                            return Number.parseInt(event.time) === hour && courseVisible && isSameDay
                          })
                          .map((event) => (
                            <div
                              key={event.id}
                              className="absolute inset-2 rounded-lg p-3 text-white font-medium shadow-sm cursor-pointer hover:opacity-80"
                              style={{ backgroundColor: event.color }}
                              onClick={() => handleTaskClick(event)}
                            >
                              <div className="font-semibold text-base">{event.title}</div>
                              <div className="text-sm opacity-90">{event.subtitle}</div>
                              <div className="text-xs opacity-75 mt-1">{event.time}</div>
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : currentView === "month" ? (
            <>
              {/* Month View */}
              <div className="flex-1 overflow-hidden">
                {/* Month Header */}
                <div className="border-b border-[#e5e8eb] p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-semibold text-[#18181b]">
                      {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </h2>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
                        }
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
                        }
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Days of week header */}
                  <div className="grid grid-cols-7 gap-px bg-[#e5e8eb]">
                    {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                      <div key={day} className="bg-[#f8f9fa] p-3 text-center text-sm font-medium text-[#71717a]">
                        {day.slice(0, 3).toUpperCase()}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Month Grid */}
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-7 gap-px bg-[#e5e8eb] h-full">
                    {getMonthDays().map((date, index) => {
                      const isCurrentMonth = date.getMonth() === currentDate.getMonth()
                      const isToday = date.toDateString() === new Date().toDateString()
                      const dayEvents = getEventsForDate(date)

                      return (
                        <div
                          key={index}
                          className={`bg-white p-2 min-h-[120px] ${
                            !isCurrentMonth ? "bg-[#f8f9fa] text-[#a1a1aa]" : ""
                          }`}
                        >
                          <div
                            className={`text-sm font-medium mb-2 ${
                              isToday
                                ? "bg-[#0a80ed] text-white w-6 h-6 rounded-full flex items-center justify-center"
                                : ""
                            }`}
                          >
                            {date.getDate()}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.slice(0, 3).map((event) => (
                              <div
                                key={event.id}
                                className="text-xs p-1 rounded text-white font-medium truncate cursor-pointer hover:opacity-80"
                                style={{ backgroundColor: event.color }}
                                onClick={() => handleTaskClick(event)}
                              >
                                {event.title}
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-xs text-[#71717a] font-medium">+{dayEvents.length - 3} more</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : currentView === "year" ? (
            <>
              {/* Year View */}
              <div className="border-b border-[#e5e8eb] p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-[#18181b]">{currentDate.getFullYear()}</h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-3 gap-6">
                  {Array.from({ length: 12 }, (_, monthIndex) => {
                    const monthDate = new Date(currentDate.getFullYear(), monthIndex, 1)
                    const monthName = monthDate.toLocaleDateString("en-US", { month: "long" })
                    const daysInMonth = new Date(currentDate.getFullYear(), monthIndex + 1, 0).getDate()
                    const firstDayOfMonth = new Date(currentDate.getFullYear(), monthIndex, 1).getDay()

                    return (
                      <div
                        key={monthIndex}
                        className="border border-[#e5e8eb] rounded-lg p-4 hover:shadow-sm cursor-pointer transition-shadow"
                        onClick={() => {
                          setCurrentDate(new Date(currentDate.getFullYear(), monthIndex, 1))
                          setCurrentView("month")
                        }}
                      >
                        <h3 className="text-lg font-semibold text-[#18181b] mb-3 text-center">{monthName}</h3>

                        {/* Mini calendar for each month */}
                        <div className="grid grid-cols-7 gap-1 text-xs">
                          {["S", "M", "T", "W", "T", "F", "S"].map((day) => (
                            <div key={day} className="text-center text-[#71717a] py-1 font-medium">
                              {day}
                            </div>
                          ))}

                          {/* Empty cells for days before month starts */}
                          {Array.from({ length: firstDayOfMonth }, (_, i) => (
                            <div key={`empty-${i}`} className="h-6"></div>
                          ))}

                          {/* Days of the month */}
                          {Array.from({ length: daysInMonth }, (_, dayIndex) => {
                            const date = dayIndex + 1
                            const fullDate = new Date(currentDate.getFullYear(), monthIndex, date)
                            const isToday = fullDate.toDateString() === new Date().toDateString()
                            const isCurrentMonth =
                              monthIndex === new Date().getMonth() &&
                              currentDate.getFullYear() === new Date().getFullYear()

                            // Check if there are events on this date (simplified for year view)
                            const hasEvents = monthIndex === 1 && date >= 21 && date <= 27 // February events

                            return (
                              <div
                                key={date}
                                className={`h-6 flex items-center justify-center text-xs relative ${
                                  isToday && isCurrentMonth
                                    ? "bg-[#0a80ed] text-white rounded-full"
                                    : "text-[#18181b] hover:bg-[#f0f0f0] rounded"
                                }`}
                              >
                                {date}
                                {hasEvents && (
                                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-[#0a80ed] rounded-full"></div>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {/* Event count for this month */}
                        {monthIndex === 1 && (
                          <div className="mt-2 text-center">
                            <span className="text-xs text-[#71717a]">
                              {
                                calendarEvents.filter((event) => {
                                  const courseVisible = courseVisibility[event.course.toLowerCase().replace(" ", "")]
                                  return courseVisible
                                }).length
                              }{" "}
                              events
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Week View - Calendar Header */}
              <div className="flex border-b border-[#e5e8eb]">
                <div className="w-16 border-r border-[#e5e8eb] p-4">
                  <span className="text-sm text-[#71717a]">GMT-5</span>
                </div>
                {dates.map((date, index) => (
                  <div key={date} className="flex-1 border-r border-[#e5e8eb] p-4 text-center">
                    <div className="text-xs text-[#71717a] mb-1">{getDayName(index)}</div>
                    <div className={`text-2xl font-semibold ${date === 25 ? "text-[#0a80ed]" : "text-[#18181b]"}`}>
                      {date}
                    </div>
                  </div>
                ))}
              </div>

              {/* Week View - Calendar Grid */}
              <div className="flex-1 overflow-y-auto">
                <div className="flex">
                  {/* Time Column */}
                  <div className="w-16 border-r border-[#e5e8eb]">
                    {hours.map((hour) => (
                      <div key={hour} className="h-16 border-b border-[#e5e8eb] p-2 text-xs text-[#71717a]">
                        {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  {dates.map((date, dayIndex) => (
                    <div key={date} className="flex-1 border-r border-[#e5e8eb]">
                      {hours.map((hour, hourIndex) => (
                        <div key={hour} className="h-16 border-b border-[#e5e8eb] relative p-1">
                          {calendarEvents
                            .filter((event) => {
                              const courseVisible = courseVisibility[event.course.toLowerCase().replace(" ", "")]
                              return event.day === dayIndex && Number.parseInt(event.time) === hour && courseVisible
                            })
                            .map((event) => (
                              <div
                                key={event.id}
                                className="absolute inset-1 rounded p-2 text-xs text-white font-medium cursor-pointer hover:opacity-80"
                                style={{ backgroundColor: event.color }}
                                onClick={() => handleTaskClick(event)}
                              >
                                <div className="font-semibold">{event.title}</div>
                                <div className="text-xs opacity-90">{event.subtitle}</div>
                              </div>
                            ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Sidebar - Tasks List */}
      <div className="w-80 bg-[#ffffff] border-l border-[#e5e8eb] p-6 pt-20 overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 text-[#18181b]">Upcoming Tasks</h2>

          <div className="space-y-4">
            {getNext7Days().map((date) => {
              const dateString = date.toISOString().split("T")[0]
              const tasksForDay = getTasksForDate(dateString)
              const isExpanded = expandedDays[dateString]
              const isToday = dateString === "2021-02-21"

              return (
                <div key={dateString} className="border border-[#e5e8eb] rounded-lg">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleDayExpansion(dateString)}>
                    <CollapsibleTrigger asChild>
                      <div
                        className={`flex items-center justify-between p-4 cursor-pointer hover:bg-[#f8f9fa] rounded-t-lg ${isToday ? "bg-[#eff6ff]" : ""}`}
                      >
                        <div>
                          <div className={`font-medium ${isToday ? "text-[#0a80ed]" : "text-[#18181b]"}`}>
                            {date.toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "short",
                              day: "numeric",
                            })}
                            {isToday && <span className="ml-2 text-xs">(Today)</span>}
                          </div>
                          <div className="text-sm text-[#71717a]">
                            {tasksForDay.length} task{tasksForDay.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-2">
                        {tasksForDay.length === 0 ? (
                          <p className="text-sm text-[#71717a] italic">No tasks for this day</p>
                        ) : (
                          tasksForDay.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-start gap-3 p-3 rounded-lg bg-[#f8f9fa] hover:bg-[#f0f0f0] cursor-pointer transition-colors"
                              onClick={() => handleTaskClick(task)}
                            >
                              <div className="w-3 h-3 rounded-full mt-1" style={{ backgroundColor: task.color }}></div>
                              <div className="flex-1 min-w-0">
                                <div
                                  className={`text-sm font-medium truncate ${task.completed ? "line-through text-[#71717a]" : "text-[#18181b]"}`}
                                >
                                  {task.title}
                                </div>
                                <div className="text-xs text-[#71717a] truncate">{task.course}</div>
                                <div
                                  className={`text-xs mt-1 px-2 py-1 rounded-full inline-block ${
                                    task.priority === "high"
                                      ? "bg-red-100 text-red-700"
                                      : task.priority === "medium"
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-green-100 text-green-700"
                                  }`}
                                >
                                  {task.priority}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom Task Display Section */}
      <div className="fixed bottom-0 left-80 right-80 bg-[#ffffff] border-t border-[#e5e8eb] p-4 z-40">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Task Display</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTask ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedTask.color }}></div>
                  <h3 className="font-semibold text-[#18181b]">{selectedTask.title}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[#71717a]">Course:</span>
                    <span className="ml-2 font-medium">{selectedTask.course || selectedTask.subtitle}</span>
                  </div>
                  <div>
                    <span className="text-[#71717a]">Due Date:</span>
                    <span className="ml-2 font-medium">{selectedTask.dueDate || "Not specified"}</span>
                  </div>
                  <div>
                    <span className="text-[#71717a]">Priority:</span>
                    <span
                      className={`ml-2 px-2 py-1 rounded-full text-xs ${
                        selectedTask.priority === "high"
                          ? "bg-red-100 text-red-700"
                          : selectedTask.priority === "medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                      }`}
                    >
                      {selectedTask.priority || "Medium"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#71717a]">Status:</span>
                    <span
                      className={`ml-2 px-2 py-1 rounded-full text-xs ${
                        selectedTask.completed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {selectedTask.completed ? "Completed" : "Pending"}
                    </span>
                  </div>
                </div>
                {selectedTask.description && (
                  <div>
                    <span className="text-[#71717a] text-sm">Description:</span>
                    <p className="mt-1 text-sm text-[#18181b]">{selectedTask.description}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-[#71717a] py-8">
                <p>No task selected</p>
                <p className="text-sm mt-1">Click on a task in the calendar or sidebar to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
                                className={`px-2 py-1 rounded-full ${
                                  task.priority === "high"
                                    ? "bg-red-100 text-red-700"
                                    : task.priority === "medium"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-green-100 text-green-700"
                                }`}
                              >
                                {task.priority} priority
                              </div>
                              <div
                                className={`px-2 py-1 rounded-full ${
                                  task.completed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                                }`}
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
                              className={`${
                                task.completed
                                  ? "text-[#71717a] hover:text-[#18181b]"
                                  : "text-green-600 hover:text-green-700"
                              }`}
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
        <Button
          size="icon"
          className="bg-[#0a80ed] hover:bg-[#0369a1] rounded-full w-12 h-12"
          onClick={() => setShowAddTask(true)}
        >
          +
        </Button>
        <Button size="icon" variant="outline" className="rounded-full w-12 h-12" onClick={() => setShowSettings(true)}>
          <Settings className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
