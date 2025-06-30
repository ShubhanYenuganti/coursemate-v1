import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { getMonthDays } from "../utils/calendar.utils"
import { startOfToday } from "../utils/date.utils"
import { groupTasksByTaskId } from "../utils/goal.progress"
import { calculateStatus } from "../utils/goal.status"

export const MonthView = ({ currentDate, setCurrentDate, getGoalsForDate, handleGoalClick, handleOverflowClick, getCourseColor }: any) => (
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
            const rawGoals = getGoalsForDate(d);
            
            // Group tasks by task_id like DayView and WeekView
            const groupedTasks = groupTasksByTaskId(rawGoals);
            const groupedGoals = Object.values(groupedTasks).map(group => ({
              ...group.subtasks[0], // Use first subtask as representative
              task_title: group.taskTitle,
              task_descr: group.taskDescr,
              start_time: group.startTime,
              end_time: group.endTime,
              course_id: group.courseId,
              google_calendar_color: group.googleCalendarColor,
              // Add progress information
              progress: group.progress,
              totalSubtasks: group.totalSubtasks,
              completedSubtasks: group.completedSubtasks,
              subtasks: group.subtasks,
              // Calculate status
              status: calculateStatus(group.subtasks[0])
            }));
  
            return (
              <div
                key={d.toISOString()}
                className={`bg-white p-2 min-h-[110px] overflow-visible ${!inMonth ? "bg-gray-50 text-gray-400" : ""}`}
              >
                <div
                  className={`text-sm font-medium mb-2 ${isToday
                    ? "bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center"
                    : ""
                    }`}
                >
                  {d.getDate()}
                </div>
  
                {groupedGoals.length === 0 ? (
                  // Empty state
                  <div></div>
                ) : groupedGoals.length <= 2 ? (
                  // 1-2 events - stacked with padding
                  <div className="space-y-1">
                    {groupedGoals.map((g: any) => (
                      <div
                        key={`${g.goal_id}-${g.task_id}-${g.subtask_id}`}
                        className="text-xs p-1 rounded text-white font-medium truncate cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: getCourseColor(g.course_id) }}
                        onClick={(e) => handleGoalClick(g, e)}
                      >
                        {g.task_title ?? "(untitled)"}
                      </div>
                    ))}
                  </div>
                ) : (
                  // 3+ events - show first 2 + count indicator
                  <div className="space-y-1">
                    {groupedGoals.slice(0, 2).map((g: any) => (
                      <div
                        key={`${g.goal_id}-${g.task_id}-${g.subtask_id}`}
                        className="text-xs p-1 rounded text-white font-medium truncate cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: getCourseColor(g.course_id) }}
                        onClick={(e) => handleGoalClick(g, e)}
                      >
                        {g.task_title ?? "(untitled)"}
                      </div>
                    ))}
                    {/* Count indicator for additional events */}
                    <div 
                      className="text-xs p-1 rounded text-gray-600 bg-gray-100 font-medium cursor-pointer hover:bg-gray-200 transition-colors"
                      title={`${groupedGoals.length - 2} more events`}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        handleOverflowClick(groupedGoals, { x: rect.left, y: rect.bottom }, d);
                      }}
                    >
                      +{groupedGoals.length - 2} more
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