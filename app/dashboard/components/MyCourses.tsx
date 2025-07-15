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
    <div className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
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
        <div className="flex justify-center items-center py-12">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading courses...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                className="relative border border-gray-100 rounded-2xl hover:border-indigo-400 hover:-translate-y-1 transition-all duration-200 hover:shadow-md overflow-hidden flex flex-col min-h-[260px] bg-white group"
              >
                {/* Accent dot */}
                <div className="absolute top-4 left-4 w-2.5 h-2.5 rounded-full bg-indigo-400 opacity-70 group-hover:scale-110 transition-transform" />
                {/* Course Banner */}
                {course.banner && (
                  <div className="w-full h-28 bg-gradient-to-r from-blue-500 to-purple-600 relative overflow-hidden">
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
                <div className="p-5 flex flex-col h-full">
                  {/* Course Header */}
                  <div className="flex items-center mb-3">
                    <div className={`w-10 h-10 ${course.iconBg} ${course.iconColor} rounded-lg flex items-center justify-center mr-3 text-xl`}>
                      {course.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 text-base leading-tight">{course.name}</h3>
                      <div className="text-xs text-gray-500">
                        {course.professor} | {course.schedule}
                      </div>
                    </div>
                  </div>

                  {/* Spacer to push button to bottom */}
                  <div className="flex-1"></div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleContinue(course)}
                      className="px-4 py-2 bg-indigo-500 text-white text-xs rounded-md hover:bg-indigo-600 transition-colors flex-1 font-semibold"
                    >
                      Enter Course
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MyCourses; 