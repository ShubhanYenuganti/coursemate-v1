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
import useAuthRedirect from "@/hooks/useAuthRedirect"
import { QuickAccess } from "./components/quick-access";

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

        // Filter out Google Calendar courses
        const filtered = courses.filter(course => !(course.id && course.id.startsWith('google-calendar')));
        // Sort by created_at descending and take the last 2 created courses
        const sorted = [...filtered].sort((a, b) => {
          const aDate = new Date(a.created_at || 0).getTime();
          const bDate = new Date(b.created_at || 0).getTime();
          return bDate - aDate;
        });
        setUserCourses(sorted.slice(0, 2));
      } catch (error) {
        console.error('Failed to fetch user courses:', error);
      } finally {
        setIsLoadingCourses(false);
      }
    };
    fetchUserCourses();
  }, []);

  // Convert CourseData to the format expected by MyCourses component
  const convertToMyCoursesFormat = (courseData: CourseData, index: number) => ({
    id: (() => {
      // Try to parse the courseData.id as an integer
      const parsedId = parseInt(courseData.id || '');
      // If parsing fails or results in NaN, use the index as fallback
      return isNaN(parsedId) ? index + 1 : parsedId;
    })(),
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

  const calendarDays = Array.from({ length: 14 }, (_, i) => i + 1);

  const loading = useAuthRedirect()

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="bg-[#F8F9FB] font-sans w-full min-h-screen">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4 sm:gap-6">
        {/* Analytics Cards Row */}
        <section className="w-full bg-indigo-100 rounded-xl sm:rounded-2xl shadow p-3 sm:p-4 mb-1">
          <AnalyticsCards />
        </section>
        
        {/* Main Content: Responsive Layout */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 w-full">
          {/* Left column: My Courses + Recent Activity */}
          <div className="flex flex-col gap-4 sm:gap-6 flex-1 lg:min-w-0">
            <div className="flex-1">
              <MyCourses
                courses={userCourses.map((course, index) => convertToMyCoursesFormat(course, index))}
                isLoading={isLoadingCourses}
                onViewAllCourses={handleViewAllCourses}
                onViewCourse={handleViewCourse}
                onContinueCourse={handleContinueCourse}
              />
            </div>
            <section className="flex-1">
              <CommunityActivity />
            </section>
          </div>
          
          {/* Right column: Checklist - Full width on mobile, sidebar on desktop */}
          <section className="w-full lg:w-[477px] lg:flex-shrink-0">
            <div className="h-[600px] lg:h-[650px]">
              <ChecklistWidget
                onTaskToggle={handleTaskToggle}
                onAddTask={() => {console.log('Add Task')}}
              />
            </div>
          </section>
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
