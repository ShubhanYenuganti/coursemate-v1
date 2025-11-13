import React, { useState, useRef, useEffect } from "react";

const TABS = [
  { key: "overview", label: "Overview", icon: "📊" },
  { key: "materials", label: "Materials", icon: "📚" },
  { key: "ai", label: "AI Chat", icon: "🤖" },
  { key: "generate", label: "Generate", icon: "✨" },
  { key: "study", label: "Study Plan", icon: "📋" },
  { key: "community", label: "Community", icon: "👥" },
];

interface CourseDetailTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const CourseDetailTabs: React.FC<CourseDetailTabsProps> = ({ activeTab, setActiveTab }) => {
  const [isHovered, setIsHovered] = useState(false);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Non-hovered tab class - compact with only icons
  const nonHoveredTabClass = (isActive: boolean) => 
    `px-3 py-1 flex items-center justify-center rounded-xl transition-all duration-200 ${
      isActive 
        ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
    }`;

  // Hovered tab class - expanded with text
  const hoveredTabClass = (isActive: boolean) => 
    `flex items-center px-3 py-2 rounded-xl transition-all duration-200 whitespace-nowrap ${
      isActive 
        ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
    }`;

  // Handle swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = TABS.findIndex(tab => tab.key === activeTab);
      let newIndex;

      if (isLeftSwipe && currentIndex < TABS.length - 1) {
        // Swipe left - go to next tab
        newIndex = currentIndex + 1;
      } else if (isRightSwipe && currentIndex > 0) {
        // Swipe right - go to previous tab
        newIndex = currentIndex - 1;
      }

      if (newIndex !== undefined) {
        setActiveTab(TABS[newIndex].key);
      }
    }

    // Reset touch positions
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // Handle wheel events for trackpad scrolling
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Only handle horizontal scrolling
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 10) {
        e.preventDefault();
        
        const currentIndex = TABS.findIndex(tab => tab.key === activeTab);
        let newIndex;

        if (e.deltaX > 0 && currentIndex < TABS.length - 1) {
          // Scroll right - go to next tab
          newIndex = currentIndex + 1;
        } else if (e.deltaX < 0 && currentIndex > 0) {
          // Scroll left - go to previous tab
          newIndex = currentIndex - 1;
        }

        if (newIndex !== undefined) {
          setActiveTab(TABS[newIndex].key);
        }
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [activeTab, setActiveTab]);

  return (
    <div 
      ref={containerRef}
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-in-out"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <nav className={`bg-white backdrop-blur-md border border-gray-200/60 shadow-xl rounded-2xl transition-all duration-300 ease-in-out ${
        isHovered ? 'px-5 py-3 shadow-2xl' : 'px-3 py-3'
      }`}>
        <div 
          className="flex items-center gap-1 overflow-x-auto scrollbar-hide" 
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none'
          }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative ${isHovered ? hoveredTabClass(isActive) : nonHoveredTabClass(isActive)}`}
                aria-selected={isActive}
                aria-controls={`tab-panel-${tab.key}`}
                role="tab"
              >
                <span className="text-lg">{tab.icon}</span>
                {isHovered && (
                  <span className="ml-2 font-medium">
                    {tab.label}
                  </span>
                )}
 
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default CourseDetailTabs;