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
          // Exclude Google Calendar courses
          if (course.id && course.id.startsWith('google-calendar')) return false;
          
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
    <div className="bg-gray-50 font-sans min-h-screen flex flex-col">
      {/* Main dashboard area */}
      <div className="flex-1 p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full justify-center">
        {/* Top row: left (analytics+courses), right (checklist) */}
        <div className="flex flex-row gap-6 w-full" style={{minHeight: '420px', maxHeight: '480px'}}>
          {/* Left column: vertical stack */}
          <div className="flex flex-col gap-6 flex-[2_2_0%] min-w-0">
            <section className="rounded-2xl shadow-md bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 p-4 border-l-4 border-indigo-400 flex-1 min-h-[120px] max-h-[160px]">
              <AnalyticsCards />
            </section>
            <section className="rounded-2xl shadow-md bg-white p-6 border-l-4 border-blue-400 flex-1 min-h-[180px] max-h-[320px]">
              <MyCourses
                courses={userCourses.map((course, index) => convertToMyCoursesFormat(course, index))}
                isLoading={isLoadingCourses}
                onViewAllCourses={handleViewAllCourses}
                onViewCourse={handleViewCourse}
                onContinueCourse={handleContinueCourse}
              />
            </section>
          </div>
          {/* Right column: Checklist, matches height of left column */}
          <aside className="flex flex-col flex-[1.1_1.1_0%] min-w-[320px] max-w-[400px] h-full">
            <section className="rounded-2xl shadow-md bg-white p-7 border-l-4 border-emerald-400 flex-1 h-full min-h-[320px] flex flex-col justify-between">
              <ChecklistWidget
                onTaskToggle={handleTaskToggle}
                onAddTask={() => {console.log('Add Task')}}
              />
            </section>
          </aside>
        </div>
        {/* Recent Activity: full width at the bottom */}
        <section className="rounded-2xl shadow-md bg-white p-5 border-l-4 border-purple-400 w-full min-h-[120px] max-h-[180px]">
          <CommunityActivity />
        </section>
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
