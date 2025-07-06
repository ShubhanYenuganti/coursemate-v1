import React from 'react';
import { useRouter } from 'next/navigation';

export interface Course {
  id: number;
  name: string;
  professor: string;
  schedule: string;
  progress: number;
  icon: string;
  iconBg: string;
  iconColor: string;
  progressColor: string;
  dbId?: string; // Database ID for navigation
  banner?: string; // Course banner image
}

interface MyCoursesProps {
  courses?: Course[];
  onViewAllCourses?: () => void;
  onViewCourse?: (course: Course) => void;
  onContinueCourse?: (course: Course) => void;
}

const defaultCourses: Course[] = [
  {
    id: 1,
    name: 'Calculus 101',
    professor: 'Prof. Einstein',
    schedule: 'Mon, Wed, Fri',
    progress: 75,
    icon: '📐',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    progressColor: 'bg-red-600',
    banner: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=200&fit=crop',
  },
  {
    id: 2,
    name: 'Physics Fundamentals',
    professor: 'Prof. Newton',
    schedule: 'Tue, Thu',
    progress: 40,
    icon: '⚛️',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    progressColor: 'bg-blue-600',
    banner: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
  },
];

const MyCourses: React.FC<MyCoursesProps> = ({
  courses = [],
  onViewAllCourses,
  onViewCourse,
  onContinueCourse,
}) => {
  const coursesToDisplay = courses.length > 0 ? courses : defaultCourses;
  const router = useRouter();

  const handleViewDetails = (course: Course) => {
    onViewCourse && onViewCourse(course);
  };

  const handleContinue = (course: Course) => {
    onContinueCourse && onContinueCourse(course);
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-semibold text-gray-800">My Courses</h2>
        <button
          onClick={onViewAllCourses}
          className="text-indigo-500 font-medium flex items-center gap-1 hover:text-indigo-600 transition-colors"
        >
          View All Courses →
        </button>
      </div>

      {/* Course Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {coursesToDisplay.map((course) => (
          <div
            key={course.id}
            className="border border-gray-200 rounded-lg hover:border-indigo-500 hover:-translate-y-1 transition-all duration-200 hover:shadow-md overflow-hidden flex flex-col min-h-[280px]"
          >
            {/* Course Banner */}
            {course.banner && (
              <div className="w-full h-32 bg-gradient-to-r from-blue-500 to-purple-600 relative overflow-hidden">
                <img
                  src={course.banner}
                  alt={`${course.name} banner`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to gradient if image fails to load
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
            )}

            {/* Course Content */}
            <div className="p-6 flex flex-col h-full">
            {/* Course Header */}
              <div className="flex items-center mb-4">
                <div className={`w-12 h-12 ${course.iconBg} ${course.iconColor} rounded-lg flex items-center justify-center mr-4 text-lg`}>
                {course.icon}
              </div>
              <div>
                  <h3 className="font-semibold text-gray-800 text-lg">{course.name}</h3>
                  <div className="text-sm text-gray-600">
                  {course.professor} | {course.schedule}
                </div>
              </div>
            </div>

              {/* Spacer to push button to bottom */}
              <div className="flex-1"></div>

            {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => router.push(`/courses/${course.dbId}?tab=study`)}
                  className="flex-1 bg-gray-100 text-gray-800 py-2 px-3 rounded-md text-xs font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                >
                  <span role="img" aria-label="Study Plan">📋</span>
                  Study Plan
                </button>
                <button
                  onClick={() => router.push(`/courses/${course.dbId}?tab=materials`)}
                  className="flex-1 bg-gray-100 text-gray-800 py-2 px-3 rounded-md text-xs font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                >
                  <span role="img" aria-label="Materials">📚</span>
                  Materials
                </button>
                <button
                  onClick={() => router.push(`/courses/${course.dbId}?tab=ai`)}
                  className="flex-1 bg-gray-100 text-gray-800 py-2 px-3 rounded-md text-xs font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                >
                  <span role="img" aria-label="AI Chat">🤖</span>
                  AI Chat
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {coursesToDisplay.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📚</div>
          <p className="mb-4">No courses yet</p>
          <button
            onClick={onViewAllCourses}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            View All Courses
          </button>
        </div>
      )}
    </div>
  );
};

export default MyCourses; 