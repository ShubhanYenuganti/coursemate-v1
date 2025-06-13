"use client";
import React, { useState } from "react";
import { Header } from "./components/header";
import ActionButtons from "./components/ActionButtons";
import MyCourses from "./components/MyCourses";

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

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Removed <Sidebar /> */}

      {/* Main Content */}
      <div className="flex-1 p-5 overflow-y-auto">
        <Header 
          onSearch={handleSearch}
          onNotificationClick={handleNotificationClick}
        />

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

        <ActionButtons
          onAddTask={() => {console.log("Add Task")}}
          onAddCourse={() => {console.log("Add Course")}}
          onJoinStudyGroup={() => {console.log("Join Study Group")}}
          onViewCalendar={() => {console.log("View Calendar")}}
        />

        {/* Main grid */}
        <div className="grid grid-cols-3 gap-6" style={{ height: "calc(100vh - 200px)" }}>
          {/* Left two columns */}
          <div className="col-span-2 flex flex-col gap-6 overflow-y-auto">
            {/* Calendar */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-semibold text-gray-800">October 2023</h2>
                <div className="flex gap-2">
                  <button className="w-8 h-8 border border-gray-300 bg-white rounded-md flex items-center justify-center hover:bg-gray-50">
                    ‹
                  </button>
                  <button className="w-8 h-8 border border-gray-300 bg-white rounded-md flex items-center justify-center hover:bg-gray-50">
                    ›
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-gray-600 p-2">
                    {day}
                  </div>
                ))}
                {calendarDays.map((day) => (
                  <div
                    key={day}
                    onClick={() => selectDay(day)}
                    className={`aspect-square flex items-center justify-center rounded-md cursor-pointer transition-all duration-200 hover:bg-gray-100 relative ${
                      day === 5
                        ? "bg-indigo-500 text-white"
                        : selectedDay === day
                        ? "bg-gray-200"
                        : ""
                    }`}
                  >
                    {day}
                    {day === 3 && (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-emerald-500 rounded-full"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* My Courses */}
            <MyCourses
              onAddCourse={() => {console.log("Add Course")}}
              onViewCourse={(course) => {console.log("View Course", course)}}
              onContinueCourse={(course) => {console.log("Continue Course", course)}}
            />
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-5 overflow-y-auto">
            {/* Checklist */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-semibold text-gray-800">Today's Checklist</h2>
                <span className="text-emerald-500 font-medium cursor-pointer hover:text-emerald-600">➕</span>
              </div>

              {tasks.map((task) => (
                <div key={task.id} className="flex items-center py-3 border-b border-gray-100 last:border-b-0">
                  <div
                    onClick={() => toggleTask(task.id)}
                    className={`w-4.5 h-4.5 border-2 border-gray-300 rounded cursor-pointer flex items-center justify-center mr-3 ${
                      checkedTasks[task.id] || task.completed ? "bg-emerald-500 border-emerald-500 text-white" : ""
                    }`}
                  >
                    {(checkedTasks[task.id] || task.completed) && "✓"}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{task.title}</div>
                    <div className="text-xs text-gray-600">{task.course}</div>
                  </div>
                  <div className="text-xs text-gray-600 ml-auto">{task.time}</div>
                </div>
              ))}

              <div className="text-center mt-5 text-gray-400">
                <div className="mb-3">📋</div>
                <div className="mb-1">Nothing scheduled for today.</div>
                <div className="mb-3">Time to relax or plan ahead!</div>
                <button className="px-3 py-1.5 bg-indigo-500 text-white text-xs rounded-md hover:bg-indigo-600">
                  📝 Add a task
                </button>
              </div>
            </div>

            {/* Community Activity */}
            <div className="bg-white rounded-xl p-5 shadow-sm flex-1 overflow-auto">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-semibold text-gray-800">Community Activity</h2>
                <select className="border border-gray-300 rounded-md px-2 py-1 text-xs">
                  <option>All Activity</option>
                </select>
              </div>

              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start py-3 border-b border-gray-100 last:border-b-0">
                  <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-3 flex-shrink-0">
                    {activity.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-700 mb-1">
                      <strong>{activity.user}</strong> {activity.action} <span className="text-indigo-500">{activity.target}</span>
                    </div>
                    {activity.content && <div className="text-xs text-gray-600 mb-1">{activity.content}</div>}
                    <div className="text-xs text-gray-500">{activity.time}</div>
                  </div>
                </div>
              ))}

              <div className="flex items-start py-3">
                <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-3 flex-shrink-0">
                  📺
                </div>
                <div className="flex-1">
                  <div className="text-sm text-indigo-500 mb-1">"Useful Video on Thermodynamics"</div>
                  <div className="text-xs text-gray-500">Watch Video</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Motivation analytics */}
        <div className="grid grid-cols-4 gap-4 mt-5">
          <div className="bg-white rounded-xl p-5 text-center shadow-sm">
            <div className="w-12 h-12 bg-yellow-100 text-yellow-500 rounded-xl flex items-center justify-center mx-auto mb-3 text-2xl">
              🔥
            </div>
            <div className="text-2xl font-bold text-gray-800 mb-1">12</div>
            <div className="text-xs text-gray-600">Day Study Streak</div>
          </div>

          <div className="bg-white rounded-xl p-5 text-center shadow-sm">
            <div className="w-12 h-12 bg-green-100 text-green-500 rounded-xl flex items-center justify-center mx-auto mb-3 text-2xl">
              ⏰
            </div>
            <div className="text-2xl font-bold text-gray-800 mb-1">25.5 hrs</div>
            <div className="text-xs text-gray-600">Hours Logged (Weekly)</div>
          </div>

          <div className="bg-white rounded-xl p-5 text-center shadow-sm">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-3 text-2xl">
              📊
            </div>
            <div className="text-2xl font-bold text-gray-800 mb-1">60%</div>
            <div className="text-xs text-gray-600">Overall Completion</div>
          </div>

          <div className="bg-white rounded-xl p-5 text-center shadow-sm">
            <div className="w-12 h-12 bg-yellow-100 text-yellow-500 rounded-xl flex items-center justify-center mx-auto mb-3 text-2xl">
              🏆
            </div>
            <div className="text-2xl font-bold text-gray-800 mb-1">5</div>
            <div className="text-xs text-gray-600">Achievements Unlocked</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
