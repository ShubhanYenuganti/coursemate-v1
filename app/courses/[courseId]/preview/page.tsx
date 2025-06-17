"use client"

import React, { useState } from "react"
import { mockCourses } from "../../discover/data/mockData"
import { ArrowLeft, FileText, MessageSquare, Star } from "lucide-react"
import Link from "next/link"

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
  params: { courseId: string }
}) {
  const [activeTab, setActiveTab] = useState("description")
  const course = mockCourses.find((c) => c.id === parseInt(params.courseId))

  if (!course) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Course not found</h1>
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
                  <p className="mt-4 text-gray-600">{course.description}</p>
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      What You'll Learn
                    </h3>
                    <ul className="mt-4 space-y-2">
                      <li className="flex items-start">
                        <span className="mr-2 text-blue-600">•</span>
                        <span className="text-gray-600">
                          Master key concepts and fundamentals
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-blue-600">•</span>
                        <span className="text-gray-600">
                          Apply knowledge through hands-on projects
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-blue-600">•</span>
                        <span className="text-gray-600">
                          Develop practical skills for real-world applications
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
              {activeTab === "resources" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Course Resources
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <h3 className="font-medium text-gray-900">Course Materials</h3>
                      <ul className="mt-2 space-y-2">
                        <li className="text-sm text-gray-600">• Course Syllabus</li>
                        <li className="text-sm text-gray-600">• Reading Materials</li>
                        <li className="text-sm text-gray-600">• Practice Exercises</li>
                      </ul>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <h3 className="font-medium text-gray-900">Additional Resources</h3>
                      <ul className="mt-2 space-y-2">
                        <li className="text-sm text-gray-600">• Reference Books</li>
                        <li className="text-sm text-gray-600">• Online Tools</li>
                        <li className="text-sm text-gray-600">• External Links</li>
                      </ul>
                    </div>
                  </div>
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
                        {course.rating}
                      </div>
                      <div>
                        <div className="flex">
                          {renderStars(Math.round(course.rating))}
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
              <div className="aspect-video w-full overflow-hidden rounded-lg">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    Rating
                  </span>
                  <div className="flex items-center">
                    <span className="text-lg font-semibold text-gray-900">
                      {course.rating}
                    </span>
                    <span className="ml-1 text-sm text-gray-500">/5</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    Students
                  </span>
                  <span className="text-sm text-gray-900">
                    {course.students.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    Category
                  </span>
                  <span className="text-sm text-gray-900">{course.category}</span>
                </div>
                <button className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                  Enroll Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 