import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { AllDayRow } from "./AllDayRow"
import { goalsStartingAtHour } from "../utils/calendar.utils"
import { calculateEventPositions } from "../utils/calendar.layout"
import { groupTasksByTaskId } from "../utils/goal.progress"
import { calculateStatus } from "../utils/goal.status"
import { startOfToday } from "../utils/date.utils"
import { calculateDayEventPositions } from "../utils/calendar.layout";

// Extracted view components to reduce cognitive complexity
export const DayView = ({ 
  currentDate, 
  setCurrentDate, 
  hours, 
  getGoalsForDate, 
  handleGoalClick, 
  setTimelineRef, 
  formatHourLabel, 
  handleOverflowClick, 
  getCourseColor,
  getEventColor,
  handleSubtaskDragStart,
  handleSubtaskDragEnd,
  handleTimeSlotDragOver,
  handleTimeSlotDragLeave,
  handleTimeSlotDrop,
  isDraggingTask,
  dragOverDate,
  dragTargetHour,
  dragTargetMinute,
  dragTargetDate,
  onDayClick,
  onTaskHover,
  onTaskMouseLeave,
  handleTimeSlotMouseDown,
  handleTimeSlotMouseMove,
  handleTimeSlotMouseUp,
  dragPreview, // NEW
  draggedTask
}: any) => (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 p-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">
          {currentDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(startOfToday())}>
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date(currentDate.getTime() - 86_400_000))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date(currentDate.getTime() + 86_400_000))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
  
      <AllDayRow
        days={currentDate}
        getGoalsForDate={getGoalsForDate}
        handleGoalClick={handleGoalClick}
        onOverflowClick={handleOverflowClick}
        getCourseColor={getCourseColor}
        getEventColor={getEventColor}
        handleSubtaskDragStart={handleSubtaskDragStart}
        handleSubtaskDragEnd={handleSubtaskDragEnd}
        handleTimeSlotDragOver={handleTimeSlotDragOver}
        handleTimeSlotDragLeave={handleTimeSlotDragLeave}
        handleTimeSlotDrop={handleTimeSlotDrop}
        isDraggingTask={isDraggingTask}
        dragOverDate={dragOverDate}
        onDayClick={onDayClick}
        onTaskHover={onTaskHover}
        onTaskMouseLeave={onTaskMouseLeave}
      />
  
      <div className="flex-1 overflow-y-auto" ref={setTimelineRef}>
        <div className="flex">
          <div className="w-16 border-r border-gray-200 flex-shrink-0">
            {hours.map((h: number) => (
              <div
                key={h}
                className="h-20 border-b border-gray-200 p-2 text-xs text-gray-500 flex items-start justify-end pr-1"
              >
                {formatHourLabel(h)}
              </div>
            ))}
          </div>

          {/* Main day column: render all events absolutely positioned */}
          <div
            className="flex-1 relative overflow-visible"
            style={{ minHeight: `${hours.length * 80}px` }}
            onDragOver={e => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              const rect = e.currentTarget.getBoundingClientRect();
              const y = e.clientY - rect.top;
              const totalMinutes = (y / rect.height) * 1440;
              const hour = Math.floor(totalMinutes / 60);
              const minute = Math.floor((totalMinutes % 60) / 30) * 30;
              handleTimeSlotDragOver(e, currentDate, hour, minute);
            }}
            onDrop={e => {
              if (!isDraggingTask || !draggedTask) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const y = e.clientY - rect.top;
              const totalMinutes = (y / rect.height) * 1440;
              const hour = Math.floor(totalMinutes / 60);
              const minute = Math.floor((totalMinutes % 60) / 30) * 30;
              handleTimeSlotDrop(e, currentDate, hour, minute);
            }}
          >
            {/* Hour grid lines (background only) */}
            {hours.map((h: number) => (
              <div
                key={`grid-${h}`}
                className="absolute left-0 w-full border-b border-gray-200"
                style={{
                  top: `${(h / hours.length) * 100}%`,
                  height: 0,
                  zIndex: 1,
                }}
              />
            ))}
            {/* Drag preview overlay for event placement */}
            {isDraggingTask && draggedTask && dragTargetHour !== null && dragTargetDate?.toDateString() === currentDate.toDateString() && (() => {
              // Calculate overlay position and size
              const durationMs = new Date(draggedTask.end_time).getTime() - new Date(draggedTask.start_time).getTime();
              const durationMinutes = Math.max(30, Math.round(durationMs / 60000));
              const top = ((dragTargetHour * 60 + (dragTargetMinute || 0)) / 1440) * 100;
              const height = (durationMinutes / 1440) * 100;
              return (
                <div
                  className="absolute left-0 w-full pointer-events-none"
                  style={{
                    top: `${top}%`,
                    height: `${height}%`,
                    zIndex: 1000,
                    border: '2px dashed #2563eb',
                    background: 'rgba(37,99,235,0.08)',
                    borderRadius: '8px',
                  }}
                />
              );
            })()}
            {/* Highlight for drag-over hour */}
            {/* (Removed solid blue border highlight; only dashed overlay remains) */}
            {/* Invisible drop targets for drag-to-reschedule */}
            {hours.map((h: number) => (
              <div
                key={`drop-${h}`}
                className="absolute left-0 w-full"
                style={{
                  top: `${(h / hours.length) * 100}%`,
                  height: `${100 / hours.length}%`,
                  zIndex: 10,
                  pointerEvents: 'auto',
                  opacity: 0,
                }}
                onDragOver={e => handleTimeSlotDragOver?.(e, currentDate, h, 0)}
                onDragLeave={e => handleTimeSlotDragLeave?.(e)}
                onDrop={e => handleTimeSlotDrop?.(e, currentDate, h, 0)}
              />
            ))}
            {/* Events: render as single blocks spanning their duration */}
            {calculateDayEventPositions(getGoalsForDate(currentDate), currentDate).map((pos) => (
              <div
                key={`${pos.goal.goal_id}-${pos.goal.task_id}-${pos.goal.subtask_id}-${pos.goal.id}`}
                className="absolute rounded p-2 text-xs text-white font-medium cursor-pointer hover:opacity-90 shadow-sm border-2 border-white"
                style={{
                  backgroundColor: getEventColor(pos.goal),
                  width: `${pos.width}%`,
                  left: `${pos.left}%`,
                  top: `${pos.top}%`,
                  height: `${pos.height}%`,
                  zIndex: pos.zIndex + 50,
                  minHeight: '20px',
                  boxShadow: '0 2px 8px 0 rgba(0,0,0,0.06)',
                }}
                tabIndex={0}
                onClick={(e) => handleGoalClick(pos.goal, e)}
                onMouseEnter={(e) => onTaskHover?.(pos.goal, e)}
                onMouseLeave={() => onTaskMouseLeave?.()}
                draggable={pos.goal.goal_id !== "Google Calendar"}
                onDragStart={(e) => handleSubtaskDragStart?.(e, pos.goal)}
                onDragEnd={(e) => handleSubtaskDragEnd?.(e)}
                onDragOver={e => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={e => {
                  if (!isDraggingTask || !draggedTask) return;
                  const rect = e.currentTarget.parentElement!.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const totalMinutes = (y / rect.height) * 1440;
                  const hour = Math.floor(totalMinutes / 60);
                  const minute = Math.floor((totalMinutes % 60) / 30) * 30;
                  handleTimeSlotDrop(e, currentDate, hour, minute);
                }}
              >
                {pos.showTitle && (
                  <div className="font-semibold leading-tight truncate" style={{ zIndex: pos.zIndex + 20 }}>
                    {pos.goal.goal_id === 'Google Calendar' ? (pos.goal.task_title ?? "(untitled)") : (pos.goal.subtask_descr ?? "(untitled)")}
                  </div>
                )}
                {/* Show status indicator for non-Google Calendar events */}
                {pos.showTitle && pos.goal.status && pos.goal.goal_id !== "Google Calendar" && (
                  <div className="text-[10px] mt-1 flex items-center gap-1" style={{ zIndex: pos.zIndex + 20 }}>
                    <div className={`w-2 h-2 rounded-full ${
                      pos.goal.status === "Overdue" ? "bg-red-400" :
                      pos.goal.status === "In Progress" ? "bg-yellow-400" :
                      "bg-green-400"
                    }`} />
                    <span className="opacity-90">{pos.goal.status}</span>
                  </div>
                )}
              </div>
            ))}
            {/* Drag Preview and other overlays can go here if needed */}
          </div>
        </div>
      </div>
    </div>
  );

function formatEventTime(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  return `${startDate.toLocaleTimeString([], options)} to ${endDate.toLocaleTimeString([], options)}`;
}