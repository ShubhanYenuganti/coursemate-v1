import React, { useState } from 'react';

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CalendarWidget: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const today = new Date().getDate();

  return (
    <div className="flex items-start justify-between gap-6 w-full">
      {/* Summary/Stats Section */}
      <div className="flex flex-col justify-between min-w-[180px]">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">October 2023</h2>
        <div className="text-sm text-gray-500 mb-2">🔥 12-day streak</div>
        <div className="text-sm text-gray-500 mb-2">Next: <span className="font-medium text-indigo-600">Physics Quiz</span></div>
        <button
          className="mt-2 text-indigo-500 hover:underline text-sm w-fit"
          onClick={() => setShowModal(true)}
        >
          View Full Calendar
        </button>
      </div>
      {/* Mini Calendar Grid */}
      <div className="flex-1 flex flex-col items-end">
        <div className="flex w-full justify-end mb-1">
          <button
            id="calendar-expand-btn"
            className="text-gray-400 hover:text-indigo-500 text-xl p-1 rounded transition-colors"
            onClick={() => setShowModal(true)}
            aria-label="Expand Calendar"
          >
            ⤢
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2" style={{ minWidth: 350, maxWidth: 520, width: '100%' }}>
          {daysOfWeek.map(day => (
            <div key={day} className="text-xs text-center text-gray-400 font-medium mb-1">{day}</div>
          ))}
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className={`w-12 h-12 flex items-center justify-center rounded cursor-pointer text-base transition-all
                ${i + 1 === today ? 'bg-indigo-500 text-white font-bold' : 'hover:bg-indigo-100 text-gray-700'}`}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Modal for Full Calendar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl relative">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setShowModal(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-4">Full Calendar (Month/Week View Coming Soon)</h2>
            <div className="h-64 flex items-center justify-center text-gray-400 text-lg">
              [Full calendar placeholder]
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarWidget; 