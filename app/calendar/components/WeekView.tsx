import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { AllDayRow } from "./AllDayRow"
import { goalsStartingAtHour } from "../utils/calendar.utils"
import { calculateEventPositions } from "../utils/calendar.layout"
import { groupTasksByTaskId } from "../utils/goal.progress"
import { calculateStatus } from "../utils/goal.status"
import { startOfToday } from "../utils/date.utils"

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
  dragOverDate
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
              const groupedTasks = groupTasksByTaskId(goals);
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
              const eventPositions = calculateEventPositions(groupedGoals, h, d);

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
                        zIndex: pos.zIndex,
                        minHeight: '16px', // Ensure minimum height for visibility
                      }}
                      onClick={(e) => handleGoalClick(pos.goal, e)}
                    >
                      {pos.showTitle && (
                        <div className="font-semibold leading-tight truncate">
                          {pos.goal.task_title ?? "(untitled)"}
                        </div>
                      )}
                      {pos.showTitle && pos.goal.goal_descr && (
                        <div className="text-[11px] opacity-90 truncate">
                          {pos.goal.goal_descr}
                        </div>
                      )}
                      {/* Show status indicator for non-Google Calendar events */}
                      {pos.showTitle && pos.goal.status && pos.goal.goal_id !== "Google Calendar" && (
                        <div className="text-[10px] mt-1 flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${
                            pos.goal.status === "Overdue" ? "bg-red-400" :
                            pos.goal.status === "In Progress" ? "bg-yellow-400" :
                            "bg-green-400"
                          }`} />
                          <span className="opacity-90">{pos.goal.status}</span>
                        </div>
                      )}
                      {/* Show progress for grouped tasks */}
                      {pos.showTitle && pos.goal.progress !== undefined && pos.goal.totalSubtasks && pos.goal.totalSubtasks > 1 && (
                        <div className="text-[10px] opacity-90 mt-1">
                          {pos.goal.completedSubtasks}/{pos.goal.totalSubtasks} subtasks
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