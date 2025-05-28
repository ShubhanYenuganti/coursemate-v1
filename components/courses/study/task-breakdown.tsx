"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Loader2, Play, Plus, Sparkles, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Course } from "@/contexts/course-context"

type Task = {
  id: string
  title: string
  description: string
  estimatedDuration: number
  priority: "low" | "medium" | "high"
  completed: boolean
}

type SubTask = {
  id: string
  parentId: string
  title: string
  estimatedDuration: number
  completed: boolean
}

type TaskBreakdownProps = {
  course: Course
  onStartSession: (session: { id: string; title: string; duration: number }) => void
}

export function TaskBreakdown({ course, onStartSession }: TaskBreakdownProps) {
  // Add course-specific state management
  const [tasksByCourse, setTasksByCourse] = useState<Record<string, Task[]>>({})
  const [subTasksByCourse, setSubTasksByCourse] = useState<Record<string, SubTask[]>>({})

  // Load course-specific data
  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem(`course-task-breakdown-tasks-${course.id}`)
      const savedSubTasks = localStorage.getItem(`course-task-breakdown-subtasks-${course.id}`)

      if (savedTasks) {
        setTasksByCourse((prev) => ({
          ...prev,
          [course.id]: JSON.parse(savedTasks),
        }))
      } else {
        // Set default tasks for new courses
        setTasksByCourse((prev) => ({
          ...prev,
          [course.id]: [
            {
              id: "task-1",
              title: "Study for Midterm",
              description: "Review all material from chapters 1-5 for the upcoming midterm exam",
              estimatedDuration: 180,
              priority: "high",
              completed: false,
            },
          ],
        }))
      }

      if (savedSubTasks) {
        setSubTasksByCourse((prev) => ({
          ...prev,
          [course.id]: JSON.parse(savedSubTasks),
        }))
      }
    } catch (error) {
      console.error("Error loading task breakdown data:", error)
    }
  }, [course.id])

  // Save to localStorage
  useEffect(() => {
    const courseTasks = tasksByCourse[course.id] || []
    const courseSubTasks = subTasksByCourse[course.id] || []

    if (courseTasks.length > 0) {
      localStorage.setItem(`course-task-breakdown-tasks-${course.id}`, JSON.stringify(courseTasks))
    }
    if (courseSubTasks.length > 0) {
      localStorage.setItem(`course-task-breakdown-subtasks-${course.id}`, JSON.stringify(courseSubTasks))
    }
  }, [tasksByCourse, subTasksByCourse, course.id])

  // Update all references to use course-specific data
  const tasks = tasksByCourse[course.id] || []
  const subTasks = subTasksByCourse[course.id] || []

  // Update setter functions to use course-specific state
  const setTasks = (updater: any) => {
    setTasksByCourse((prev) => ({
      ...prev,
      [course.id]: typeof updater === "function" ? updater(prev[course.id] || []) : updater,
    }))
  }

  const setSubTasks = (updater: any) => {
    setSubTasksByCourse((prev) => ({
      ...prev,
      [course.id]: typeof updater === "function" ? updater(prev[course.id] || []) : updater,
    }))
  }

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    estimatedDuration: 60,
    priority: "medium" as "low" | "medium" | "high",
  })

  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({
    "task-1": true,
    "task-2": false,
  })

  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState<Record<string, boolean>>({})

  // Add a new task
  const addTask = () => {
    if (!newTask.title) return

    const task: Task = {
      id: `task-${Date.now()}`,
      title: newTask.title,
      description: newTask.description,
      estimatedDuration: newTask.estimatedDuration,
      priority: newTask.priority,
      completed: false,
    }

    setTasks((prev: Task[]) => [...prev, task])
    setNewTask({
      title: "",
      description: "",
      estimatedDuration: 60,
      priority: "medium",
    })
  }

  // Toggle task completion
  const toggleTaskCompletion = (taskId: string) => {
    setTasks((prev: Task[]) =>
      prev.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task)),
    )

    // If marking as complete, also mark all subtasks as complete
    if (!tasks.find((t) => t.id === taskId)?.completed) {
      setSubTasks((prev: SubTask[]) =>
        prev.map((subtask) => (subtask.parentId === taskId ? { ...subtask, completed: true } : subtask)),
      )
    }
  }

  // Toggle subtask completion
  const toggleSubtaskCompletion = (subtaskId: string) => {
    setSubTasks((prev: SubTask[]) =>
      prev.map((subtask) => (subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask)),
    )

    // Check if all subtasks are completed, and if so, mark the parent task as completed
    const updatedSubtasks = subTasks.map((subtask) =>
      subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask,
    )

    const parentId = subTasks.find((st) => st.id === subtaskId)?.parentId
    if (parentId) {
      const allSubtasksCompleted = updatedSubtasks
        .filter((st) => st.parentId === parentId)
        .every((st) => (st.id === subtaskId ? !st.completed : st.completed))

      if (allSubtasksCompleted) {
        setTasks((prev: Task[]) => prev.map((task) => (task.id === parentId ? { ...task, completed: true } : task)))
      }
    }
  }

  // Delete a task and its subtasks
  const deleteTask = (taskId: string) => {
    setTasks((prev: Task[]) => prev.filter((task) => task.id !== taskId))
    setSubTasks((prev: SubTask[]) => prev.filter((subtask) => subtask.parentId !== taskId))
  }

  // Delete a subtask
  const deleteSubtask = (subtaskId: string) => {
    setSubTasks((prev: SubTask[]) => prev.filter((subtask) => subtask.id !== subtaskId))
  }

  // Toggle task expansion
  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }))
  }

  // Generate subtasks using AI
  const generateSubtasks = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    setIsGeneratingSubtasks((prev) => ({ ...prev, [taskId]: true }))

    // Simulate AI processing
    setTimeout(() => {
      // In a real app, this would call an AI service to break down the task
      const newSubtasks: SubTask[] = [
        {
          id: `subtask-${Date.now()}-1`,
          parentId: taskId,
          title: `Review key concepts for ${task.title}`,
          estimatedDuration: 20,
          completed: false,
        },
        {
          id: `subtask-${Date.now()}-2`,
          parentId: taskId,
          title: `Create summary notes for ${task.title}`,
          estimatedDuration: 25,
          completed: false,
        },
        {
          id: `subtask-${Date.now()}-3`,
          parentId: taskId,
          title: `Practice problems related to ${task.title}`,
          estimatedDuration: 30,
          completed: false,
        },
      ]

      setSubTasks((prev: SubTask[]) => [...prev, ...newSubtasks])
      setIsGeneratingSubtasks((prev) => ({ ...prev, [taskId]: false }))
      setExpandedTasks((prev) => ({ ...prev, [taskId]: true }))
    }, 2000)
  }

  // Start a study session for a subtask
  const startSession = (subtask: SubTask) => {
    onStartSession({
      id: subtask.id,
      title: subtask.title,
      duration: subtask.estimatedDuration,
    })
  }

  // Get subtasks for a specific task
  const getSubtasksForTask = (taskId: string) => {
    return subTasks.filter((subtask) => subtask.parentId === taskId)
  }

  // Calculate progress for a task
  const calculateTaskProgress = (taskId: string) => {
    const taskSubtasks = getSubtasksForTask(taskId)
    if (taskSubtasks.length === 0) return 0

    const completedCount = taskSubtasks.filter((st) => st.completed).length
    return Math.round((completedCount / taskSubtasks.length) * 100)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Task Breakdown Assistant</h2>
        <p className="text-muted-foreground">
          Break down large tasks into manageable chunks with SMART goals to make your studying more effective.
        </p>
      </div>

      {/* Add New Task Form */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="font-medium">Add New Task</h3>

          <div className="space-y-2">
            <Label htmlFor="task-title">Task Title</Label>
            <Input
              id="task-title"
              placeholder="e.g., Study for Final Exam"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Description (Optional)</Label>
            <Textarea
              id="task-description"
              placeholder="Describe what you need to accomplish"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-duration">Estimated Duration (minutes)</Label>
              <Slider
                id="task-duration"
                min={15}
                max={240}
                step={15}
                value={[newTask.estimatedDuration]}
                onValueChange={(value) => setNewTask({ ...newTask, estimatedDuration: value[0] })}
              />
              <div className="text-center text-sm text-muted-foreground">{newTask.estimatedDuration} minutes</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-priority">Priority</Label>
              <Select
                value={newTask.priority}
                onValueChange={(value: "low" | "medium" | "high") => setNewTask({ ...newTask, priority: value })}
              >
                <SelectTrigger id="task-priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button className="w-full" onClick={addTask} disabled={!newTask.title}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </CardContent>
      </Card>

      {/* Task List */}
      <div className="space-y-4">
        <h3 className="font-medium">Your Tasks</h3>

        {tasks.length === 0 ? (
          <div className="text-center py-8 border rounded-md">
            <p className="text-muted-foreground">No tasks added yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add a task to get started</p>
          </div>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className={cn(task.completed && "opacity-70")}>
              <CardContent className="p-0">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTaskCompletion(task.id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                      />
                      <div>
                        <h4
                          className={cn("font-medium cursor-pointer hover:underline", task.completed && "line-through")}
                          onClick={() => toggleTaskExpansion(task.id)}
                        >
                          {task.title}
                        </h4>
                        {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                        <div className="flex items-center gap-3 mt-2 text-sm">
                          <span className="flex items-center">
                            <span className="text-muted-foreground">Duration:</span>
                            <span className="ml-1">{task.estimatedDuration} min</span>
                          </span>
                          <span className="flex items-center">
                            <span className="text-muted-foreground">Priority:</span>
                            <span
                              className={cn(
                                "ml-1 px-2 py-0.5 rounded-full text-xs",
                                task.priority === "low" && "bg-blue-100 text-blue-800",
                                task.priority === "medium" && "bg-yellow-100 text-yellow-800",
                                task.priority === "high" && "bg-red-100 text-red-800",
                              )}
                            >
                              {task.priority}
                            </span>
                          </span>

                          {getSubtasksForTask(task.id).length > 0 && (
                            <span className="flex items-center">
                              <span className="text-muted-foreground">Progress:</span>
                              <span className="ml-1">{calculateTaskProgress(task.id)}%</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      {getSubtasksForTask(task.id).length === 0 && !isGeneratingSubtasks[task.id] && (
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => generateSubtasks(task.id)}>
                          <Sparkles className="h-3.5 w-3.5" />
                          <span className="text-xs">Break Down</span>
                        </Button>
                      )}

                      {isGeneratingSubtasks[task.id] && (
                        <Button variant="outline" size="sm" disabled>
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          <span className="text-xs">Generating...</span>
                        </Button>
                      )}

                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => deleteTask(task.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Subtasks */}
                  {expandedTasks[task.id] && getSubtasksForTask(task.id).length > 0 && (
                    <div className="mt-4 pl-6 space-y-2 border-t pt-3">
                      <h5 className="text-sm font-medium">Subtasks</h5>

                      {getSubtasksForTask(task.id).map((subtask) => (
                        <div
                          key={subtask.id}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-md hover:bg-muted/50",
                            subtask.completed && "opacity-70",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={subtask.completed}
                              onChange={() => toggleSubtaskCompletion(subtask.id)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <span className={cn(subtask.completed && "line-through")}>{subtask.title}</span>
                            <span className="text-xs text-muted-foreground">({subtask.estimatedDuration} min)</span>
                          </div>

                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => startSession(subtask)}
                              disabled={subtask.completed}
                            >
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500"
                              onClick={() => deleteSubtask(subtask.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
