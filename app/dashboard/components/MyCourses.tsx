import React from 'react';

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
  isLoading?: boolean;
  onViewAllCourses?: () => void;
  onViewCourse?: (course: Course) => void;
  onContinueCourse?: (course: Course) => void;
}

const MyCourses: React.FC<MyCoursesProps> = ({
  courses = [],
  isLoading = false,
  onViewAllCourses,
  onViewCourse,
  onContinueCourse,
}) => {
  const coursesToDisplay = courses;

  const handleViewDetails = (course: Course) => {
    onViewCourse && onViewCourse(course);
  };

  const handleContinue = (course: Course) => {
    onContinueCourse && onContinueCourse(course);
  };

  return (
    <div className="rounded-2xl p-6 shadow-md border border-gray-100">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 tracking-tight">My Courses</h2>
        <button
          onClick={onViewAllCourses}
          className="text-indigo-600 font-semibold flex items-center gap-1 hover:text-indigo-800 transition-colors text-sm"
        >
          View All Courses →
        </button>
      </div>

      {/* Course Cards */}
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading courses...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coursesToDisplay.length === 0 ? (
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
          ) : (
            coursesToDisplay.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-xl shadow p-4 flex flex-col items-start border border-gray-100 hover:shadow-md transition-all duration-200"
              >
                <div className="w-full h-12 rounded-lg mb-2 overflow-hidden flex items-center justify-center bg-gray-100">
                  {course.banner ? (
                    <img src={course.banner} alt={course.name} className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-2xl">{course.icon}</span>
                  )}
                </div>
                <div className="mb-1 w-full">
                  <div className="font-bold text-gray-800 text-base leading-tight mb-0.5">{course.name}</div>
                  <div className="text-xs text-gray-500 mb-1">{course.professor} | {course.schedule}</div>
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-indigo-500 h-2 rounded-full"
                      style={{ width: `${course.progress || 0}%` }}
                    ></div>
                  </div>
                </div>
                <button
                  onClick={() => onContinueCourse(course)}
                  className="mt-auto w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-1.5 rounded-lg transition-colors duration-150 text-sm"
                >
                  Enter Course
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MyCourses; 