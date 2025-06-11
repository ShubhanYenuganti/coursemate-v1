"use client";

import { useState } from "react";

type CalendarWidgetProps = {
  currentMonth?: string;
  todayDate?: number;
  eventsData?: number[];
  onDayClick?: (day: number) => void;
  onMonthChange?: (direction: 'prev' | 'next') => void;
};

export function CalendarWidget({
  currentMonth = "October 2023",
  todayDate = 5,
  eventsData = [3],
  onDayClick,
  onMonthChange
}: CalendarWidgetProps) {
  const [selectedDay, setSelectedDay] = useState<number>(todayDate);

  const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);
  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    onDayClick?.(day);
  };

  const handlePrevMonth = () => {
    onMonthChange?.("prev");
  };

  const handleNextMonth = () => {
    onMonthChange?.("next");
  };

  return (
    <div className="bg-white rounded-lg p-5 shadow-sm">
      {/* Calendar Header */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-semibold text-gray-800">{currentMonth}</h2>
        <div className="flex gap-2">
          <button
            onClick={handlePrevMonth}
            className="w-8 h-8 border border-gray-300 bg-white rounded-md flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            ‹
          </button>
          <button
            onClick={handleNextMonth}
            className="w-8 h-8 border border-gray-300 bg-white rounded-md flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            ›
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day Headers */}
        {dayHeaders.map(day => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-600 p-2"
          >
            {day}
          </div>
        ))}

        {/* Calendar Days (for brevity, showing first 14 days) */}
        {calendarDays.slice(0, 14).map(day => (
          <div
            key={day}
            onClick={() => handleDayClick(day)}
            className={`h-40 flex items-center justify-center rounded-md cursor-pointer transition-all duration-200 hover:bg-gray-100 relative ${
              day === todayDate
                ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                : selectedDay === day
                ? 'bg-gray-200'
                : ''
            }`}
          >
            {day}
            {/* Event Indicator */}
            {eventsData.includes(day) && (
              <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
