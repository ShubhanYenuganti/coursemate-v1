"use client";

import { SummaryCards } from "./components/summary-cards";
import { CourseProgress } from "./components/course-progress";
import { UpcomingTasks } from "./components/upcoming-tasks";
import { RecentActivity } from "./components/recent-activity";
import { QuickAccess } from "./components/quick-access";
import { CalendarWidget } from "./components/calendar";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* welcome header */}
      <div>
        <h1 className="text-3xl font-bold mb-1">Welcome back, Nikhil!</h1>
        <p className="text-gray-600 italic">
          "The beautiful thing about learning is that no one can take it away from you." - B.B. King
        </p>
      </div>

      <SummaryCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CalendarWidget
              onDayClick={(day) => console.log("Clicked day:", day)}
              onMonthChange={(dir) => console.log("Month changed:", dir)}
              eventsData={[3, 5, 9]}
              currentMonth="October 2023"
              todayDate={5}
          />
          <CourseProgress />
          <RecentActivity />
        </div>
        <div className="lg:col-span-1 space-y-6">
          <UpcomingTasks />
          <QuickAccess />
        </div>
      </div>
    </div>
  );
}
