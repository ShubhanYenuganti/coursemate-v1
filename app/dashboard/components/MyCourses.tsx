import React, { useEffect, useState } from 'react';
import { courseService } from '../../../lib/api/courseService';

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

const getProgressColor = (progress: number) => {
  if (progress === 100) return 'bg-green-500';
  if (progress >= 80) return 'bg-green-400';
  if (progress >= 50) return 'bg-yellow-400';
  return 'bg-red-400';
};

const MyCourses: React.FC<MyCoursesProps> = ({
  courses = [],
  isLoading = false,
  onViewAllCourses,
  onViewCourse,
  onContinueCourse,
}) => {
  const [progressMap, setProgressMap] = useState<{ [courseId: string]: { progress: number, total: number, completed: number } }>({});

  useEffect(() => {
    const fetchProgress = async () => {
      const newMap: { [courseId: string]: { progress: number, total: number, completed: number } } = {};
      await Promise.all(
        courses.map(async (course) => {
          try {
            console.log(`Processing course: ${course.name} (ID: ${course.dbId || course.id})`);
            // Use the dbId as the courseId for API
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/courses/${course.dbId}/goals`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              credentials: 'include',
            });
            if (!res.ok) return;
            const goals = await res.json();
            console.log(`  Goals for course ${course.name}:`, goals);
            let total = 0;
            let completed = 0;
            // For each goal, fetch all tasks and aggregate subtasks
            await Promise.all(
              goals.map(async (goal: any) => {
                // Fetch all tasks for this goal
                const tasksRes = await fetch(`/api/goals/${goal.goal_id}/tasks`, {
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                  },
                  credentials: 'include',
                });
                if (!tasksRes.ok) return;
                const tasks = await tasksRes.json();
                console.log(`    Tasks for goal ${goal.goal_descr} (${goal.goal_id}):`, tasks);
                tasks.forEach((task: any) => {
                  // Each task row is a subtask row
                  total += 1;
                  if (task.subtask_completed) completed += 1;
                });
              })
            );
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
            console.log(`  Course: ${course.name} | Total subtasks: ${total}, Completed: ${completed}, Progress: ${progress}%`);
            newMap[course.dbId || course.id] = { progress, total, completed };
          } catch (e) {
            // fallback: 0 progress
            newMap[course.dbId || course.id] = { progress: 0, total: 0, completed: 0 };
          }
        })
      );
      setProgressMap(newMap);
    };
    if (courses.length > 0) fetchProgress();
  }, [courses]);

  const coursesToDisplay = courses;

  const handleViewDetails = (course: Course) => {
    onViewCourse && onViewCourse(course);
  };

  const handleContinue = (course: Course) => {
    onContinueCourse && onContinueCourse(course);
  };

  return (
    <div className="bg-indigo-100 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-md border border-gray-100 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2 sm:gap-0">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 tracking-tight">My Courses</h2>
        <button
          onClick={onViewAllCourses}
          className="text-indigo-600 font-semibold flex items-center gap-1 hover:text-indigo-800 transition-colors text-sm self-start sm:self-auto"
        >
          View All Courses →
        </button>
      </div>

      {/* Course Cards */}
      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-6 sm:py-8 flex-1">
            <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 text-sm sm:text-base">Loading courses...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 flex-1 content-start">
          {coursesToDisplay.length === 0 ? (
            <div className="col-span-1 sm:col-span-2 text-center py-6 sm:py-8 text-gray-500">
              <div className="text-3xl sm:text-4xl mb-2">📚</div>
              <p className="mb-4 text-sm sm:text-base">No courses yet</p>
              <button
                onClick={onViewAllCourses}
                className="px-3 sm:px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm"
              >
                View All Courses
              </button>
            </div>
          ) : (
            coursesToDisplay.map((course) => {
              const progressData = progressMap[course.dbId || course.id] || { progress: 0, total: 0, completed: 0 };
              return (
                <div
                  key={course.id}
                  className="bg-white rounded-xl sm:rounded-2xl shadow flex flex-col items-start border border-gray-100 hover:shadow-lg transition-all duration-200 p-3 sm:p-4 min-h-[100px] sm:min-h-[120px]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <div className="w-full h-8 sm:h-10 rounded-lg mb-2 overflow-hidden flex items-center justify-center bg-gray-100">
                    {course.banner ? (
                      <img src={course.banner} alt={course.name} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-xl sm:text-2xl">{course.icon}</span>
                    )}
                  </div>
                  <div className="mb-1 w-full flex-1">
                    <div className="font-bold text-gray-800 text-sm sm:text-base leading-tight mb-0.5 truncate">{course.name}</div>
                    <div className="text-xs text-gray-500 mb-1 truncate">{course.professor} | {course.schedule}</div>
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${getProgressColor(progressData.progress)}`}
                        style={{ width: `${progressData.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <button
                    onClick={() => onContinueCourse && onContinueCourse(course)}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-1.5 rounded-lg transition-colors duration-150 text-xs sm:text-sm"
                  >
                    Enter Course
                  </button>
                </div>
              );
            })
          )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCourses; 