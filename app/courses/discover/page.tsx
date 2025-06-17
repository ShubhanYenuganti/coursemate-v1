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

const CoursesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<Filter[]>(filterOptions)
  const [selectedSort, setSelectedSort] = useState("smart")
  const [courses, setCourses] = useState<Course[]>(mockCourses)
  const [loading, setLoading] = useState(false)
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
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      let filteredCourses = [...mockCourses]

      // Apply search filter
      if (searchQuery) {
        filteredCourses = filteredCourses.filter(
          (course) =>
            course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            course.tags.some((tag) =>
              tag.toLowerCase().includes(searchQuery.toLowerCase())
            )
        )
      }

      // Apply active filters
      const activeFilters = filters.filter((f) => f.active)
      if (activeFilters.length > 0) {
        filteredCourses = filteredCourses.filter((course) => {
          return activeFilters.some((filter) => {
            switch (filter.id) {
              case "popular":
                return course.isPopular
              case "new":
                return course.isNew
              case "rated":
                return course.rating >= 4.5
              case "ai":
                return course.isAIRecommended
              default:
                return true
            }
          })
        })
      }

      // Apply sorting
      switch (selectedSort) {
        case "popular":
          filteredCourses.sort((a, b) => b.students - a.students)
          break
        case "rating":
          filteredCourses.sort((a, b) => b.rating - a.rating)
          break
        case "newest":
          filteredCourses.sort((a, b) => (a.isNew ? -1 : 1))
          break
        default:
          // Smart sort - combination of rating and popularity
          filteredCourses.sort(
            (a, b) =>
              b.rating * Math.log(b.students) - a.rating * Math.log(a.students)
          )
      }

      setCourses(filteredCourses)
      setLoading(false)
    }, 500)
  }, [searchQuery, filters, selectedSort])

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

  const totalPages = Math.ceil(courses.length / coursesPerPage)
  const paginatedCourses = courses.slice(
    (currentPage - 1) * coursesPerPage,
    currentPage * coursesPerPage
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/courses"
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Courses
          </Link>
        </div>
      </div>

      {/* Header */}
      <CourseHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <SearchAndFilters
          filters={filters}
          onFilterToggle={toggleFilter}
          sortOptions={sortOptions}
          selectedSort={selectedSort}
          onSortChange={setSelectedSort}
        />

        {/* AI Suggestions Banner */}
        {showAISuggestions && (
          <AISuggestionsBanner
            onDismiss={() => setShowAISuggestions(false)}
          />
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : (
          <>
            <CourseGrid
              courses={paginatedCourses}
              onSaveCourse={handleSaveCourse}
              onDismissAIRecommendation={handleDismissAIRecommendation}
            />
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </div>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={handleScrollToTop}
          className="fixed bottom-8 right-8 rounded-full bg-blue-600 p-3 text-white shadow-lg hover:bg-blue-700"
        >
          <ArrowLeft className="h-6 w-6 rotate-90" />
        </button>
      )}
    </div>
  )
}

export default CoursesPage 