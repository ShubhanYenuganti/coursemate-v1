import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { AllDayRow } from "./AllDayRow"
import { goalsStartingAtHour } from "../utils/calendar.utils"
import { calculateEventPositions } from "../utils/calendar.layout"
import { groupTasksByTaskId } from "../utils/goal.progress"
import { calculateStatus } from "../utils/goal.status"
import { startOfToday } from "../utils/date.utils"

function formatEventTime(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  return `${startDate.toLocaleTimeString([], options)} to ${endDate.toLocaleTimeString([], options)}`;
}

export const WeekView = ({ 
  setCurrentDate, 
  weekDates, 
  hours, 
  getGoalsForDate, 
  handleGoalClick, 
  setTimelineRef, 
  formatHourLabel, 
  handleOverflowClick, 
  getCourseColor,
  handleTaskDragStart,
  handleTaskDragEnd,
  handleDayDragOver,
  handleDayDragLeave,
  handleDayDrop,
  isDraggingTask,
  dragOverDate,
  onDayClick,
  onTaskHover,
  onTaskMouseLeave
}: any) => (
  <>
    <div className="flex flex-col border-b border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentDate((p: Date) => new Date(p.getFullYear(), p.getMonth(), p.getDate() - 7))
            }
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(startOfToday())}>
            This Week
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentDate((p: Date) => new Date(p.getFullYear(), p.getMonth(), p.getDate() + 7))
            }
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <h2 className="text-lg font-semibold text-gray-900">
          {weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
          {weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </h2>
      </div>

      <div className="flex">
        <div className="w-16 border-r border-gray-200 p-4 text-xs text-gray-500 flex-shrink-0" />
        {weekDates.map((d: Date) => {
          const isToday = d.toDateString() === startOfToday().toDateString();
          return (
            <div
              key={d.toISOString()}
              className="flex-1 border-r border-gray-200 p-4 text-center min-w-0"
            >
              <div className="text-xs text-gray-500 mb-1">
                {d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}
              </div>
              <div className={`text-2xl font-semibold ${isToday ? "text-blue-600" : "text-gray-900"}`}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>
    </div>

    <AllDayRow
      days={weekDates}         // pass the whole week array
      getGoalsForDate={getGoalsForDate}
      handleGoalClick={handleGoalClick}
      onOverflowClick={handleOverflowClick}
      getCourseColor={getCourseColor}
      handleTaskDragStart={handleTaskDragStart}
      handleTaskDragEnd={handleTaskDragEnd}
      handleDayDragOver={handleDayDragOver}
      handleDayDragLeave={handleDayDragLeave}
      handleDayDrop={handleDayDrop}
      isDraggingTask={isDraggingTask}
      dragOverDate={dragOverDate}
      onDayClick={onDayClick}
      onTaskHover={onTaskHover}
      onTaskMouseLeave={onTaskMouseLeave}
    />

    <div className="flex-1 overflow-y-auto" ref={setTimelineRef}>
      <div className="flex">
        <div className="w-16 border-r border-gray-200">
          {hours.map((h: number) => (
            <div key={h} className="h-16 border-b border-gray-200 p-2 text-xs text-gray-500 flex items-start justify-end pr-1">
              {formatHourLabel(h)}
            </div>
          ))}
        </div>

        {weekDates.map((d: Date) => (
          <div key={d.toISOString()} className="flex-1 border-r border-gray-200 relative overflow-visible">
            {hours.map((h: number) => {
              const goals = goalsStartingAtHour(d, h, getGoalsForDate);
              // Render each subtask (row) as its own event
              const eventPositions = calculateEventPositions(goals, h, d);

              return (
                <div key={h} className="h-16 border-b border-gray-200 p-1 relative overflow-visible">
                  {eventPositions.map((pos) => (
                    <div
                      key={`${pos.goal.goal_id}-${pos.goal.task_id}-${pos.goal.subtask_id}-${pos.goal.id}`}
                      className="absolute rounded p-2 text-xs text-white font-medium cursor-pointer hover:opacity-90 shadow-sm"
                      style={{
                        backgroundColor: getCourseColor(pos.goal.course_id),
                        width: `${pos.width}%`,
                        left: `${pos.left}%`,
                        top: `${pos.top}%`,
                        height: `${pos.height}%`,
                        zIndex: pos.zIndex + 50, // High z-index to ensure overlay
                        minHeight: '16px', // Ensure minimum height for visibility
                      }}
                      tabIndex={0}
                      onClick={(e) => handleGoalClick(pos.goal, e)}
                      onMouseEnter={(e) => onTaskHover?.(pos.goal, e)}
                      onMouseLeave={() => onTaskMouseLeave?.()}
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
        ))}
      </div>
    </div>
  </>
);