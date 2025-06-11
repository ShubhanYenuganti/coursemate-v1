"use client";
import React, { useState } from "react";

const Dashboard = () => {
  const [checkedTasks, setCheckedTasks] = useState<Record<number, boolean>>({});
  const [selectedDay, setSelectedDay] = useState<number>(5);

  const toggleTask = (taskId: number) => {
    setCheckedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const selectDay = (day: number) => {
    setSelectedDay(day);
  };

  const navItems = [
    { icon: "📊", label: "Dashboard", active: true },
    { icon: "📚", label: "My Courses" },
    { icon: "📅", label: "Calendar" },
    { icon: "💬", label: "Chat" },
    { icon: "📝", label: "Notes" },
    { icon: "📖", label: "Resources" },
    { icon: "📋", label: "Study Plan" },
  ];

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
      {/* Sidebar */}
      <div className="w-60 bg-white border-r border-gray-200 p-0 flex flex-col">
        <div className="flex items-center p-5 pb-5 mb-5 border-b border-gray-200">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold mr-3">
            SB
          </div>
          <span className="font-semibold text-gray-800">StudyBuddy</span>
        </div>

        <nav className="flex-1">
          {navItems.map((item, index) => (
            <a
              key={index}
              href="#"
              className={`flex items-center px-5 py-3 text-gray-600 hover:bg-gray-100 hover:text-gray-700 transition-all duration-200 ${
                item.active ? "bg-gray-100 text-gray-700 border-r-4 border-indigo-500" : ""
              }`}
            >
              <span className="w-5 h-5 mr-3 opacity-70">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="p-5 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
              NS
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-800">Nikhil Sharma</div>
              <div className="text-xs text-gray-600">View Profile</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-5 overflow-y-auto">
        {/* Header with welcome and search */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome back, Nikhil!</h1>
            <p className="text-gray-600 italic mb-5">
              "The beautiful thing about learning is that no one can take it away from you." - B.B. King
            </p>
          </div>

          <div className="flex items-center">
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white"
                placeholder="Search courses, tasks..."
              />
            </div>
            <div className="relative ml-4">
              <div className="w-10 h-10 bg-white border border-gray-300 rounded-full flex items-center justify-center cursor-pointer">
                🔔
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">
                1
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-6">
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors">
            📝 Add Task
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors">
            ➕ Add Course
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors">
            👥 Join Study Group
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors">
            📅 View Full Calendar
          </button>
        </div>

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
            <div className="bg-white rounded-xl p-5 shadow-sm flex-1 overflow-auto">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-semibold text-gray-800">My Courses</h2>
                <a href="#" className="text-indigo-500 font-medium flex items-center gap-1 hover:text-indigo-600">
                  + Add Course
                </a>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Course 1 */}
                <div className="border border-gray-200 rounded-lg p-4 hover:border-indigo-500 hover:-translate-y-1 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center mr-3">
                      📐
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Calculus 101</h3>
                      <div className="text-xs text-gray-600">Prof. Einstein | Mon, Wed, Fri</div>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full mb-2 overflow-hidden">
                    <div className="h-full bg-red-600 rounded-full" style={{ width: "75%" }}></div>
                  </div>
                  <div className="text-xs text-gray-600 text-right mb-3">75% complete</div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 bg-indigo-500 text-white text-xs rounded-md hover:bg-indigo-600">
                      View Details
                    </button>
                    <button className="px-3 py-1.5 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700">
                      Continue
                    </button>
                  </div>
                </div>

                {/* Course 2 */}
                <div className="border border-gray-200 rounded-lg p-4 hover:border-indigo-500 hover:-translate-y-1 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3">
                      ⚛️
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Physics Fundamentals</h3>
                      <div className="text-xs text-gray-600">Prof. Newton | Tue, Thu</div>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full mb-2 overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: "40%" }}></div>
                  </div>
                  <div className="text-xs text-gray-600 text-right mb-3">40% complete</div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 bg-indigo-500 text-white text-xs rounded-md hover:bg-indigo-600">
                      View Details
                    </button>
                    <button className="px-3 py-1.5 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700">
                      Continue
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
