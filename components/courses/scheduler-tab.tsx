"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CheckSquare, Clock, CalendarIcon, Plus, Trash2 } from "lucide-react"
import { AdaptiveScheduler } from "@/components/courses/study/adaptive-scheduler"
import { TaskBreakdown } from "@/components/courses/study/task-breakdown"
import { ProgressTracker } from "@/components/courses/study/progress-tracker"
import { PomodoroTimer } from "@/components/courses/study/pomodoro-timer"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import type { Course } from "@/contexts/course-context"

interface Task {
  id: string
  title: string
  description: string
  dueDate: string | null
  priority: "low" | "medium" | "high"
  status: "todo" | "in-progress" | "completed"
  tags: string[]
  createdAt: string
  completedAt: string | null
}

type SchedulerTabProps = {
  course: Course
}

const priorityColors = {
  low: "bg-blue-500",
  medium: "bg-yellow-500",
  high: "bg-red-500",
}

const priorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
}

const statusColors = {
  todo: "bg-gray-500",
  "in-progress": "bg-blue-500",
  completed: "bg-green-500",
}

const statusLabels = {
  todo: "To Do",
  "in-progress": "In Progress",
  completed: "Completed",
}

export function SchedulerTab({ course }: SchedulerTabProps) {
  const [isPomodoroActive, setIsPomodoroActive] = useState(false)
  const [activeStudySession, setActiveStudySession] = useState<{
    id: string
    title: string
    duration: number
  } | null>(null)

  // Task management state
  const [tasks, setTasks] = useState<Task[]>([])
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const { toast } = useToast()

  const [newTask, setNewTask] = useState<Omit<Task, "id" | "createdAt" | "completedAt">>({
    title: "",
    description: "",
    dueDate: null,
    priority: "medium",
    status: "todo",
    tags: [],
  })

  // Load course-specific tasks from localStorage
  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem(`course-scheduler-tasks-${course.id}`)
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks))
      }
    } catch (error) {
      console.error("Error loading tasks from localStorage:", error)
    }
  }, [course.id])

  // Save tasks to localStorage
  useEffect(() => {
    localStorage.setItem(`course-scheduler-tasks-${course.id}`, JSON.stringify(tasks))
  }, [tasks, course.id])

  // Start a study session
  const startStudySession = (session: { id: string; title: string; duration: number }) => {
    setActiveStudySession(session)
    setIsPomodoroActive(true)
  }

  // End a study session
  const endStudySession = () => {
    setActiveStudySession(null)
    setIsPomodoroActive(false)
  }

  // Task management functions
  const handleAddTask = () => {
    if (!newTask.title.trim()) return

    const task: Task = {
      id: `task-${Date.now()}`,
      ...newTask,
      createdAt: new Date().toISOString(),
      completedAt: null,
    }

    setTasks([...tasks, task])
    setIsAddingTask(false)
    setNewTask({
      title: "",
      description: "",
      dueDate: null,
      priority: "medium",
      status: "todo",
      tags: [],
    })
    setSelectedDate(null)

    toast({
      title: "Task added",
      description: "Your task has been added successfully",
    })
  }

  const handleToggleStatus = (taskId: string) => {
    setTasks(
      tasks.map((task) => {
        if (task.id === taskId) {
          const newStatus = task.status === "completed" ? "todo" : "completed"
          return {
            ...task,
            status: newStatus,
            completedAt: newStatus === "completed" ? new Date().toISOString() : null,
          }
        }
        return task
      }),
    )
  }

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter((task) => task.id !== taskId))
    toast({
      title: "Task deleted",
      description: "Your task has been deleted",
    })
  }

  const formatDueDate = (dateString: string | null) => {
    if (!dateString) return "No due date"
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "Invalid date"
      return format(date, "MMM d, yyyy")
    } catch (error) {
      return "Invalid date"
    }
  }

  return (
    <div className="relative flex gap-4">
      {/* Main content area */}
      <div className="flex-1">
        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="breakdown">Task Breakdown</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule">
            <Card className="p-6">
              <AdaptiveScheduler course={course} onStartSession={startStudySession} />
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <Card className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Course Tasks</h3>
                    <p className="text-muted-foreground">Manage your tasks and assignments for this course</p>
                  </div>
                  <Button onClick={() => setIsAddingTask(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </div>

                {/* Task List */}
                {tasks.length > 0 ? (
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <Card
                        key={task.id}
                        className={cn("overflow-hidden", task.status === "completed" ? "opacity-70" : "")}
                      >
                        <div className="flex items-start p-4 gap-3">
                          <div className="pt-1">
                            <Checkbox
                              checked={task.status === "completed"}
                              onCheckedChange={() => handleToggleStatus(task.id)}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4
                                className={cn(
                                  "font-medium",
                                  task.status === "completed" ? "line-through text-muted-foreground" : "",
                                )}
                              >
                                {task.title}
                              </h4>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDeleteTask(task.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            {task.description && (
                              <p
                                className={cn(
                                  "text-sm text-muted-foreground mt-1",
                                  task.status === "completed" ? "line-through" : "",
                                )}
                              >
                                {task.description}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <div className="flex items-center text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatDueDate(task.dueDate)}
                              </div>

                              <Badge className={priorityColors[task.priority]} variant="secondary">
                                {priorityLabels[task.priority]}
                              </Badge>

                              <Badge className={statusColors[task.status]} variant="secondary">
                                {statusLabels[task.status]}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center">
                    <CheckSquare className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">No tasks yet</p>
                    <p className="text-sm text-muted-foreground">Add your first task using the button above.</p>
                  </Card>
                )}

                {/* Add Task Form */}
                {isAddingTask && (
                  <Card className="p-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={newTask.title}
                          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                          placeholder="Task title"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description (optional)</Label>
                        <Textarea
                          id="description"
                          value={newTask.description}
                          onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                          placeholder="Add more details about this task"
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Due Date</Label>
                          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !selectedDate && "text-muted-foreground",
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={selectedDate || undefined}
                                onSelect={(date) => {
                                  setSelectedDate(date)
                                  setNewTask({ ...newTask, dueDate: date ? date.toISOString() : null })
                                  setIsCalendarOpen(false)
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="priority">Priority</Label>
                          <Select
                            value={newTask.priority}
                            onValueChange={(value: "low" | "medium" | "high") =>
                              setNewTask({ ...newTask, priority: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsAddingTask(false)
                            setNewTask({
                              title: "",
                              description: "",
                              dueDate: null,
                              priority: "medium",
                              status: "todo",
                              tags: [],
                            })
                            setSelectedDate(null)
                          }}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleAddTask} disabled={!newTask.title.trim()}>
                          Add Task
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown">
            <Card className="p-6">
              <TaskBreakdown course={course} onStartSession={startStudySession} />
            </Card>
          </TabsContent>

          <TabsContent value="progress">
            <Card className="p-6">
              <ProgressTracker course={course} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Pomodoro timer widget */}
      <div className="w-80 shrink-0">
        <PomodoroTimer
          isActive={isPomodoroActive}
          session={activeStudySession}
          onSessionEnd={endStudySession}
          course={course}
        />
      </div>
    </div>
  )
}
