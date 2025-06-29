import { colorForCourse } from "../utils/color.utils";
import { Goal } from "../utils/goal.types";
import { isAllDay, groupTasksByTaskId } from "../utils/goal.progress";
import { calculateStatus } from "../utils/goal.status";

export const AllDayRow = ({
    days,
    getGoalsForDate,
    handleGoalClick,
    onOverflowClick,
  }: {
    days: Date | Date[];
    getGoalsForDate: (d: Date) => Goal[];
    handleGoalClick: (g: Goal, e?: React.MouseEvent) => void;
    onOverflowClick: (events: Goal[], position: { x: number; y: number }, day: Date) => void;
  }) => {
    const dayList = Array.isArray(days) ? days : [days];
  
    return (
      <div className="flex border-b border-gray-200">
        {/* time-label column */}
        <div className="w-16 border-r border-gray-200 text-xs flex items-center justify-end pr-1 flex-shrink-0">
          <span className="text-gray-500">All-day</span>
        </div>
  
        {/* Day buckets with Google Calendar-style layout */}
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
                {/* Google Calendar-style all-day container */}
                <div className="min-h-[32px] p-1">
                  {groupedGoals.length === 0 ? (
                    // Empty state - minimal height
                    <div className="h-6"></div>
                  ) : groupedGoals.length === 1 ? (
                    // Single event - full width
                    <div
                      className="h-6 px-2 rounded text-xs font-medium text-white cursor-pointer truncate hover:opacity-90 transition-opacity flex items-center"
                      style={{ backgroundColor: colorForCourse(groupedGoals[0].course_id, groupedGoals[0].google_calendar_color) }}
                      title={groupedGoals[0].goal_descr ?? groupedGoals[0].task_title ?? ""}
                      onClick={(e) => handleGoalClick(groupedGoals[0], e)}
                    >
                      {groupedGoals[0].task_title ?? "(untitled)"}
                      {/* Show progress indicator for grouped tasks */}
                      {groupedGoals[0].totalSubtasks && groupedGoals[0].totalSubtasks > 1 && (
                        <span className="ml-1 opacity-75">({groupedGoals[0].completedSubtasks}/{groupedGoals[0].totalSubtasks})</span>
                      )}
                    </div>
                  ) : groupedGoals.length <= 3 ? (
                    // 2-3 events - stacked vertically
                    <div className="space-y-1">
                      {groupedGoals.map((g) => (
                        <div
                          key={`${g.goal_id}-${g.task_id}-${g.subtask_id}`}
                          className="h-6 px-2 rounded text-xs font-medium text-white cursor-pointer truncate hover:opacity-90 transition-opacity flex items-center"
                          style={{ backgroundColor: colorForCourse(g.course_id, g.google_calendar_color) }}
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
                    </div>
                  ) : (
                    // 4+ events - show first 3 + count indicator
                    <div className="space-y-1">
                      {groupedGoals.slice(0, 3).map((g) => (
                        <div
                          key={`${g.goal_id}-${g.task_id}-${g.subtask_id}`}
                          className="h-6 px-2 rounded text-xs font-medium text-white cursor-pointer truncate hover:opacity-90 transition-opacity flex items-center"
                          style={{ backgroundColor: colorForCourse(g.course_id, g.google_calendar_color) }}
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
                      {/* Count indicator for additional events */}
                      <div 
                        className="h-6 px-2 rounded text-xs font-medium text-gray-600 bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors flex items-center"
                        title={`${groupedGoals.length - 3} more events`}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          onOverflowClick(groupedGoals, { x: rect.left, y: rect.bottom }, d);
                        }}
                      >
                        +{groupedGoals.length - 3} more
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };