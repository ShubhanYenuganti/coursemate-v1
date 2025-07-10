import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { getMonthDays } from "../utils/calendar.utils"
import { startOfToday } from "../utils/date.utils"
import { groupTasksByTaskId } from "../utils/goal.progress"
import { calculateStatus } from "../utils/goal.status"

function formatEventTime(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  return `${startDate.toLocaleTimeString([], options)} to ${endDate.toLocaleTimeString([], options)}`;
}

export const MonthView = ({ 
  currentDate, 
  setCurrentDate, 
  getGoalsForDate, 
  handleGoalClick, 
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
  onDayClick,
  onTaskHover,
  onTaskMouseLeave
}: any) => (
    <>
      <div className="flex flex-col border-b border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-2xl font-semibold">
            {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h2>
  
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentDate(
                  new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
                )
              }
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
  
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(startOfToday())}>
              This Month
            </Button>
  
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentDate(
                  new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
                )
              }
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
  
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {["Su", "M", "Tu", "W", "Th", "F", "Sa"].map((d) => (
            <div key={d} className="bg-gray-50 p-3 text-center text-sm font-medium text-gray-500">
              {d}
            </div>
          ))}
        </div>
      </div>
  
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 gap-px bg-gray-200 h-full">
          {getMonthDays(currentDate).map((d: Date) => {
            const inMonth = d.getMonth() === currentDate.getMonth();
            const isToday = d.toDateString() === startOfToday().toDateString();
            const goals = getGoalsForDate(d);
            // Render each subtask (row) as its own event

            return (
              <div
                key={d.toISOString()}
                className={`p-2 min-h-[110px] overflow-visible transition-all duration-200 cursor-pointer hover:bg-gray-50 ${
                  dragOverDate && dragOverDate.toDateString() === d.toDateString() 
                    ? 'bg-blue-50 border-2 border-blue-300 shadow-lg' 
                    : !inMonth 
                      ? "bg-gray-50 text-gray-400" 
                      : "bg-white"
                } ${
                  isDraggingTask && !dragOverDate 
                    ? 'border-2 border-dashed border-gray-300' 
                    : ''
                }`}
                onDragOver={(e) => handleTimeSlotDragOver?.(e, d, 0)}
                onDragLeave={(e) => handleTimeSlotDragLeave?.(e)}
                onDrop={(e) => handleTimeSlotDrop?.(e, d, 0)}
                onClick={(e) => {
                  // Only trigger if clicking on the day cell itself, not on events
                  if (e.target === e.currentTarget || (e.target as Element).closest('.day-cell-content')) {
                    onDayClick?.(d);
                  }
                }}
              >
                <div
                  className={`text-sm font-medium mb-2 ${isToday
                    ? "bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center"
                    : ""
                    }`}
                >
                  {d.getDate()}
                </div>

                {goals.length === 0 ? (
                  // Empty state
                  <div className="day-cell-content h-full"></div>
                ) : goals.length <= 2 ? (
                  // 1-2 events - stacked with padding
                  <div className="space-y-1">
                    {goals.map((g: any) => (
                      <div
                        key={`${g.goal_id}-${g.task_id}-${g.subtask_id}`}
                        className={`text-xs p-1 rounded text-white font-medium truncate cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity ${
                          isDraggingTask ? 'opacity-30' : ''
                        }`}
                        style={{ backgroundColor: getEventColor(g) }}
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
                        <div className="font-semibold leading-tight truncate">
                          {g.goal_id === 'Google Calendar' ? (g.task_title ?? "(untitled)") : (g.subtask_descr ?? "(untitled)")}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // 3+ events - show first 2 + count indicator
                  <div className="space-y-1">
                    {goals.slice(0, 2).map((g: any) => (
                      <div
                        key={`${g.goal_id}-${g.task_id}-${g.subtask_id}`}
                        className={`text-xs p-1 rounded text-white font-medium truncate cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity ${
                          isDraggingTask ? 'opacity-30' : ''
                        }`}
                        style={{ backgroundColor: getEventColor(g) }}
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
                        <div className="font-semibold leading-tight truncate">
                          {g.goal_id === 'Google Calendar' ? (g.task_title ?? "(untitled)") : (g.subtask_descr ?? "(untitled)")}
                        </div>
                      </div>
                    ))}
                    {/* Count indicator for additional events */}
                    <div 
                      className="text-xs p-1 rounded text-gray-600 bg-gray-100 font-medium cursor-pointer hover:bg-gray-200 transition-colors"
                      title={`${goals.length - 2} more events`}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        // Only pass the additional events (beyond the first 2)
                        const additionalEvents = goals.slice(2);
                        handleOverflowClick(additionalEvents, { x: rect.left, y: rect.bottom }, d);
                      }}
                    >
                      +{goals.length - 2} more
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );