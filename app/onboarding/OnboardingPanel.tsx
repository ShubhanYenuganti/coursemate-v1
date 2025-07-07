import React, { useRef, useEffect, useState } from "react";
import { ProgressBar } from "./ProgressBar";
import { GraduationCap } from "lucide-react";

const HEADER_HEIGHT = 64; // px
const PROGRESS_HEIGHT = 40; // px (approximate, including margin)

export const OnboardingPanel: React.FC<{
  children: React.ReactNode;
  progress: number;
  centerContent?: boolean;
  disableOuterScroll?: boolean;
  step?: number;
  totalSteps?: number;
}> = ({ children, progress, centerContent = true, disableOuterScroll = false, step, totalSteps }) => {
  // Calculate the height for the scrollable area
  const [viewportHeight, setViewportHeight] = useState(0);
  useEffect(() => {
    setViewportHeight(window.innerHeight);
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const scrollableHeight = viewportHeight - HEADER_HEIGHT - PROGRESS_HEIGHT;

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-b from-white to-slate-50">
      {/* Header */}
      <header className="w-full flex items-center px-8 py-4 border-b border-gray-100 bg-white fixed top-0 left-0 z-20" style={{height: HEADER_HEIGHT}}>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-indigo-600" />
          <span className="text-xl font-bold text-gray-900 tracking-tight">CourseHelper</span>
        </div>
      </header>
      {/* Main Content (scrollable, optionally centered) */}
      <div
        className={`flex-1 flex flex-col items-center w-full min-h-0 ${centerContent ? "justify-center" : "justify-start"}`}
        style={
          disableOuterScroll
            ? {
                position: "fixed",
                top: HEADER_HEIGHT,
                left: 0,
                right: 0,
                bottom: PROGRESS_HEIGHT,
                overflowY: "auto",
                zIndex: 10,
              }
            : {
                marginTop: HEADER_HEIGHT,
                marginBottom: PROGRESS_HEIGHT,
                height: scrollableHeight > 0 ? scrollableHeight : undefined,
                maxHeight: scrollableHeight > 0 ? scrollableHeight : undefined,
                overflowY: "auto",
              }
        }
      >
        <div className="w-full flex flex-col items-center gap-8 pt-8 pb-8">
          {children}
        </div>
      </div>
      {/* Progress Bar (fixed at bottom) */}
      <div className="w-full flex flex-col items-center fixed left-0 bottom-0 z-20 bg-gradient-to-t from-white/80 to-transparent">
        {/* Step indicator */}
        {step && totalSteps && (
          <div className="w-full max-w-xl flex justify-end pr-2 pb-1 text-gray-500 text-sm select-none">
            Step {step}/{totalSteps}
          </div>
        )}
        <div className="w-full max-w-xl">
          <ProgressBar progress={progress} />
        </div>
      </div>
    </div>
  );
}; 