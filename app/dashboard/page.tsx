"use client"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { CourseList } from "@/components/dashboard/course-list"
import { RecommendedCourses } from "@/components/dashboard/recommended-courses"
import { AddCourseButton } from "@/components/dashboard/add-course-button"
import CourseDetail from "@/components/courses/course-detail"
import { useCourses } from "@/contexts/course-context"
import { Button } from "@/components/ui/button"
import { PlusCircle, Calendar, TrendingUp } from "lucide-react"
import { CalendarModal } from "@/components/dashboard/calendar-modal"
import { useState, useEffect } from "react"

export default function DashboardPage() {
  const { selectedCourseId, courses, selectCourse } = useCourses()
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // Handle course ID from URL when component mounts
  useEffect(() => {
    const path = window.location.pathname
    const courseIdMatch = path.match(/^\/dashboard\/courses\/([^/]+)$/)

    if (courseIdMatch && courseIdMatch[1]) {
      selectCourse(courseIdMatch[1])
    }
  }, [selectCourse])

  // Find the selected course
  const selectedCourse = selectedCourseId ? courses.find((course) => course.id === selectedCourseId) : null



  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="flex flex-1 relative">
        {/* Left Sidebar - Course List */}
        <div className="hidden w-64 border-r bg-muted/30 p-4 md:block">
          <CourseList />
        </div>

        {/* Main Content - Now takes full width without right sidebar */}
        <div className="flex-1 p-6">
          {selectedCourse ? (
            <CourseDetail course={selectedCourse} />
          ) : (
            <div className="mx-auto max-w-4xl space-y-8">
              <div className="text-center">
                <h1 className="text-4xl font-bold">Welcome, Student!</h1>
                <p className="mt-2 text-muted-foreground">Manage your courses and get personalized recommendations</p>
              </div>

              <div className="flex justify-center gap-4">
                <Button
                  className="gap-2"
                  onClick={() => document.querySelector<HTMLButtonElement>(".add-course-trigger")?.click()}
                >
                  <PlusCircle className="h-4 w-4" />
                  Add Course
                </Button>
                <Button variant="outline" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Track Progress
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setIsCalendarOpen(true)}>
                  <Calendar className="h-4 w-4" />
                  Calendar
                </Button>
              </div>

              <div className="rounded-lg border bg-card p-6">
                <h2 className="text-xl font-semibold">Recommended Courses</h2>
                <p className="mt-1 text-sm text-muted-foreground">Based on your major and academic progress</p>
                <RecommendedCourses />
              </div>
            </div>
          )}
        </div>

        {/* Fixed Add Course Button - Bottom Left */}
        <div className="fixed bottom-6 left-6 z-10">
          <AddCourseButton />
        </div>
      </div>

      {/* Calendar Modal */}
      <CalendarModal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} />
    </div>
  )
}
