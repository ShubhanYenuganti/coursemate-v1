import React from "react"
import { Course } from "../types"
import { Bookmark, Star, Users, Eye } from "lucide-react"
import Link from "next/link"

interface CourseGridProps {
  courses: Course[]
  onSaveCourse: (courseId: number) => void
  onDismissAIRecommendation: (courseId: number) => void
}

const CourseGrid: React.FC<CourseGridProps> = ({
  courses,
  onSaveCourse,
  onDismissAIRecommendation,
}) => {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <div
          key={course.id}
          className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
        >
          {course.isAIRecommended && (
            <button
              onClick={() => onDismissAIRecommendation(course.id)}
              className="absolute right-2 top-2 rounded-full bg-white/80 p-1 text-gray-500 backdrop-blur-sm hover:text-gray-700"
            >
              ×
            </button>
          )}
          <div className="aspect-video w-full overflow-hidden">
            <img
              src={course.thumbnail}
              alt={course.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          </div>
          <div className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">
                {course.category}
              </span>
              <button
                onClick={() => onSaveCourse(course.id)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <Bookmark className="h-5 w-5" />
              </button>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              {course.title}
            </h3>
            <p className="mb-4 text-sm text-gray-600">{course.description}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm font-medium text-gray-700">
                    {course.rating}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {course.students.toLocaleString()}
                  </span>
                </div>
              </div>
              <span className="text-sm font-medium text-blue-600">
                {course.creator}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {course.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-4">
              <Link href={`/courses/${course.id}/preview`}>
                <button className="flex w-full items-center justify-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                  <Eye className="h-4 w-4" />
                  <span>Preview Course</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default CourseGrid 