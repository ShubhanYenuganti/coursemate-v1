"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

export type Course = {
  id: string
  code: string
  name: string
  credits: number
  termType: string
  semester?: string
  quarter?: string
}

type CourseContextType = {
  courses: Course[]
  selectedCourseId: string | null
  selectCourse: (courseId: string | null) => void
  addCourse: (course: Omit<Course, "id">) => void
  removeCourse: (courseId: string) => void
}

const CourseContext = createContext<CourseContextType | undefined>(undefined)

export function CourseProvider({ children }: { children: ReactNode }) {
  // Initialize with empty array or load from localStorage if available
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

  // Load courses from localStorage on initial render
  useEffect(() => {
    try {
      const savedCourses = localStorage.getItem("courses")
      if (savedCourses) {
        setCourses(JSON.parse(savedCourses))
      }

      // Also try to load selected course
      const savedSelectedCourse = localStorage.getItem("selectedCourseId")
      if (savedSelectedCourse) {
        setSelectedCourseId(savedSelectedCourse)
      }
    } catch (error) {
      console.error("Error loading data from localStorage:", error)
    }
  }, [])

  // Save courses to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("courses", JSON.stringify(courses))
  }, [courses])

  // Save selected course to localStorage whenever it changes
  useEffect(() => {
    if (selectedCourseId) {
      localStorage.setItem("selectedCourseId", selectedCourseId)
    } else {
      localStorage.removeItem("selectedCourseId")
    }
  }, [selectedCourseId])

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      const courseIdMatch = path.match(/^\/dashboard\/courses\/([^/]+)$/)

      if (courseIdMatch && courseIdMatch[1]) {
        // If the URL has a course ID, select that course
        setSelectedCourseId(courseIdMatch[1])
      } else if (path === '/dashboard') {
        // If we're on the dashboard root, deselect any course
        setSelectedCourseId(null)
      }
    }

    // Set up the event listener
    window.addEventListener('popstate', handlePopState)

    // Initial check in case the page is loaded with a course ID in the URL
    handlePopState()

    // Clean up the event listener
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const selectCourse = useCallback((courseId: string | null) => {
    console.log("selectCourse called with:", courseId)
    setSelectedCourseId(courseId)

    // Update the URL to include the course ID
    if (courseId) {
      window.history.pushState({}, '', `/dashboard/courses/${courseId}`)
    } else {
      window.history.pushState({}, '', '/dashboard')
    }
  }, [])

  const addCourse = useCallback((courseData: Omit<Course, "id">) => {
    const newCourseId = `course-${Date.now()}`
    const newCourse = {
      ...courseData,
      id: newCourseId,
    }
    setCourses((prevCourses) => [...prevCourses, newCourse])
    return newCourseId
  }, [])

  const removeCourse = useCallback(
    (courseId: string) => {
      setCourses((prevCourses) => prevCourses.filter((course) => course.id !== courseId))

      // If the selected course is being deleted, deselect it first
      if (selectedCourseId === courseId) {
        setSelectedCourseId(null)
      }
    },
    [selectedCourseId],
  )

  const contextValue = {
    courses,
    selectedCourseId,
    selectCourse,
    addCourse,
    removeCourse,
  }

  return <CourseContext.Provider value={contextValue}>{children}</CourseContext.Provider>
}

export function useCourses() {
  const context = useContext(CourseContext)
  if (context === undefined) {
    throw new Error("useCourses must be used within a CourseProvider")
  }
  return context
}
