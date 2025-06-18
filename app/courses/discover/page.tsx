"use client"

import React, { useState, useEffect } from "react"
import { ArrowUp, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import CourseHeader from "./components/CourseHeader"
import SearchAndFilters from "./components/SearchAndFilters"
import AISuggestionsBanner from "./components/AISuggestionsBanner"
import CourseGrid from "./components/CourseGrid"
import Pagination from "./components/Pagination"
import { mockCourses, filterOptions, sortOptions } from "./data/mockData"
import { Course, Filter, SortOption } from "./types"
import Link from "next/link"
import { courseService } from '@/lib/api/courseService'
import { CourseData } from '@/lib/api/courseService'

const CoursesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<Filter[]>(filterOptions)
  const [selectedSort, setSelectedSort] = useState("smart")
  const [courses, setCourses] = useState<Course[]>([])
  const [total, setTotal] = useState<number>(0)
  const [page, setPage] = useState<number>(1)
  const [perPage, setPerPage] = useState<number>(10)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [showAISuggestions, setShowAISuggestions] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const coursesPerPage = 6

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const fetchPublicCourses = async () => {
      setIsLoading(true)
      try {
        const data = await courseService.getPublicCourses(page, perPage, searchQuery, "")
        const mappedCourses = data.courses.map((courseData: CourseData) => ({
          id: courseData.id || "",
          title: courseData.title,
          description: courseData.description,
          subject: courseData.subject,
          category: courseData.subject || "Uncategorized",
          thumbnail: courseData.courseImage || null,
          creator: courseData.professor || "Unknown",
          rating: 0,
          students: 0,
          isNew: false,
          isPopular: false,
          isAIRecommended: false,
          tags: courseData.tags || []
        }))
        setCourses(mappedCourses)
        setTotal(data.total)
        setPage(data.page)
        setPerPage(data.per_page)
      } catch (error) {
        console.error("Failed to fetch public courses:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPublicCourses()
  }, [page, perPage, searchQuery])

  const toggleFilter = (filterId: string) => {
    setFilters((prev) =>
      prev.map((filter) =>
        filter.id === filterId
          ? { ...filter, active: !filter.active }
          : filter
      )
    )
  }

  const handleSaveCourse = (courseId: number) => {
    // Implement save course functionality
    console.log("Saving course:", courseId)
  }

  const handleDismissAIRecommendation = (courseId: number) => {
    setCourses((prev) =>
      prev.map((course) =>
        course.id === courseId
          ? { ...course, isAIRecommended: false }
          : course
      )
    )
  }

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const totalPages = Math.ceil(total / perPage)
  const paginatedCourses = courses.slice(
    (currentPage - 1) * coursesPerPage,
    currentPage * coursesPerPage
  )

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value)
    setPage(1) // Reset to first page on new search
  }

  const handleSubjectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    // Implement subject change logic
    console.log("Subject changed to:", event.target.value)
    setPage(1) // Reset to first page on new filter
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="container mx-auto px-6 py-5">
          <Link
            href="/courses"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Courses
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="px-6 py-8">
          <CourseHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-10">
        {/* Search and Filters */}
        <div className="mb-8">
          <SearchAndFilters
            filters={filters}
            onFilterToggle={toggleFilter}
            sortOptions={sortOptions}
            selectedSort={selectedSort}
            onSortChange={setSelectedSort}
          />
        </div>

        {/* AI Suggestions Banner */}
        {showAISuggestions && (
          <div className="mb-8">
            <AISuggestionsBanner
              onDismiss={() => setShowAISuggestions(false)}
            />
          </div>
        )}

        {/* Course Grid */}
        {courses.length === 0 ? (
          <p className="text-center text-gray-500">No public courses found.</p>
        ) : (
          <div className="space-y-8">
            <CourseGrid
              courses={paginatedCourses}
              onSaveCourse={handleSaveCourse}
              onDismissAIRecommendation={handleDismissAIRecommendation}
            />
            {totalPages > 1 && (
              <div className="pt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={handleScrollToTop}
          className="fixed bottom-8 right-8 rounded-full bg-blue-600 p-4 text-white shadow-xl hover:bg-blue-700 transition-all duration-200 hover:scale-105"
        >
          <ArrowLeft className="h-6 w-6 rotate-90" />
        </button>
      )}
    </div>
  )
}

export default CoursesPage 