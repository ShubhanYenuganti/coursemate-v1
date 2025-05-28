"use client"

import { useState, useEffect } from "react"
import { ChevronDown, ChevronRight, BookOpen, Settings, Trash2 } from "lucide-react"
import { useCourses } from "@/contexts/course-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"

export function CourseList() {
  const { courses, selectedCourseId, selectCourse, removeCourse } = useCourses()
  const [expandedSemesters, setExpandedSemesters] = useState<Record<string, boolean>>({})
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null)
  const { toast } = useToast()

  // Auto-expand semesters when component mounts or when courses change
  useEffect(() => {
    const newExpandedState: Record<string, boolean> = {}

    courses.forEach((course) => {
      const termKey = course.termType === "semester" ? course.semester : course.quarter
      if (termKey) {
        newExpandedState[termKey] = true
      }
    })

    setExpandedSemesters(newExpandedState)
  }, [courses])

  // Group courses by semester/quarter
  const groupedCourses = courses.reduce<Record<string, typeof courses>>((acc, course) => {
    const termKey = course.termType === "semester" ? course.semester : course.quarter
    if (!termKey) return acc

    if (!acc[termKey]) {
      acc[termKey] = []
    }
    acc[termKey].push(course)
    return acc
  }, {})

  const toggleSemester = (semesterId: string) => {
    setExpandedSemesters((prev) => ({
      ...prev,
      [semesterId]: !prev[semesterId],
    }))
  }

  // Format term name for display
  const formatTermName = (termKey: string) => {
    return termKey
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const handleCourseClick = (courseId: string) => {
    console.log("Course clicked with ID:", courseId)
    selectCourse(courseId)
  }

  const handleDeleteCourse = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId)
    if (!course) return

    try {
      // Clear course-specific data from localStorage
      const keysToRemove = [
        `course-files-${courseId}`,
        `course-notes-${courseId}`,
        `course-resources-${courseId}`,
        `course-scheduler-tasks-${courseId}`,
        `course-study-blocks-${courseId}`,
        `course-task-breakdown-tasks-${courseId}`,
        `course-task-breakdown-subtasks-${courseId}`,
        `course-progress-sessions-${courseId}`,
        `course-progress-feedback-${courseId}`,
        `course-quizzes-${courseId}`,
        `course-quiz-attempts-${courseId}`,
        `course-flashcards-${courseId}`,
        `course-flashcard-sessions-${courseId}`,
        `course-learn-${courseId}`,
        `course-learn-sessions-${courseId}`,
      ]

      keysToRemove.forEach((key) => {
        try {
          localStorage.removeItem(key)
        } catch (e) {
          console.error(`Failed to remove ${key}:`, e)
        }
      })

      // First close the dialog to prevent UI issues
      setCourseToDelete(null)

      // Then remove the course
      removeCourse(courseId)

      // Show success toast
      toast({
        title: "Course deleted",
        description: `${course.code} has been removed from your courses`,
      })
    } catch (error) {
      console.error("Error deleting course:", error)
      setCourseToDelete(null)
      toast({
        title: "Error deleting course",
        description: "There was a problem deleting the course. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">My Courses</h2>
        {courses.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
                <span className="sr-only">Manage courses</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Manage Courses</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {courses.map((course) => (
                <DropdownMenuItem
                  key={course.id}
                  className="flex items-center justify-between"
                  onSelect={(e) => e.preventDefault()}
                >
                  <span className="truncate">{course.code}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-700"
                    onClick={() => setCourseToDelete(course.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {Object.keys(groupedCourses).length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-500">No courses added yet</p>
          <p className="mt-1 text-xs text-gray-400">Use the "Add Course" button to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(groupedCourses).map(([termKey, termCourses]) => (
            <div key={termKey} className="space-y-1">
              <button
                className="flex w-full items-center justify-between rounded-md px-2 py-1 text-sm font-medium hover:bg-gray-100"
                onClick={() => toggleSemester(termKey)}
              >
                <span>{formatTermName(termKey)}</span>
                {expandedSemesters[termKey] ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {expandedSemesters[termKey] && (
                <div className="ml-2 space-y-1 border-l pl-2">
                  {termCourses.map((course) => (
                    <Button
                      key={course.id}
                      variant={selectedCourseId === course.id ? "secondary" : "ghost"}
                      className="flex w-full items-center justify-start gap-2 rounded-md px-2 py-1 text-sm hover:bg-gray-100"
                      onClick={() => handleCourseClick(course.id)}
                    >
                      <BookOpen className="h-3.5 w-3.5 text-gray-500" />
                      <span>{course.code}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!courseToDelete} onOpenChange={() => setCourseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this course? This will permanently remove all associated data including
              notes, files, tasks, and progress. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => courseToDelete && handleDeleteCourse(courseToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Course
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
