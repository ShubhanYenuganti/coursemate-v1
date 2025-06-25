"use client";
import React, { useState } from "react";
import { Header } from "./components/header";
import ActionButtons from "./components/ActionButtons";
import MyCourses from "./components/MyCourses";
import TodaysChecklist from "./components/TodaysChecklist";
import CalendarWidget from "./components/CalendarWidget";
import CalendarChecklistWidget from "./components/CalendarChecklistWidget";
import CommunityActivity from "./components/recent-activity";
import AnalyticsCards from "./components/summary-cards";
import useAuthRedirect from "@/hooks/useAuthRedirect"

const Dashboard = () => {
  const [checkedTasks, setCheckedTasks] = useState<Record<number, boolean>>({});
  const [selectedDay, setSelectedDay] = useState<number>(5);
  const [searchResults, setSearchResults] = useState<Array<{ id: number; title: string; type: 'task' | 'course' }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  const toggleTask = (taskId: number) => {
    setCheckedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const selectDay = (day: number) => {
    setSelectedDay(day);
  };

  const handleSearch = (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    // Simulate search results - replace with actual search logic
    const results = [
      ...tasks.filter(task => 
        task.title.toLowerCase().includes(term.toLowerCase()) ||
        task.course.toLowerCase().includes(term.toLowerCase())
      ).map(task => ({
        id: task.id,
        title: task.title,
        type: 'task' as const
      })),
      // Add course search results here when you have course data
    ];
    setSearchResults(results);
  };

  const handleNotificationClick = () => {
    // TODO: Implement notification click handler
    console.log('Notification clicked');
  };

  const tasks = [
    {
      id: 1,
      title: "Physics Quiz - Chapter 4",
      course: "Physics Fundamentals",
      time: "Today",
      completed: true,
    },
    {
      id: 2,
      title: "Calculus Assignment",
      course: "Due End of day",
      time: "Tomorrow",
      completed: false,
    },
    {
      id: 3,
      title: "Work on Project Proposal",
      course: "Intro to Programming",
      time: "Oct 28",
      completed: false,
    },
  ];

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
    <div className="bg-gray-50 font-sans">
      {/* Main Content */}
      <div className="p-5">
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

        <ActionButtons
          onAddTask={() => {console.log("Add Task")}}
          onAddCourse={() => {console.log("Add Course")}}
          onJoinStudyGroup={() => {console.log("Join Study Group")}}
          onViewCalendar={() => {console.log("View Calendar")}}
        />

        {/* Calendar & Checklist Row */}
        <div className="mb-6">
          <CalendarChecklistWidget
            onTaskToggle={(taskId, checked) => {console.log("Task toggled", taskId, checked)}}
            onAddTask={() => {console.log("Add Task")}}
          />
        </div>

        {/* My Courses */}
        <div className="mb-6">
          <MyCourses
            onAddCourse={() => {console.log("Add Course")}}
            onViewCourse={(course) => {console.log("View Course", course)}}
            onContinueCourse={(course) => {console.log("Continue Course", course)}}
          />
        </div>

        {/* Community Activity */}
        <div className="mb-6">
          <CommunityActivity />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
