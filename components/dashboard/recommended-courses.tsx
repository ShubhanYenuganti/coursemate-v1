"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { useCourses } from "@/contexts/course-context"
import { useToast } from "@/hooks/use-toast"

type RecommendedCourse = {
  id: string
  code: string
  name: string
  description: string
  credits: number
}

export function RecommendedCourses() {
  const { addCourse, selectCourse, courses } = useCourses()
  const { toast } = useToast()
  const [addedCourseIds, setAddedCourseIds] = useState<Set<string>>(new Set())

  // Sample data - in a real app, this would be fetched based on the user's major
  const allRecommendedCourses: RecommendedCourse[] = [
    {
      id: "cs173",
      code: "CS 173",
      name: "Discrete Structures",
      description:
        "Fundamental mathematical and logical tools for computer science: sets, functions, relations, basic proof techniques, Boolean algebra, logic, and discrete structures.",
      credits: 3,
    },
    {
      id: "cs225",
      code: "CS 225",
      name: "Data Structures",
      description:
        "Data abstractions: elementary data structures (lists, stacks, queues, and trees) and their implementation using an object-oriented programming language.",
      credits: 4,
    },
    {
      id: "math241",
      code: "MATH 241",
      name: "Calculus III",
      description:
        "Third course in calculus and analytic geometry: vectors and vector-valued functions, functions of several variables, partial derivatives, line integrals, and multiple integrals.",
      credits: 4,
    },
    {
      id: "cs374",
      code: "CS 374",
      name: "Algorithms & Models of Computation",
      description:
        "Fundamental algorithms and models of computation. Design and analysis of algorithms; time and space complexity.",
      credits: 4,
    },
    {
      id: "cs233",
      code: "CS 233",
      name: "Computer Architecture",
      description:
        "Basic computer architecture concepts: instruction set design, processor implementation, cache memory, virtual memory.",
      credits: 4,
    },
    {
      id: "stat400",
      code: "STAT 400",
      name: "Statistics and Probability I",
      description:
        "Introduction to probability theory and statistical inference with applications to engineering and science.",
      credits: 3,
    },
  ]

  // Load added course IDs from localStorage
  useEffect(() => {
    try {
      const savedAddedCourses = localStorage.getItem("added-recommended-courses")
      if (savedAddedCourses) {
        setAddedCourseIds(new Set(JSON.parse(savedAddedCourses)))
      }
    } catch (error) {
      console.error("Error loading added courses:", error)
    }
  }, [])

  // Save added course IDs to localStorage
  useEffect(() => {
    localStorage.setItem("added-recommended-courses", JSON.stringify(Array.from(addedCourseIds)))
  }, [addedCourseIds])

  // Also check if courses exist in the user's current courses
  useEffect(() => {
    const existingCourseCodes = new Set(courses.map((course) => course.code))
    const newAddedIds = new Set(addedCourseIds)

    allRecommendedCourses.forEach((recCourse) => {
      if (existingCourseCodes.has(recCourse.code)) {
        newAddedIds.add(recCourse.id)
      }
    })

    if (newAddedIds.size !== addedCourseIds.size) {
      setAddedCourseIds(newAddedIds)
    }
  }, [courses, addedCourseIds, allRecommendedCourses])

  // Filter out courses that have been added
  const availableRecommendedCourses = allRecommendedCourses.filter((course) => !addedCourseIds.has(course.id))

  const handleAddCourse = (course: RecommendedCourse) => {
    // Add the course to the user's courses
    const newCourseId = addCourse({
      code: course.code,
      name: course.name,
      credits: course.credits,
      termType: "semester",
      semester: "fall-2025", // Default to fall 2025
    })

    // Mark this recommended course as added
    setAddedCourseIds((prev) => new Set([...prev, course.id]))

    // Show success message
    toast({
      title: "Course added",
      description: `${course.code} has been added to your courses`,
    })

    // Navigate to the course page
    setTimeout(() => {
      selectCourse(newCourseId)
    }, 100)
  }

  if (availableRecommendedCourses.length === 0) {
    return (
      <div className="mt-4 text-center py-8">
        <p className="text-muted-foreground">All recommended courses have been added!</p>
        <p className="text-sm text-muted-foreground mt-1">Check back later for more course recommendations.</p>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-4">
      {availableRecommendedCourses.map((course) => (
        <div key={course.id} className="flex items-start justify-between rounded-md border p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">
                {course.code}: {course.name}
              </h3>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{course.credits} credits</span>
            </div>
            <p className="text-sm text-gray-600">{course.description}</p>
          </div>
          <Button size="sm" variant="ghost" className="ml-4 shrink-0" onClick={() => handleAddCourse(course)}>
            <PlusCircle className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      ))}
    </div>
  )
}
