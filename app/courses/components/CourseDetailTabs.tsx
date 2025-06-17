import React, { useState } from "react";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "materials", label: "Materials" },
  { key: "ai", label: "AI Chat" },
  { key: "study", label: "Study Plan" },
  { key: "community", label: "Community" },
  { key: "progress", label: "Progress" },
];

interface CourseDetailTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const COLLAPSED_WIDTH = 48; // px (w-12)
const EXPANDED_WIDTH = 192; // px (w-48)

const CourseDetailTabs: React.FC<CourseDetailTabsProps> = ({ activeTab, setActiveTab }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="fixed top-1/2 right-8 z-40 -translate-y-1/2 flex flex-col gap-6 items-end pointer-events-auto"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: hovered ? EXPANDED_WIDTH : COLLAPSED_WIDTH, transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)' }}
    >
      {TABS.map(tab => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            className={`group relative flex items-center justify-end w-full focus:outline-none transition-all duration-200 bg-transparent`}
            onClick={() => setActiveTab(tab.key)}
            aria-selected={isActive}
            aria-controls={`tab-panel-${tab.key}`}
            role="tab"
            style={{ minWidth: '2rem', minHeight: '2rem' }}
          >
            {/* Text label slides in from the right, font size grows on hover */}
            <span
              className={`absolute right-12 transition-all duration-300 font-medium whitespace-nowrap
                ${hovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}
                text-sm group-hover:text-lg`}
              style={{ maxWidth: hovered ? 140 : 0, transitionProperty: 'opacity, transform, font-size' }}
            >
              {tab.label}
            </span>
            {/* Ring button always at the right edge, grows on individual hover */}
            <span
              className={`flex items-center justify-center rounded-full border-2 transition-all duration-200
                ${isActive ? 'border-indigo-500' : 'border-gray-300'}
                w-5 h-5 group-hover:w-8 group-hover:h-8`}
              style={{ background: 'transparent' }}
            >
              {isActive && (
                <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default CourseDetailTabs; 