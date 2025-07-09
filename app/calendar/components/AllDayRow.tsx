import { groupTasksByTaskId, isAllDay } from "../utils/goal.progress";
import { calculateStatus } from "../utils/goal.status";

import { Goal } from "../utils/goal.types";

export const AllDayRow = ({
    days,
    getGoalsForDate,
    handleGoalClick,
    onOverflowClick,
    getCourseColor
  }: {
    days: Date | Date[];
    getGoalsForDate: (d: Date) => Goal[];
    handleGoalClick: (g: Goal, e?: React.MouseEvent) => void;
    onOverflowClick: (events: Goal[], position: { x: number; y: number }, day: Date) => void;
    getCourseColor: (courseId: string) => string;
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
            const goals = getGoalsForDate(d).filter(isAllDay)
            const groupedTasks = groupTasksByTaskId(goals)
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
            }))
  
            /* add a right border when we're in week-view (i.e. days is an array)
               and this bucket is NOT the last one                              */
            const showDivider =
              Array.isArray(days) && idx < dayList.length - 1 ? "border-r border-gray-200" : "";
  
            return (
              <div
                key={d.toISOString()}
                className={`flex-1 min-w-0 ${showDivider}`}
              >
                {/* Fixed-width all-day container with 4 slots */}
                <div className="min-h-[32px] p-1">
                  <div className="grid grid-cols-2 gap-1 h-24">
                    {/* First 2 event slots - each takes 2 columns */}
                    {groupedGoals.slice(0, 2).map((g, index) => (
                      <div
                        key={`${g.goal_id}-${g.task_id}-${g.subtask_id}`}
                        className="h-6 px-2 rounded text-xs font-medium text-white cursor-pointer truncate hover:opacity-90 transition-opacity flex items-center col-span-2"
                        style={{ backgroundColor: getCourseColor(g.course_id) }}
                        title={g.goal_descr ?? g.task_title ?? ""}
                        onClick={(e) => handleGoalClick(g, e)}
                      >
                        {g.task_title ?? "(untitled)"}
                        {/* Show progress indicator for grouped tasks */}
                        {g.totalSubtasks && g.totalSubtasks > 1 && (
                          <span className="ml-1 opacity-75">({g.completedSubtasks}/{g.totalSubtasks})</span>
                        )}
                      </div>
                    ))}
                    
                    {/* +more indicator if there are more than 2 events */}
                    {groupedGoals.length > 2 && (
                      <div 
                        className="h-6 px-2 rounded text-xs font-medium text-gray-600 bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors flex items-center col-span-2"
                        title={`${groupedGoals.length - 2} more events`}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          // Only pass the additional events (beyond the first 2)
                          const additionalEvents = groupedGoals.slice(2);
                          onOverflowClick(additionalEvents, { x: rect.left, y: rect.bottom }, d);
                        }}
                      >
                        +{groupedGoals.length - 2} more
                      </div>
                    )}
                    
                    {/* Empty slots to fill the grid */}
                    {Array.from({ length: Math.max(0, 4 - Math.min(groupedGoals.length, 2) - (groupedGoals.length > 2 ? 1 : 0)) }, (_, index) => (
                      <div key={`empty-${index}`} className="h-6 col-span-2"></div>
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