"use client"

import React, { useState, useEffect } from "react"
import { ArrowLeft, FileText, MessageSquare, Star } from "lucide-react"
import Link from "next/link"
import { courseService, CourseData } from "@/lib/api/courseService"

interface Tab {
  id: string
  label: string
  icon: React.ReactNode
}

const tabs: Tab[] = [
  { id: "description", label: "Description", icon: null },
  { id: "resources", label: "Resources", icon: <FileText className="h-4 w-4" /> },
  { id: "discussions", label: "Discussions", icon: <MessageSquare className="h-4 w-4" /> },
  { id: "reviews", label: "Reviews", icon: <Star className="h-4 w-4" /> },
]

// Mock reviews data
const mockReviews = [
  {
    id: 1,
    author: "Sarah Johnson",
    rating: 5,
    date: "2024-03-15",
    content: "This course exceeded my expectations! The content is well-structured and the instructor explains complex concepts in a way that's easy to understand.",
  },
  {
    id: 2,
    author: "Michael Chen",
    rating: 4,
    date: "2024-03-10",
    content: "Great course with practical examples. The only improvement I'd suggest is adding more hands-on exercises.",
  },
  {
    id: 3,
    author: "Emma Rodriguez",
    rating: 5,
    date: "2024-03-05",
    content: "The best course I've taken on this subject. The resources provided are comprehensive and the community is very supportive.",
  },
]

export default function CoursePreviewPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const [activeTab, setActiveTab] = useState("description")
  const [course, setCourse] = useState<CourseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const resolvedParams = React.use(params)

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true)
        const courseData = await courseService.getCourse(resolvedParams.courseId)
        setCourse(courseData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load course')
      } finally {
        setLoading(false)
      }
    }

    fetchCourse()
  }, [resolvedParams.courseId])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading course...</p>
        </div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Course not found</h1>
          <p className="mt-2 text-gray-600">{error}</p>
          <Link
            href="/courses/discover"
            className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Discover
          </Link>
        </div>
      </div>
    )
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link
              href="/courses/discover"
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Discover
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Course Info */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="mb-6 border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    }`}
                  >
                    {tab.icon && <span className="mr-2">{tab.icon}</span>}
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="rounded-lg bg-white p-6 shadow">
              {activeTab === "description" && (
                <div className="prose max-w-none">
                  <h2 className="text-xl font-semibold text-gray-900">
                    About This Course
                  </h2>
                  <p className="mt-4 text-gray-600">{course.description || 'No description available.'}</p>
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Course Details
                    </h3>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Subject:</span>
                        <p className="text-gray-900">{course.subject}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Course Code:</span>
                        <p className="text-gray-900">{course.courseCode}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Professor:</span>
                        <p className="text-gray-900">{course.professor}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Units:</span>
                        <p className="text-gray-900">{course.units}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Semester:</span>
                        <p className="text-gray-900">{course.semester}</p>
                      </div>
                    </div>
                    {course.tags && course.tags.length > 0 && (
                      <div className="mt-4">
                        <span className="text-sm font-medium text-gray-500">Tags:</span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {course.tags.map((tag: string, index: number) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeTab === "resources" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Course Resources
                  </h2>
                  {course.materials && course.materials.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-lg border border-gray-200 p-4">
                        <h3 className="font-medium text-gray-900">Course Materials</h3>
                                                 <ul className="mt-2 space-y-2">
                           {course.materials.map((material: string, index: number) => (
                             <li key={index} className="text-sm text-gray-600">• {material}</li>
                           ))}
                         </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-gray-200 p-4">
                      <p className="text-sm text-gray-600">No materials available for this course yet.</p>
                    </div>
                  )}
                </div>
              )}
              {activeTab === "discussions" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Course Discussions
                  </h2>
                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">
                      Join the conversation! This is where you can:
                    </p>
                    <ul className="mt-2 space-y-2">
                      <li className="text-sm text-gray-600">• Ask questions about course content</li>
                      <li className="text-sm text-gray-600">• Share insights and experiences</li>
                      <li className="text-sm text-gray-600">• Connect with other students</li>
                      <li className="text-sm text-gray-600">• Get help from instructors</li>
                    </ul>
                    <button className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                      Start a Discussion
                    </button>
                  </div>
                </div>
              )}
              {activeTab === "reviews" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Course Reviews
                    </h2>
                    <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                      Write a Review
                    </button>
                  </div>
                  
                  {/* Overall Rating */}
                  <div className="rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center space-x-4">
                      <div className="text-4xl font-bold text-gray-900">
                        4.5
                      </div>
                      <div>
                        <div className="flex">
                          {renderStars(4)}
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          Based on {mockReviews.length} reviews
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reviews List */}
                  <div className="space-y-6">
                    {mockReviews.map((review) => (
                      <div
                        key={review.id}
                        className="rounded-lg border border-gray-200 p-6"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="h-10 w-10 rounded-full bg-gray-200" />
                            <div>
                              <h3 className="font-medium text-gray-900">
                                {review.author}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {new Date(review.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex">
                            {renderStars(review.rating)}
                          </div>
                        </div>
                        <p className="mt-4 text-gray-600">{review.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 rounded-lg bg-white p-6 shadow">
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
                <h3 className="text-white text-xl font-bold text-center px-4">
                  {course.subject}
                </h3>
              </div>
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    Progress
                  </span>
                  <span className="text-sm text-gray-900">
                    {course.dailyProgress || 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    Units
                  </span>
                  <span className="text-sm text-gray-900">
                    {course.units}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    Visibility
                  </span>
                  <span className="text-sm text-gray-900">{course.visibility}</span>
                </div>
                <button className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                  Contact Student
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 