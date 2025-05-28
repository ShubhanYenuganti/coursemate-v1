"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, subDays, eachDayOfInterval } from "date-fns"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { ArrowUpRight, ArrowDownRight, Minus, ThumbsUp, Clock, Calendar, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Course } from "@/contexts/course-context"

type ProgressTrackerProps = {
  course: Course
}

type StudySession = {
  id: string
  date: Date
  duration: number
  completed: boolean
  taskTitle: string
}

type FeedbackItem = {
  id: string
  date: Date
  type: "strength" | "improvement" | "suggestion"
  content: string
}

export function ProgressTracker({ course }: ProgressTrackerProps) {
  // Add course-specific state management
  const [studySessionsByCourse, setStudySessionsByCourse] = useState<Record<string, StudySession[]>>({})
  const [feedbackByCourse, setFeedbackByCourse] = useState<Record<string, FeedbackItem[]>>({})

  // Load course-specific data
  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem(`course-progress-sessions-${course.id}`)
      const savedFeedback = localStorage.getItem(`course-progress-feedback-${course.id}`)

      if (savedSessions) {
        setStudySessionsByCourse((prev) => ({
          ...prev,
          [course.id]: JSON.parse(savedSessions).map((session: any) => ({
            ...session,
            date: new Date(session.date),
          })),
        }))
      } else {
        // Set default sessions for new courses
        setStudySessionsByCourse((prev) => ({
          ...prev,
          [course.id]: [
            {
              id: "session-1",
              date: subDays(new Date(), 6),
              duration: 45,
              completed: true,
              taskTitle: "Review Chapter 1",
            },
            {
              id: "session-2",
              date: subDays(new Date(), 5),
              duration: 30,
              completed: true,
              taskTitle: "Practice Problems 1-10",
            },
            {
              id: "session-3",
              date: subDays(new Date(), 4),
              duration: 60,
              completed: true,
              taskTitle: "Watch Lecture Video",
            },
            {
              id: "session-4",
              date: subDays(new Date(), 3),
              duration: 25,
              completed: false,
              taskTitle: "Review Chapter 2",
            },
            {
              id: "session-5",
              date: subDays(new Date(), 2),
              duration: 40,
              completed: true,
              taskTitle: "Complete Assignment",
            },
            {
              id: "session-6",
              date: subDays(new Date(), 1),
              duration: 35,
              completed: true,
              taskTitle: "Study Group Session",
            },
            {
              id: "session-7",
              date: new Date(),
              duration: 50,
              completed: true,
              taskTitle: "Midterm Preparation",
            },
          ],
        }))
      }

      if (savedFeedback) {
        setFeedbackByCourse((prev) => ({
          ...prev,
          [course.id]: JSON.parse(savedFeedback).map((item: any) => ({
            ...item,
            date: new Date(item.date),
          })),
        }))
      }
    } catch (error) {
      console.error("Error loading progress data:", error)
    }
  }, [course.id])

  // Save to localStorage
  useEffect(() => {
    const courseSessions = studySessionsByCourse[course.id] || []
    const courseFeedback = feedbackByCourse[course.id] || []

    if (courseSessions.length > 0) {
      localStorage.setItem(`course-progress-sessions-${course.id}`, JSON.stringify(courseSessions))
    }
    if (courseFeedback.length > 0) {
      localStorage.setItem(`course-progress-feedback-${course.id}`, JSON.stringify(courseFeedback))
    }
  }, [studySessionsByCourse, feedbackByCourse, course.id])

  // Update all references to use course-specific data
  const studySessions = studySessionsByCourse[course.id] || []
  const feedback = feedbackByCourse[course.id] || []

  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("week")

  // Calculate total study time
  const totalStudyTime = studySessions
    .filter((session) => session.completed)
    .reduce((total, session) => total + session.duration, 0)

  // Calculate completion rate
  const completionRate = Math.round(
    (studySessions.filter((session) => session.completed).length / studySessions.length) * 100,
  )

  // Calculate average daily study time
  const averageDailyStudyTime = Math.round(totalStudyTime / 7)

  // Calculate streak (consecutive days with completed sessions)
  const calculateStreak = () => {
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 30; i++) {
      const date = subDays(today, i)
      const sessionsOnDate = studySessions.filter(
        (session) =>
          session.completed &&
          session.date.getDate() === date.getDate() &&
          session.date.getMonth() === date.getMonth() &&
          session.date.getFullYear() === date.getFullYear(),
      )

      if (sessionsOnDate.length > 0) {
        streak++
      } else if (i < 7) {
        // Only check the last 7 days for streak
        break
      }
    }

    return streak
  }

  // Prepare chart data
  const prepareChartData = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let startDate: Date
    if (timeRange === "week") {
      startDate = subDays(today, 6)
    } else if (timeRange === "month") {
      startDate = subDays(today, 29)
    } else {
      startDate = subDays(today, 90) // "all" shows last 90 days
    }

    const dateRange = eachDayOfInterval({ start: startDate, end: today })

    return dateRange.map((date) => {
      const sessionsOnDate = studySessions.filter(
        (session) =>
          session.completed &&
          session.date.getDate() === date.getDate() &&
          session.date.getMonth() === date.getMonth() &&
          session.date.getFullYear() === date.getFullYear(),
      )

      const totalMinutes = sessionsOnDate.reduce((total, session) => total + session.duration, 0)

      return {
        date: format(date, "MMM dd"),
        minutes: totalMinutes,
      }
    })
  }

  const chartData = prepareChartData()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Progress Tracker</h2>
        <p className="text-muted-foreground">
          Track your study progress and get personalized feedback to improve your learning efficiency.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Total Study Time</span>
              <div className="flex items-baseline mt-1">
                <span className="text-2xl font-bold">{totalStudyTime}</span>
                <span className="text-sm text-muted-foreground ml-1">minutes</span>
              </div>
              <div className="flex items-center mt-2 text-xs text-green-600">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                <span>12% from last week</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Completion Rate</span>
              <div className="flex items-baseline mt-1">
                <span className="text-2xl font-bold">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-1.5 mt-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Daily Average</span>
              <div className="flex items-baseline mt-1">
                <span className="text-2xl font-bold">{averageDailyStudyTime}</span>
                <span className="text-sm text-muted-foreground ml-1">min/day</span>
              </div>
              <div className="flex items-center mt-2 text-xs text-red-600">
                <ArrowDownRight className="h-3 w-3 mr-1" />
                <span>5% from last week</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Current Streak</span>
              <div className="flex items-baseline mt-1">
                <span className="text-2xl font-bold">{calculateStreak()}</span>
                <span className="text-sm text-muted-foreground ml-1">days</span>
              </div>
              <div className="flex items-center mt-2 text-xs text-muted-foreground">
                <Minus className="h-3 w-3 mr-1" />
                <span>Same as last week</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Feedback */}
      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Study Time
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2">
            <Clock className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2">
            <ThumbsUp className="h-4 w-4" />
            Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="pt-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Study Time Distribution</h3>
                <Select value={timeRange} onValueChange={(value: "week" | "month" | "all") => setTimeRange(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Last Week</SelectItem>
                    <SelectItem value="month">Last Month</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={10} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickMargin={10}
                      label={{
                        value: "Minutes",
                        angle: -90,
                        position: "insideLeft",
                        style: { textAnchor: "middle", fontSize: 12 },
                      }}
                    />
                    <Tooltip
                      formatter={(value) => [`${value} minutes`, "Study Time"]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Bar dataKey="minutes" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="pt-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-4">Recent Study Sessions</h3>

              <div className="space-y-4">
                {studySessions
                  .slice()
                  .reverse()
                  .map((session) => (
                    <div
                      key={session.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-md border",
                        !session.completed && "bg-muted/30",
                      )}
                    >
                      <div>
                        <div className="font-medium">{session.taskTitle}</div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(session.date, "MMM dd, yyyy")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {session.duration} minutes
                          </span>
                        </div>
                      </div>

                      <div>
                        {session.completed ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Completed</span>
                        ) : (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Missed</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="pt-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-4">Personalized Feedback</h3>

              <div className="space-y-4">
                {feedback.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "p-4 rounded-md border",
                      item.type === "strength" && "bg-green-50 border-green-200",
                      item.type === "improvement" && "bg-amber-50 border-amber-200",
                      item.type === "suggestion" && "bg-blue-50 border-blue-200",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full",
                          item.type === "strength" && "bg-green-100 text-green-800",
                          item.type === "improvement" && "bg-amber-100 text-amber-800",
                          item.type === "suggestion" && "bg-blue-100 text-blue-800",
                        )}
                      >
                        {item.type === "strength" && "Strength"}
                        {item.type === "improvement" && "Area for Improvement"}
                        {item.type === "suggestion" && "Suggestion"}
                      </span>
                      <span className="text-xs text-muted-foreground">{format(item.date, "MMM dd, yyyy")}</span>
                    </div>
                    <p className="text-sm">{item.content}</p>
                  </div>
                ))}

                <Button className="w-full">Get More Personalized Feedback</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
