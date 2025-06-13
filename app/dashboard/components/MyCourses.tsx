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
}

interface MyCoursesProps {
  courses?: Course[];
  onAddCourse?: () => void;
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
  },
];

const MyCourses: React.FC<MyCoursesProps> = ({
  courses = [],
  onAddCourse,
  onViewCourse,
  onContinueCourse,
}) => {
  const coursesToDisplay = courses.length > 0 ? courses : defaultCourses;

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
          onClick={onAddCourse}
          className="text-indigo-500 font-medium flex items-center gap-1 hover:text-indigo-600 transition-colors"
        >
          + Add Course
        </button>
      </div>

      {/* Course Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {coursesToDisplay.map((course) => (
          <div
            key={course.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-indigo-500 hover:-translate-y-1 transition-all duration-200 hover:shadow-md"
          >
            {/* Course Header */}
            <div className="flex items-center mb-3">
              <div className={`w-10 h-10 ${course.iconBg} ${course.iconColor} rounded-lg flex items-center justify-center mr-3`}>
                {course.icon}
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">{course.name}</h3>
                <div className="text-xs text-gray-600">
                  {course.professor} | {course.schedule}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full mb-2 overflow-hidden">
              <div
                className={`h-full ${course.progressColor} rounded-full transition-all duration-300`}
                style={{ width: `${course.progress}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-600 text-right mb-3">
              {course.progress}% complete
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleViewDetails(course)}
                className="px-3 py-1.5 bg-indigo-500 text-white text-xs rounded-md hover:bg-indigo-600 transition-colors"
              >
                View Details
              </button>
              <button
                onClick={() => handleContinue(course)}
                className="px-3 py-1.5 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700 transition-colors"
              >
                Continue
              </button>
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
            onClick={onAddCourse}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            Add Your First Course
          </button>
        </div>
      )}
    </div>
  );
};

export default MyCourses; 