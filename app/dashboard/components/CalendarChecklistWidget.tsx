import React from 'react';
import CalendarWidget from './CalendarWidget';
import TodaysChecklist from './TodaysChecklist';

interface CalendarChecklistWidgetProps {
  onTaskToggle?: (taskId: number, checked: boolean) => void;
  onAddTask?: () => void;
}

const CalendarChecklistWidget: React.FC<CalendarChecklistWidgetProps> = ({
  onTaskToggle,
  onAddTask,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col w-full max-w-5xl mx-auto">
      {/* Summary Row */}
      <div className="flex items-center justify-between mb-4 w-full">
        <div className="flex items-center gap-8 text-base text-gray-600 flex-grow">
          <span className="flex items-center gap-1">🔥 <span>12-day streak</span></span>
          <span>|</span>
          <span>Next: <span className="font-medium text-indigo-600">Physics Quiz</span></span>
        </div>
        <button
          className="text-indigo-500 hover:underline text-base whitespace-nowrap"
          onClick={() => {
            const expandBtn = document.getElementById('calendar-expand-btn');
            if (expandBtn) expandBtn.click();
          }}
        >
          View Full Calendar
        </button>
      </div>
      {/* Main Content Row */}
      <div className="flex flex-col sm:flex-row gap-8 w-full items-start">
        {/* Calendar (left) */}
        <div className="flex-1 min-w-[400px] max-w-[600px]">
          <CalendarWidget />
        </div>
        {/* Checklist (right) */}
        <div className="w-full sm:w-[420px] max-w-[480px]">
          <TodaysChecklist
            onTaskToggle={onTaskToggle}
            onAddTask={onAddTask}
          />
        </div>
      </div>
    </div>
  );
};

export default CalendarChecklistWidget; 