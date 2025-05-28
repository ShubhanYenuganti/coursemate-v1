"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, isToday, isTomorrow, isYesterday, addDays, isBefore } from "date-fns"
import {
  CheckSquare,
  Clock,
  CalendarIcon,
  Plus,
  MoreVertical,
  Tag,
  Trash2,
  Edit,
  Filter,
  SortAsc,
  SortDesc,
  AlertCircle,
  CalendarClock,
} from "lucide-react"
import type { Course } from "@/contexts/course-context"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

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

interface TasksTabProps {
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

export function TasksTab({ course }: TasksTabProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [filter, setFilter] = useState<"all" | "todo" | "in-progress" | "completed">("all")
  const [sortBy, setSortBy] = useState<"dueDate" | "priority" | "createdAt">("dueDate")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
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
  const [newTag, setNewTag] = useState("")

  // Load tasks from localStorage
  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem(`course-tasks-${course.id}`)
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks))
      }
    } catch (error) {
      console.error("Error loading tasks from localStorage:", error)
    }
  }, [course.id])

  // Save tasks to localStorage
  useEffect(() => {
    localStorage.setItem(`course-tasks-${course.id}`, JSON.stringify(tasks))
  }, [tasks, course.id])

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

  const handleUpdateTask = () => {
    if (!editingTask || !newTask.title.trim()) return

    const updatedTasks = tasks.map((task) =>
      task.id === editingTask.id
        ? {
            ...task,
            ...newTask,
            completedAt:
              newTask.status === "completed" && task.status !== "completed"
                ? new Date().toISOString()
                : task.completedAt,
          }
        : task,
    )

    setTasks(updatedTasks)
    setEditingTask(null)
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
      title: "Task updated",
      description: "Your task has been updated successfully",
    })
  }

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter((task) => task.id !== taskId))

    toast({
      title: "Task deleted",
      description: "Your task has been deleted",
    })
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setNewTask({
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      priority: task.priority,
      status: task.status,
      tags: [...task.tags],
    })
    setSelectedDate(task.dueDate ? new Date(task.dueDate) : null)
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

  const handleAddTag = () => {
    if (!newTag.trim()) return
    if (newTask.tags.includes(newTag.trim())) return

    setNewTask({
      ...newTask,
      tags: [...newTask.tags, newTag.trim()],
    })
    setNewTag("")
  }

  const handleRemoveTag = (tag: string) => {
    setNewTask({
      ...newTask,
      tags: newTask.tags.filter((t) => t !== tag),
    })
  }

  const formatDueDate = (dateString: string | null) => {
    if (!dateString) return "No due date"

    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "Invalid date"

      if (isToday(date)) return "Today"
      if (isTomorrow(date)) return "Tomorrow"
      if (isYesterday(date)) return "Yesterday"

      return format(date, "MMM d, yyyy")
    } catch (error) {
      return "Invalid date"
    }
  }

  const getDueDateColor = (dateString: string | null, status: string) => {
    if (status === "completed") return "text-gray-400"
    if (!dateString) return "text-gray-400"

    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "text-gray-400"

      if (isBefore(date, new Date()) && status !== "completed") return "text-red-500"
      if (isToday(date)) return "text-orange-500"
      return "text-blue-500"
    } catch (error) {
      return "text-gray-400"
    }
  }

  const filteredTasks = tasks.filter((task) => {
    if (filter === "all") return true
    return task.status === filter
  })

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "dueDate") {
      // Handle null due dates
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return sortDirection === "asc" ? 1 : -1
      if (!b.dueDate) return sortDirection === "asc" ? -1 : 1

      const dateA = new Date(a.dueDate)
      const dateB = new Date(b.dueDate)
      return sortDirection === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime()
    }

    if (sortBy === "priority") {
      const priorityOrder = { low: 1, medium: 2, high: 3 }
      const orderA = priorityOrder[a.priority]
      const orderB = priorityOrder[b.priority]
      return sortDirection === "asc" ? orderA - orderB : orderB - orderA
    }

    // Default to createdAt
    const dateA = new Date(a.createdAt)
    const dateB = new Date(b.createdAt)
    return sortDirection === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime()
  })

  const getTaskCountByStatus = (status: "todo" | "in-progress" | "completed") => {
    return tasks.filter((task) => task.status === status).length
  }

  const getOverdueTasks = () => {
    return tasks.filter((task) => {
      if (task.status === "completed" || !task.dueDate) return false
      try {
        const dueDate = new Date(task.dueDate)
        return isBefore(dueDate, new Date())
      } catch (error) {
        return false
      }
    }).length
  }

  const getDueSoonTasks = () => {
    return tasks.filter((task) => {
      if (task.status === "completed" || !task.dueDate) return false
      try {
        const dueDate = new Date(task.dueDate)
        const tomorrow = addDays(new Date(), 1)
        return isToday(dueDate) || isTomorrow(dueDate)
      } catch (error) {
        return false
      }
    }).length
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tasks</h2>
          <p className="text-muted-foreground">Manage your tasks and assignments for this course</p>
        </div>
        <Button onClick={() => setIsAddingTask(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Task Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Tasks</span>
                <Badge variant="outline">{tasks.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">To Do</span>
                <Badge variant="outline" className="bg-gray-100">
                  {getTaskCountByStatus("todo")}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">In Progress</span>
                <Badge variant="outline" className="bg-blue-100">
                  {getTaskCountByStatus("in-progress")}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Completed</span>
                <Badge variant="outline" className="bg-green-100">
                  {getTaskCountByStatus("completed")}
                </Badge>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1 text-red-500" />
                    Overdue
                  </span>
                  <Badge variant="outline" className="bg-red-100 text-red-800">
                    {getOverdueTasks()}
                  </Badge>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-muted-foreground flex items-center">
                    <CalendarClock className="h-3 w-3 mr-1 text-orange-500" />
                    Due Soon
                  </span>
                  <Badge variant="outline" className="bg-orange-100 text-orange-800">
                    {getDueSoonTasks()}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tasks</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[140px]">
                  {sortDirection === "asc" ? (
                    <SortAsc className="h-4 w-4 mr-2" />
                  ) : (
                    <SortDesc className="h-4 w-4 mr-2" />
                  )}
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dueDate">Due Date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="createdAt">Created Date</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
              >
                {sortDirection === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}
            </div>
          </div>

          {sortedTasks.length > 0 ? (
            <div className="space-y-2">
              {sortedTasks.map((task) => (
                <Card key={task.id} className={cn("overflow-hidden", task.status === "completed" ? "opacity-70" : "")}>
                  <CardContent className="p-0">
                    <div className="flex items-start p-4 gap-3">
                      <div className="pt-1">
                        <Checkbox
                          checked={task.status === "completed"}
                          onCheckedChange={() => handleToggleStatus(task.id)}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3
                            className={cn(
                              "font-medium",
                              task.status === "completed" ? "line-through text-muted-foreground" : "",
                            )}
                          >
                            {task.title}
                          </h3>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditTask(task)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteTask(task.id)} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                          <div className={cn("flex items-center text-xs", getDueDateColor(task.dueDate, task.status))}>
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDueDate(task.dueDate)}
                          </div>

                          <Badge className={priorityColors[task.priority]} variant="secondary">
                            {priorityLabels[task.priority]}
                          </Badge>

                          <Badge className={statusColors[task.status]} variant="secondary">
                            {statusLabels[task.status]}
                          </Badge>

                          {task.tags.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              {task.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <CheckSquare className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">No tasks found</p>
              <p className="text-sm text-muted-foreground">
                {filter !== "all"
                  ? `No ${filter} tasks. Try changing the filter.`
                  : "Add your first task using the button above."}
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Add/Edit Task Dialog */}
      <Dialog
        open={isAddingTask || !!editingTask}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingTask(false)
            setEditingTask(null)
            setNewTask({
              title: "",
              description: "",
              dueDate: null,
              priority: "medium",
              status: "todo",
              tags: [],
            })
            setSelectedDate(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Add New Task"}</DialogTitle>
            <DialogDescription>
              {editingTask ? "Update the details of your task below." : "Fill in the details to create a new task."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
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
                <Label>Due Date (optional)</Label>
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
                  onValueChange={(value: "low" | "medium" | "high") => setNewTask({ ...newTask, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                        Low
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                        Medium
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                        High
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={newTask.status}
                onValueChange={(value: "todo" | "in-progress" | "completed") =>
                  setNewTask({ ...newTask, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tags (optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                />
                <Button type="button" onClick={handleAddTag} disabled={!newTag.trim()}>
                  Add
                </Button>
              </div>
              {newTask.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {newTask.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="px-2 py-1">
                      {tag}
                      <button
                        className="ml-1 text-muted-foreground hover:text-foreground"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingTask(false)
                setEditingTask(null)
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
            <Button onClick={editingTask ? handleUpdateTask : handleAddTask} disabled={!newTask.title.trim()}>
              {editingTask ? "Update Task" : "Add Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
