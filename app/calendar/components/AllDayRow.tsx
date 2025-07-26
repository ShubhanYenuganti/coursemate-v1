import { groupTasksByTaskId, isAllDay } from "../utils/goal.progress";
import { calculateStatus } from "../utils/goal.status";
import { Move } from "lucide-react";

import { Goal } from "../utils/goal.types";

function formatEventTime(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  return `${startDate.toLocaleTimeString([], options)} to ${endDate.toLocaleTimeString([], options)}`;
}

export const AllDayRow = ({
    days,
    getGoalsForDate,
    handleGoalClick,
    onOverflowClick,
    getCourseColor,
    getEventColor,
    handleSubtaskDragStart,
    handleSubtaskDragEnd,
    handleTimeSlotDragOver,
    handleTimeSlotDragLeave,
    handleTimeSlotDrop,
    isDraggingTask,
    dragOverDate,
    onDayClick,
    onTaskHover,
    onTaskMouseLeave
  }: {
    days: Date | Date[];
    getGoalsForDate: (d: Date) => Goal[];
    handleGoalClick: (g: Goal, e?: React.MouseEvent) => void;
    onOverflowClick: (events: Goal[], position: { x: number; y: number }, day: Date) => void;
    getCourseColor: (courseId: string) => string;
    getEventColor: (goal: Goal) => string;
    handleSubtaskDragStart?: (e: React.DragEvent, subtask: Goal) => void;
    handleSubtaskDragEnd?: (e: React.DragEvent) => void;
    handleTimeSlotDragOver?: (e: React.DragEvent, date: Date, hour: number) => void;
    handleTimeSlotDragLeave?: (e: React.DragEvent) => void;
    handleTimeSlotDrop?: (e: React.DragEvent, date: Date, hour: number) => void;
    isDraggingTask?: boolean;
    dragOverDate?: Date | null;
    onDayClick?: (date: Date) => void;
    onTaskHover?: (task: Goal, e: React.MouseEvent) => void;
    onTaskMouseLeave?: () => void;
  }) => {
    const dayList = Array.isArray(days) ? days : [days];
  
    return (
      <div className="flex border-b border-gray-200">
        {/* time-label column */}
        <div className="w-16 border-r border-gray-200 text-xs flex items-center justify-end pr-1 flex-shrink-0">
          <span className="text-gray-500">All-day</span>
        </div>
  
        {/* Day buckets with fixed-width layout */}
        <div className="flex flex-1">
          {dayList.map((d, idx) => {
            const goals = getGoalsForDate(d).filter(isAllDay);
            // Render each subtask (row) as its own all-day event

            /* add a right border when we're in week-view (i.e. days is an array)
               and this bucket is NOT the last one                              */
            const showDivider =
              Array.isArray(days) && idx < dayList.length - 1 ? "border-r border-gray-200" : "";

            return (
              <div
                key={d.toISOString()}
                className={`flex-1 min-w-0 ${showDivider} transition-all duration-200 cursor-pointer hover:bg-gray-50`}
                onDragOver={(e) => handleTimeSlotDragOver?.(e, d, 0, 0)}
                onDragLeave={(e) => handleTimeSlotDragLeave?.(e)}
                onDrop={(e) => handleTimeSlotDrop?.(e, d, 0, 0)}
                onClick={(e) => {
                  // Only trigger if clicking on the day column itself, not on events
                  if (e.target === e.currentTarget || (e.target as Element).closest('.empty-slot')) {
                    onDayClick?.(d);
                  }
                }}
              >
                {/* Fixed-width all-day container with 4 slots */}
                <div className="min-h-[32px] p-1">
                  <div className="grid grid-cols-2 gap-1 h-24">
                    {/* First 2 event slots - each takes 2 columns */}
                    {goals.slice(0, 2).map((g, index) => (
                      <div
                        key={`${g.goal_id}-${g.task_id}-${g.subtask_id}`}
                        className={`h-6 px-2 rounded text-xs font-medium cursor-grab active:cursor-grabbing truncate hover:opacity-90 transition-opacity flex items-center col-span-2 ${isDraggingTask ? 'opacity-50' : ''} ${g.task_completed ? 'bg-gray-300 text-gray-500' : 'text-white'}`}
                        style={{ backgroundColor: g.task_completed ? undefined : getEventColor(g) }}
                        title={g.goal_descr ?? g.task_title ?? ""}
                        tabIndex={0}
                        onClick={(e) => {
                          // Prevent click if we're dragging
                          if (!isDraggingTask) {
                            handleGoalClick(g, e);
                          }
                        }}
                        onMouseEnter={(e) => onTaskHover?.(g, e)}
                        onMouseLeave={() => onTaskMouseLeave?.()}
                        draggable={g.goal_id !== "Google Calendar"}
                        onDragStart={(e) => handleSubtaskDragStart?.(e, g)}
                        onDragEnd={(e) => handleSubtaskDragEnd?.(e)}
                      >
                        <div className={`font-semibold leading-tight truncate ${g.task_completed ? 'line-through' : ''}`}>
                          {g.goal_id === 'Google Calendar' ? (g.task_title ?? "(untitled)") : (g.subtask_descr ?? "(untitled)")}
                        </div>
                        <Move className="w-3 h-3 opacity-50 hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                    ))}
                    {/* +more indicator if there are more than 2 events */}
                    {goals.length > 2 && (
                      <div 
                        className="h-6 px-2 rounded text-xs font-medium text-gray-600 bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors flex items-center col-span-2"
                        title={`${goals.length - 2} more events`}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          // Only pass the additional events (beyond the first 2)
                          const additionalEvents = goals.slice(2);
                          onOverflowClick(additionalEvents, { x: rect.left, y: rect.bottom }, d);
                        }}
                      >
                        +{goals.length - 2} more
                      </div>
                    )}
                    {/* Empty slots to fill the grid */}
                    {Array.from({ length: Math.max(0, 4 - Math.min(goals.length, 2) - (goals.length > 2 ? 1 : 0)) }, (_, index) => (
                      <div key={`empty-${index}`} className="h-6 col-span-2 empty-slot"></div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };