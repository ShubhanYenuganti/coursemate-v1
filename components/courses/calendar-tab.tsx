"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, ChevronLeft, ChevronRight, Plus, Clock, MapPin, Trash2, Edit } from "lucide-react"
import type { Course } from "@/contexts/course-context"

type CalendarEvent = {
  id: string
  title: string
  description: string
  date: Date
  time: string
  location: string
  type: "assignment" | "exam" | "lecture" | "study-session" | "other"
  courseId: string
}

type CalendarTabProps = {
  course: Course
}

export function CalendarTab({ course }: CalendarTabProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"month" | "week" | "day">("month")
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isAddEventOpen, setIsAddEventOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    type: "assignment" as const,
  })

  // Load events from localStorage
  useEffect(() => {
    try {
      const savedEvents = localStorage.getItem("calendar-events")
      if (savedEvents) {
        const allEvents = JSON.parse(savedEvents)
        // Filter events for this course only
        const courseEvents = allEvents
          .filter((event: any) => event.courseId === course.id)
          .map((event: any) => ({
            ...event,
            date: new Date(event.date),
          }))
        setEvents(courseEvents)
      }
    } catch (error) {
      console.error("Error loading calendar events:", error)
    }
  }, [course.id])

  // Save events to localStorage
  const saveEvents = (updatedEvents: CalendarEvent[]) => {
    try {
      // Get all events from localStorage
      const savedEvents = localStorage.getItem("calendar-events")
      const allEvents = savedEvents ? JSON.parse(savedEvents) : []

      // Remove old events for this course
      const otherCourseEvents = allEvents.filter((event: any) => event.courseId !== course.id)

      // Add updated events for this course
      const newAllEvents = [...otherCourseEvents, ...updatedEvents]

      localStorage.setItem("calendar-events", JSON.stringify(newAllEvents))
      setEvents(updatedEvents)
    } catch (error) {
      console.error("Error saving calendar events:", error)
    }
  }

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.date) return

    const event: CalendarEvent = {
      id: Date.now().toString(),
      title: newEvent.title,
      description: newEvent.description,
      date: new Date(newEvent.date),
      time: newEvent.time,
      location: newEvent.location,
      type: newEvent.type,
      courseId: course.id,
    }

    const updatedEvents = [...events, event]
    saveEvents(updatedEvents)

    setNewEvent({
      title: "",
      description: "",
      date: "",
      time: "",
      location: "",
      type: "assignment",
    })
    setIsAddEventOpen(false)
  }

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event)
    setNewEvent({
      title: event.title,
      description: event.description,
      date: event.date.toISOString().split("T")[0],
      time: event.time,
      location: event.location,
      type: event.type,
    })
    setIsAddEventOpen(true)
  }

  const handleUpdateEvent = () => {
    if (!editingEvent || !newEvent.title || !newEvent.date) return

    const updatedEvent: CalendarEvent = {
      ...editingEvent,
      title: newEvent.title,
      description: newEvent.description,
      date: new Date(newEvent.date),
      time: newEvent.time,
      location: newEvent.location,
      type: newEvent.type,
    }

    const updatedEvents = events.map((event) => (event.id === editingEvent.id ? updatedEvent : event))
    saveEvents(updatedEvents)

    setEditingEvent(null)
    setNewEvent({
      title: "",
      description: "",
      date: "",
      time: "",
      location: "",
      type: "assignment",
    })
    setIsAddEventOpen(false)
  }

  const handleDeleteEvent = (eventId: string) => {
    const updatedEvents = events.filter((event) => event.id !== eventId)
    saveEvents(updatedEvents)
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "assignment":
        return "bg-blue-500"
      case "exam":
        return "bg-red-500"
      case "lecture":
        return "bg-green-500"
      case "study-session":
        return "bg-purple-500"
      default:
        return "bg-gray-500"
    }
  }

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case "assignment":
        return "Assignment"
      case "exam":
        return "Exam"
      case "lecture":
        return "Lecture"
      case "study-session":
        return "Study Session"
      default:
        return "Other"
    }
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.date)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const monthDays = getDaysInMonth(currentDate)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Course Calendar</h2>
          <p className="text-muted-foreground">
            {course.code}: {course.name}
          </p>
        </div>
        <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingEvent ? "Edit Event" : "Add New Event"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
                <Label htmlFor="type">Type</Label>
                <Select value={newEvent.type} onValueChange={(value: any) => setNewEvent({ ...newEvent, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assignment">Assignment</SelectItem>
                    <SelectItem value="exam">Exam</SelectItem>
                    <SelectItem value="lecture">Lecture</SelectItem>
                    <SelectItem value="study-session">Study Session</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  />
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
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  placeholder="Event location"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Event description"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={editingEvent ? handleUpdateEvent : handleAddEvent} className="flex-1">
                  {editingEvent ? "Update Event" : "Add Event"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddEventOpen(false)
                    setEditingEvent(null)
                    setNewEvent({
                      title: "",
                      description: "",
                      date: "",
                      time: "",
                      location: "",
                      type: "assignment",
                    })
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold">
            {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h3>
          <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
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

      {/* Calendar Grid */}
      <Card className="p-4">
        {view === "month" && (
          <div className="space-y-4">
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-2">
              {monthDays.map((day, index) => {
                if (!day) {
                  return <div key={index} className="p-2 h-24" />
                }

                const dayEvents = getEventsForDate(day)
                const isToday =
                  day.getDate() === new Date().getDate() &&
                  day.getMonth() === new Date().getMonth() &&
                  day.getFullYear() === new Date().getFullYear()

                return (
                  <div
                    key={day.toISOString()}
                    className={`p-2 h-24 border rounded-md cursor-pointer hover:bg-muted/50 ${
                      isToday ? "bg-blue-50 border-blue-200" : ""
                    }`}
                    onClick={() => {
                      setSelectedDate(day)
                      setNewEvent({ ...newEvent, date: day.toISOString().split("T")[0] })
                      setIsAddEventOpen(true)
                    }}
                  >
                    <div className="text-sm font-medium">{day.getDate()}</div>
                    <div className="space-y-1 mt-1">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className={`text-xs p-1 rounded text-white truncate ${getEventTypeColor(event.type)}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditEvent(event)
                          }}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-muted-foreground">+{dayEvents.length - 2} more</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Upcoming Events */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Upcoming Events</h3>
        <div className="space-y-3">
          {events
            .filter((event) => event.date >= new Date())
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .slice(0, 5)
            .map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getEventTypeColor(event.type)}`} />
                  <div>
                    <div className="font-medium">{event.title}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {event.date.toLocaleDateString()}
                      </span>
                      {event.time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {event.time}
                        </span>
                      )}
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{getEventTypeBadge(event.type)}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => handleEditEvent(event)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteEvent(event.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          {events.filter((event) => event.date >= new Date()).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2" />
              <p>No upcoming events for this course</p>
              <p className="text-sm">Click "Add Event" to create your first event</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
