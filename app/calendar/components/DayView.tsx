import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { AllDayRow } from "./AllDayRow"
import { goalsStartingAtHour } from "../utils/calendar.utils"
import { calculateEventPositions } from "../utils/calendar.layout"
import { groupTasksByTaskId } from "../utils/goal.progress"
import { calculateStatus } from "../utils/goal.status"
import { startOfToday } from "../utils/date.utils"

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
  onTaskMouseLeave
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
  
          <div className="flex-1 relative overflow-visible">
            {hours.map((h: number) => {
              const goals = goalsStartingAtHour(currentDate, h, getGoalsForDate);
              // Render each subtask (row) as its own event
              const eventPositions = calculateEventPositions(goals, h, currentDate);

              // Check if this hour cell should show drag target shading
              const isDragTarget = isDraggingTask && dragTargetHour === h && dragTargetDate?.toDateString() === currentDate.toDateString();

              return (
                <div 
                  key={h} 
                  className={`h-20 border-b border-gray-200 relative p-1 overflow-visible transition-all duration-200 ${
                    isDragTarget ? 'bg-blue-50 border-2 border-blue-300 shadow-lg' : ''
                  }`}
                  onDragOver={(e) => {
                    // Calculate minute based on mouse position within the hour cell
                    const rect = e.currentTarget.getBoundingClientRect();
                    const relativeY = e.clientY - rect.top;
                    const cellHeight = rect.height;
                    const minute = Math.floor((relativeY / cellHeight) * 60);
                    // Snap to 30-minute intervals
                    const snappedMinute = Math.round(minute / 30) * 30;
                    handleTimeSlotDragOver?.(e, currentDate, h, snappedMinute);
                  }}
                  onDragLeave={(e) => handleTimeSlotDragLeave?.(e)}
                  onDrop={(e) => {
                    // Calculate minute based on mouse position within the hour cell
                    const rect = e.currentTarget.getBoundingClientRect();
                    const relativeY = e.clientY - rect.top;
                    const cellHeight = rect.height;
                    const minute = Math.floor((relativeY / cellHeight) * 60);
                    // Snap to 30-minute intervals
                    const snappedMinute = Math.round(minute / 30) * 30;
                    handleTimeSlotDrop?.(e, currentDate, h, snappedMinute);
                  }}
                >
                  {eventPositions.map((pos) => (
                    <div
                      key={`${pos.goal.goal_id}-${pos.goal.task_id}-${pos.goal.subtask_id}-${pos.goal.id}`}
                      className="absolute rounded p-2 text-xs text-white font-medium cursor-pointer hover:opacity-90 shadow-sm"
                      style={{
                        backgroundColor: getEventColor(pos.goal),
                        width: `${pos.width}%`,
                        left: `${pos.left}%`,
                        top: `${pos.top}%`,
                        height: `${pos.height}%`,
                        zIndex: pos.zIndex + 50, // High z-index to ensure overlay
                        minHeight: '20px', // Ensure minimum height for visibility
                      }}
                      tabIndex={0}
                      onClick={(e) => handleGoalClick(pos.goal, e)}
                      onMouseEnter={(e) => onTaskHover?.(pos.goal, e)}
                      onMouseLeave={() => onTaskMouseLeave?.()}
                      draggable={pos.goal.goal_id !== "Google Calendar"}
                      onDragStart={(e) => handleSubtaskDragStart?.(e, pos.goal)}
                      onDragEnd={(e) => handleSubtaskDragEnd?.(e)}
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
                </div>
              );
            })}
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