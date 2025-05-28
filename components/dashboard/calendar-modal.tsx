"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useCourses } from "@/contexts/course-context"
import { ChevronLeft, ChevronRight, Plus, Edit, Trash2, Clock, MapPin, BookOpen } from "lucide-react"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isToday,
  parseISO,
  startOfWeek as startOfWeekFn,
  endOfWeek as endOfWeekFn,
} from "date-fns"

interface CalendarEvent {
  id: string
  title: string
  description: string
  date: string
  time: string
  location: string
  courseId: string
  type: "assignment" | "exam" | "lecture" | "study" | "other"
  source?: "manual" | "course-data" // Track if event comes from course data
}

interface CalendarModalProps {
  isOpen: boolean
  onClose: () => void
}

const eventTypeColors = {
  assignment: "bg-blue-500",
  exam: "bg-red-500",
  lecture: "bg-green-500",
  study: "bg-purple-500",
  other: "bg-gray-500",
}

const eventTypeLabels = {
  assignment: "Assignment",
  exam: "Exam",
  lecture: "Lecture",
  study: "Study Session",
  other: "Other",
}

export function CalendarModal({ isOpen, onClose }: CalendarModalProps) {
  const { courses } = useCourses()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"month" | "week" | "day">("month")
  const [manualEvents, setManualEvents] = useState<CalendarEvent[]>([])
  const [courseEvents, setCourseEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isAddingEvent, setIsAddingEvent] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [visibleCourses, setVisibleCourses] = useState<Set<string>>(new Set())
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    courseId: "",
    type: "other" as CalendarEvent["type"],
  })

  // Initialize visible courses when courses change
  useEffect(() => {
    if (courses.length > 0) {
      setVisibleCourses(new Set(courses.map((course) => course.id)))
    }
  }, [courses])

  // Load manual events from localStorage
  useEffect(() => {
    const savedEvents = localStorage.getItem("calendar-events")
    if (savedEvents) {
      setManualEvents(JSON.parse(savedEvents))
    }
  }, [])

  // Save manual events to localStorage
  useEffect(() => {
    localStorage.setItem("calendar-events", JSON.stringify(manualEvents))
  }, [manualEvents])

  // Load course data and convert to calendar events
  useEffect(() => {
    const loadCourseEvents = () => {
      const allCourseEvents: CalendarEvent[] = []

      courses.forEach((course) => {
        try {
          // Load scheduler tasks (from the new location)
          const savedSchedulerTasks = localStorage.getItem(`course-scheduler-tasks-${course.id}`)
          if (savedSchedulerTasks) {
            const tasks = JSON.parse(savedSchedulerTasks)
            tasks.forEach((task: any) => {
              if (task.dueDate) {
                allCourseEvents.push({
                  id: `scheduler-task-${task.id}`,
                  title: `Task: ${task.title}`,
                  description: task.description || "",
                  date: format(new Date(task.dueDate), "yyyy-MM-dd"),
                  time: "23:59", // Default due time
                  location: "",
                  courseId: course.id,
                  type: task.priority === "high" ? "exam" : "assignment",
                  source: "course-data",
                })
              }
            })
          }

          // Load course notes (which may contain study schedules)
          const savedNotes = localStorage.getItem(`course-notes-${course.id}`)
          if (savedNotes) {
            const notes = JSON.parse(savedNotes)
            notes.forEach((note: any) => {
              if (note.createdAt) {
                allCourseEvents.push({
                  id: `note-${note.id}`,
                  title: `Note: ${note.title}`,
                  description: note.content.substring(0, 100) + "...",
                  date: format(new Date(note.createdAt), "yyyy-MM-dd"),
                  time: format(new Date(note.createdAt), "HH:mm"),
                  location: "",
                  courseId: course.id,
                  type: "other",
                  source: "course-data",
                })
              }
            })
          }

          // Load course resources (external resources with dates)
          const savedResources = localStorage.getItem(`course-resources-${course.id}`)
          if (savedResources) {
            const resources = JSON.parse(savedResources)
            resources.forEach((resource: any) => {
              if (resource.addedAt) {
                allCourseEvents.push({
                  id: `resource-${resource.id}`,
                  title: `Resource: ${resource.title}`,
                  description: resource.description || resource.url,
                  date: format(new Date(resource.addedAt), "yyyy-MM-dd"),
                  time: format(new Date(resource.addedAt), "HH:mm"),
                  location: resource.url,
                  courseId: course.id,
                  type: "other",
                  source: "course-data",
                })
              }
            })
          }

          // Load study sessions from scheduler
          const savedScheduler = localStorage.getItem(`course-scheduler-${course.id}`)
          if (savedScheduler) {
            const schedulerData = JSON.parse(savedScheduler)

            // Study sessions
            if (schedulerData.studySessions) {
              schedulerData.studySessions.forEach((session: any) => {
                if (session.date) {
                  allCourseEvents.push({
                    id: `study-${session.id}`,
                    title: `Study: ${session.topic}`,
                    description: `Duration: ${session.duration} minutes`,
                    date: session.date,
                    time: session.time || "09:00",
                    location: session.location || "",
                    courseId: course.id,
                    type: "study",
                    source: "course-data",
                  })
                }
              })
            }

            // Assignments/Tasks
            if (schedulerData.assignments) {
              schedulerData.assignments.forEach((assignment: any) => {
                if (assignment.dueDate) {
                  allCourseEvents.push({
                    id: `assignment-${assignment.id}`,
                    title: `Assignment: ${assignment.title}`,
                    description: assignment.description || "",
                    date: assignment.dueDate,
                    time: assignment.dueTime || "23:59",
                    location: "",
                    courseId: course.id,
                    type: "assignment",
                    source: "course-data",
                  })
                }
              })
            }

            // Exams/Tests
            if (schedulerData.exams) {
              schedulerData.exams.forEach((exam: any) => {
                if (exam.date) {
                  allCourseEvents.push({
                    id: `exam-${exam.id}`,
                    title: `Exam: ${exam.title}`,
                    description: exam.description || "",
                    date: exam.date,
                    time: exam.time || "09:00",
                    location: exam.location || "",
                    courseId: course.id,
                    type: "exam",
                    source: "course-data",
                  })
                }
              })
            }

            // Tasks from task breakdown
            if (schedulerData.tasks) {
              schedulerData.tasks.forEach((task: any) => {
                if (task.dueDate) {
                  allCourseEvents.push({
                    id: `task-${task.id}`,
                    title: `Task: ${task.title}`,
                    description: task.description || "",
                    date: task.dueDate,
                    time: task.dueTime || "17:00",
                    location: "",
                    courseId: course.id,
                    type: task.type === "exam" ? "exam" : "assignment",
                    source: "course-data",
                  })
                }
              })
            }
          }

          // Load study tab data (AI-generated study sessions)
          const savedStudyData = localStorage.getItem(`course-study-${course.id}`)
          if (savedStudyData) {
            const studyData = JSON.parse(savedStudyData)

            // Quiz sessions
            if (studyData.quizSessions) {
              studyData.quizSessions.forEach((session: any) => {
                if (session.date) {
                  allCourseEvents.push({
                    id: `quiz-${session.id}`,
                    title: `Quiz Session: ${session.topic}`,
                    description: `${session.questions?.length || 0} questions`,
                    date: session.date,
                    time: session.time || "14:00",
                    location: "",
                    courseId: course.id,
                    type: "study",
                    source: "course-data",
                  })
                }
              })
            }

            // Flashcard sessions
            if (studyData.flashcardSessions) {
              studyData.flashcardSessions.forEach((session: any) => {
                if (session.date) {
                  allCourseEvents.push({
                    id: `flashcard-${session.id}`,
                    title: `Flashcards: ${session.topic}`,
                    description: `${session.cards?.length || 0} cards`,
                    date: session.date,
                    time: session.time || "15:00",
                    location: "",
                    courseId: course.id,
                    type: "study",
                    source: "course-data",
                  })
                }
              })
            }
          }
        } catch (error) {
          console.error(`Error loading data for course ${course.id}:`, error)
        }
      })

      setCourseEvents(allCourseEvents)
    }

    loadCourseEvents()
  }, [courses, isOpen]) // Reload when modal opens to get fresh data

  // Combine manual and course events
  const allEvents = [...manualEvents, ...courseEvents]

  const getCourseColor = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId)
    if (!course) return "bg-gray-500"

    // Generate consistent color based on course ID
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
      "bg-yellow-500",
      "bg-red-500",
      "bg-cyan-500",
    ]
    const index = courseId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
    return colors[index]
  }

  const getEventsForDate = (date: Date) => {
    return allEvents.filter((event) => {
      const isDateMatch = isSameDay(parseISO(event.date), date)
      const isCourseVisible = visibleCourses.has(event.courseId)
      return isDateMatch && isCourseVisible
    })
  }

  const getFilteredEvents = () => {
    return allEvents.filter((event) => visibleCourses.has(event.courseId))
  }

  const handleCourseVisibilityToggle = (courseId: string) => {
    const newVisibleCourses = new Set(visibleCourses)
    if (newVisibleCourses.has(courseId)) {
      newVisibleCourses.delete(courseId)
    } else {
      newVisibleCourses.add(courseId)
    }
    setVisibleCourses(newVisibleCourses)
  }

  const handleAddEvent = () => {
    if (!selectedDate) return

    const event: CalendarEvent = {
      id: Date.now().toString(),
      ...newEvent,
      date: format(selectedDate, "yyyy-MM-dd"),
      source: "manual",
    }

    setManualEvents([...manualEvents, event])
    setIsAddingEvent(false)
    setNewEvent({
      title: "",
      description: "",
      date: "",
      time: "",
      location: "",
      courseId: "",
      type: "other",
    })
  }

  const handleEditEvent = (event: CalendarEvent) => {
    // Only allow editing of manual events
    if (event.source === "course-data") {
      return // Don't allow editing course-generated events
    }

    setEditingEvent(event)
    setNewEvent({
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      courseId: event.courseId,
      type: event.type,
    })
  }

  const handleUpdateEvent = () => {
    if (!editingEvent) return

    const updatedEvents = manualEvents.map((event) =>
      event.id === editingEvent.id ? { ...editingEvent, ...newEvent, source: "manual" } : event,
    )

    setManualEvents(updatedEvents)
    setEditingEvent(null)
    setNewEvent({
      title: "",
      description: "",
      date: "",
      time: "",
      location: "",
      courseId: "",
      type: "other",
    })
  }

  const handleDeleteEvent = (eventId: string) => {
    // Only allow deleting manual events
    setManualEvents(manualEvents.filter((event) => event.id !== eventId))
  }

  const navigateCalendar = (direction: "prev" | "next") => {
    if (view === "month") {
      setCurrentDate(direction === "next" ? addMonths(currentDate, 1) : subMonths(currentDate, 1))
    } else if (view === "week") {
      setCurrentDate(direction === "next" ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1))
    } else {
      setCurrentDate(direction === "next" ? addDays(currentDate, 1) : subDays(currentDate, 1))
    }
  }

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    return (
      <div className="grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="p-2 text-center font-medium text-sm text-muted-foreground">
            {day}
          </div>
        ))}
        {days.map((day) => {
          const dayEvents = getEventsForDate(day)
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isCurrentDay = isToday(day)

          return (
            <div
              key={day.toString()}
              className={`min-h-[100px] p-1 border cursor-pointer hover:bg-muted/50 ${
                isCurrentMonth ? "bg-background" : "bg-muted/20"
              } ${isCurrentDay ? "ring-2 ring-primary" : ""}`}
              onClick={() => {
                setSelectedDate(day)
                setIsAddingEvent(true)
              }}
            >
              <div className={`text-sm font-medium ${isCurrentMonth ? "text-foreground" : "text-muted-foreground"}`}>
                {format(day, "d")}
              </div>
              <div className="space-y-1 mt-1">
                {dayEvents.slice(0, 3).map((event) => {
                  const course = courses.find((c) => c.id === event.courseId)
                  const isFromCourse = event.source === "course-data"
                  return (
                    <div
                      key={event.id}
                      className={`text-xs p-1 rounded text-white truncate ${getCourseColor(event.courseId)} ${
                        isFromCourse ? "opacity-90" : ""
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!isFromCourse) {
                          handleEditEvent(event)
                        }
                      }}
                      title={`${event.title} - ${course?.name || "Unknown Course"}${
                        isFromCourse ? " (From Course Data)" : ""
                      }`}
                    >
                      {event.title}
                    </div>
                  )
                })}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderWeekView = () => {
    const weekStart = startOfWeekFn(currentDate)
    const weekEnd = endOfWeekFn(currentDate)
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayEvents = getEventsForDate(day)
          const isCurrentDay = isToday(day)

          return (
            <div key={day.toString()} className="space-y-2">
              <div
                className={`text-center p-2 rounded ${
                  isCurrentDay ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                <div className="font-medium">{format(day, "EEE")}</div>
                <div className="text-lg">{format(day, "d")}</div>
              </div>
              <div className="space-y-1 min-h-[300px]">
                {dayEvents.map((event) => {
                  const course = courses.find((c) => c.id === event.courseId)
                  const isFromCourse = event.source === "course-data"
                  return (
                    <Card
                      key={event.id}
                      className={`cursor-pointer hover:shadow-md ${getCourseColor(event.courseId)} text-white ${
                        isFromCourse ? "opacity-90" : ""
                      }`}
                      onClick={() => !isFromCourse && handleEditEvent(event)}
                    >
                      <CardContent className="p-2">
                        <div className="font-medium text-sm">{event.title}</div>
                        {event.time && <div className="text-xs opacity-90">{event.time}</div>}
                        <div className="text-xs opacity-75">{course?.name || "Unknown Course"}</div>
                        <div className="text-xs opacity-60">
                          {eventTypeLabels[event.type]}
                          {isFromCourse && " (Auto)"}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setSelectedDate(day)
                    setIsAddingEvent(true)
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate)
    const isCurrentDay = isToday(currentDate)

    return (
      <div className="space-y-4">
        <div
          className={`text-center p-4 rounded-lg ${isCurrentDay ? "bg-primary text-primary-foreground" : "bg-muted"}`}
        >
          <h3 className="text-2xl font-bold">{format(currentDate, "EEEE")}</h3>
          <p className="text-lg">{format(currentDate, "MMMM d, yyyy")}</p>
        </div>

        <div className="space-y-3">
          {dayEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No events scheduled for this day</div>
          ) : (
            dayEvents.map((event) => {
              const course = courses.find((c) => c.id === event.courseId)
              const isFromCourse = event.source === "course-data"
              return (
                <Card key={event.id} className="hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getCourseColor(event.courseId)}>{eventTypeLabels[event.type]}</Badge>
                          <Badge variant="outline">{course?.name || "Unknown Course"}</Badge>
                          {isFromCourse && <Badge variant="secondary">Auto-Generated</Badge>}
                        </div>
                        <h4 className="font-semibold text-lg">{event.title}</h4>
                        {event.description && <p className="text-muted-foreground mt-1">{event.description}</p>}
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          {event.time && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {event.time}
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </div>
                          )}
                        </div>
                      </div>
                      {!isFromCourse && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEditEvent(event)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteEvent(event.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        <Button
          className="w-full"
          onClick={() => {
            setSelectedDate(currentDate)
            setIsAddingEvent(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>
    )
  }

  const getViewTitle = () => {
    switch (view) {
      case "month":
        return format(currentDate, "MMMM yyyy")
      case "week":
        const weekStart = startOfWeekFn(currentDate)
        const weekEnd = endOfWeekFn(currentDate)
        return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
      case "day":
        return format(currentDate, "EEEE, MMMM d, yyyy")
      default:
        return ""
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Course Calendar
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6">
          {/* Main Calendar Area */}
          <div className="flex-1">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigateCalendar("prev")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-lg font-semibold min-w-[200px] text-center">{getViewTitle()}</h3>
                <Button variant="outline" size="sm" onClick={() => navigateCalendar("next")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant={view === "month" ? "default" : "outline"} size="sm" onClick={() => setView("month")}>
                  Month
                </Button>
                <Button variant={view === "week" ? "default" : "outline"} size="sm" onClick={() => setView("week")}>
                  Week
                </Button>
                <Button variant={view === "day" ? "default" : "outline"} size="sm" onClick={() => setView("day")}>
                  Day
                </Button>
              </div>
            </div>

            {/* Calendar Content */}
            <div className="mb-4">
              {view === "month" && renderMonthView()}
              {view === "week" && renderWeekView()}
              {view === "day" && renderDayView()}
            </div>
          </div>

          {/* Course Filter Sidebar */}
          <div className="w-64 space-y-4">
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Course Visibility</h4>
              <div className="space-y-3">
                {courses.map((course) => {
                  const courseColor = getCourseColor(course.id)
                  const eventCount = allEvents.filter((event) => event.courseId === course.id).length
                  const autoEventCount = courseEvents.filter((event) => event.courseId === course.id).length

                  return (
                    <div key={course.id} className="flex items-center gap-3">
                      <Checkbox
                        id={`course-${course.id}`}
                        checked={visibleCourses.has(course.id)}
                        onCheckedChange={() => handleCourseVisibilityToggle(course.id)}
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <div className={`w-3 h-3 rounded-full ${courseColor}`} />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{course.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {course.code} • {eventCount} events ({autoEventCount} auto)
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {courses.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">No courses added yet</div>
                )}
              </div>
            </Card>

            {/* Event Legend */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Event Types</h4>
              <div className="space-y-2">
                {Object.entries(eventTypeLabels).map(([type, label]) => (
                  <div key={type} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${eventTypeColors[type as keyof typeof eventTypeColors]}`} />
                    <span className="text-sm">{label}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick Stats */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Quick Stats</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Events:</span>
                  <span className="font-medium">{getFilteredEvents().length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Auto-Generated:</span>
                  <span className="font-medium">
                    {courseEvents.filter((e) => visibleCourses.has(e.courseId)).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Manual Events:</span>
                  <span className="font-medium">
                    {manualEvents.filter((e) => visibleCourses.has(e.courseId)).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Visible Courses:</span>
                  <span className="font-medium">{visibleCourses.size}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Add/Edit Event Modal */}
        {(isAddingEvent || editingEvent) && (
          <div className="border-t pt-4 space-y-4">
            <h4 className="font-semibold">{editingEvent ? "Edit Event" : "Add New Event"}</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Event title"
                />
              </div>

              <div>
                <Label htmlFor="course">Course</Label>
                <Select
                  value={newEvent.courseId}
                  onValueChange={(value) => setNewEvent({ ...newEvent, courseId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getCourseColor(course.id)}`} />
                          {course.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={newEvent.type}
                  onValueChange={(value: CalendarEvent["type"]) => setNewEvent({ ...newEvent, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(eventTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded ${eventTypeColors[value as keyof typeof eventTypeColors]}`}
                          />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  placeholder="Event location"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Event description"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingEvent(false)
                  setEditingEvent(null)
                  setNewEvent({
                    title: "",
                    description: "",
                    date: "",
                    time: "",
                    location: "",
                    courseId: "",
                    type: "other",
                  })
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingEvent ? handleUpdateEvent : handleAddEvent}
                disabled={!newEvent.title || !newEvent.courseId}
              >
                {editingEvent ? "Update Event" : "Add Event"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
