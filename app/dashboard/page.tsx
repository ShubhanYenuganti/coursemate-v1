"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "./components/header";
import MyCourses from "./components/MyCourses";
import ChecklistWidget from "./components/CalendarChecklistWidget";
import CommunityActivity from "./components/recent-activity";
import AnalyticsCards from "./components/summary-cards";
import CourseTasksModal from "./components/CourseTasksModal";
import { courseService, CourseData } from "../../lib/api/courseService";

const Dashboard = () => {
  const router = useRouter();
  const [searchResults, setSearchResults] = useState<Array<{ id: number; title: string; type: 'task' | 'course' }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [userCourses, setUserCourses] = useState<CourseData[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isCourseTasksModalOpen, setIsCourseTasksModalOpen] = useState(false);

  const handleSearch = (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    // Simulate search results - replace with actual search logic
    const results: Array<{ id: number; title: string; type: 'task' | 'course' }> = [
      // Add course search results here when you have course data
    ];
    setSearchResults(results);
  };

  const handleNotificationClick = () => {
    // TODO: Implement notification click handler
    console.log('Notification clicked');
  };

  const handleTaskToggle = (taskId: number, checked: boolean) => {
    console.log(`Task ${taskId} ${checked ? 'completed' : 'uncompleted'}`);
    // Here you would typically update the task in your backend/database
  };

  const handleViewAllCourses = () => {
    router.push('/courses');
  };

  const handleViewCourse = (course: any) => {
    console.log("View Course", course);
    setSelectedCourse(course);
    setIsCourseTasksModalOpen(true);
  };

  const handleCloseCourseTasksModal = () => {
    setIsCourseTasksModalOpen(false);
    setSelectedCourse(null);
  };

  // Fetch user courses on component mount
  useEffect(() => {
    const fetchUserCourses = async () => {
      try {
        setIsLoadingCourses(true);
        const courses = await courseService.getCourses();
        
        // Filter courses to only show those accessed in the last 24 hours
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
        
        const recentlyAccessedCourses = courses.filter(course => {
          if (!course.last_accessed) return false;
          const lastAccessed = new Date(course.last_accessed);
          return lastAccessed >= twentyFourHoursAgo;
        });
        
        setUserCourses(recentlyAccessedCourses);
      } catch (error) {
        console.error('Failed to fetch user courses:', error);
      } finally {
        setIsLoadingCourses(false);
      }
    };
    fetchUserCourses();
  }, []);

  // Convert CourseData to the format expected by MyCourses component
  const convertToMyCoursesFormat = (courseData: CourseData) => ({
    id: parseInt(courseData.id || '0'),
    name: courseData.title,
    professor: courseData.professor || 'Unknown Professor',
    schedule: courseData.semester || 'No Schedule',
    progress: courseData.daily_progress || 0,
    icon: '📚',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    progressColor: 'bg-blue-600',
    dbId: courseData.id || '',
    banner: courseData.course_image || `https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=200&fit=crop&q=80&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D`,
  });

  const handleContinueCourse = (course: any) => {
    // Navigate to the course page using the database ID
    if (course.dbId) {
      router.push(`/courses/${course.dbId}`);
    }
  };

  const activities = [
    {
      id: 1,
      user: "Priya Patel",
      avatar: "PP",
      action: "posted in",
      target: "Calculus Study Group",
      content:
        '"Anyone else stuck on problem 5 of the latest assignment? Would love some hints!"',
      time: "25 min ago",
    },
    {
      id: 2,
      user: "David Lee",
      avatar: "DL",
      action: "shared a resource in",
      target: "Physics Help Forum",
      time: "1 hour ago",
    },
  ];

  return (
    <div className="bg-gray-50 font-sans">
      <div className="p-5 flex flex-col lg:flex-row gap-8">
        {/* Main Content (left) */}
        <div className="flex-1 min-w-0">
          {/* Search Results */}
          {isSearching && searchResults.length > 0 && (
            <div className="mb-6 bg-white rounded-xl p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Search Results</h3>
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                  >
                    <span className="mr-2">
                      {result.type === 'task' ? '📝' : '📚'}
                    </span>
                    <span className="text-gray-700">{result.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Motivation analytics */}
          <div className="mb-6">
            <AnalyticsCards />
          </div>

          {/* My Courses */}
          <div className="mb-6">
            <MyCourses
              courses={userCourses.map(convertToMyCoursesFormat)}
              onViewAllCourses={handleViewAllCourses}
              onViewCourse={handleViewCourse}
              onContinueCourse={handleContinueCourse}
            />
          </div>
        </div>
        {/* Right sidebar with Checklist and Notifications */}
        <div className="w-full lg:w-[400px] flex-shrink-0 space-y-6">
          <ChecklistWidget
            onTaskToggle={handleTaskToggle}
            onAddTask={() => {console.log("Add Task")}}
          />
          <CommunityActivity />
        </div>
      </div>

      {/* Course Tasks Modal */}
      {selectedCourse && (
        <CourseTasksModal
          isOpen={isCourseTasksModalOpen}
          onClose={handleCloseCourseTasksModal}
          course={selectedCourse}
        />
      )}
    </div>
  );
};

export default Dashboard;
