import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react"
import { AllDayRow } from "./AllDayRow"
import { goalsStartingAtHour } from "../utils/calendar.utils"
import { calculateEventPositions } from "../utils/calendar.layout"
import { groupTasksByTaskId } from "../utils/goal.progress"
import { calculateStatus } from "../utils/goal.status"
import { startOfToday } from "../utils/date.utils"
import { calculateDayEventPositions } from "../utils/calendar.layout";
import { calculateSubtaskStatus } from "../utils/goal.status";

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
        <div className="w-16 border-r border-gray-200">
          {hours.map((h: number) => (
            <div key={h} className="h-16 border-b border-gray-200 p-2 text-xs text-gray-500 flex items-start justify-end pr-1">
              {formatHourLabel(h)}
            </div>
          ))}
        </div>

        {weekDates.map((d: Date) => {
          const eventPositions = calculateDayEventPositions(getGoalsForDate(d), d);
          return (
            <div
              key={d.toISOString()}
              className="flex-1 border-r border-gray-200 relative overflow-visible"
              style={{ minHeight: `${hours.length * 64}px` }}
              onDragOver={e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                const totalMinutes = (y / rect.height) * 1440;
                const hour = Math.floor(totalMinutes / 60);
                const minute = Math.floor((totalMinutes % 60) / 30) * 30;
                handleTimeSlotDragOver(e, d, hour, minute);
              }}
              onDrop={e => {
                if (!isDraggingTask || !draggedTask) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                const totalMinutes = (y / rect.height) * 1440;
                const hour = Math.floor(totalMinutes / 60);
                const minute = Math.floor((totalMinutes % 60) / 30) * 30;
                handleTimeSlotDrop(e, d, hour, minute);
              }}
              onMouseDown={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                const totalMinutes = (y / rect.height) * 1440;
                const hour = Math.floor(totalMinutes / 60);
                const minute = Math.floor((totalMinutes % 60) / 30) * 30;
                handleTimeSlotMouseDown?.(e, d, hour, minute);
              }}
              onMouseMove={e => {
                if (!handleTimeSlotMouseMove) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                const totalMinutes = (y / rect.height) * 1440;
                const hour = Math.floor(totalMinutes / 60);
                const minute = Math.floor((totalMinutes % 60) / 30) * 30;
                handleTimeSlotMouseMove(e, d, hour, minute);
              }}
              onMouseUp={e => {
                if (!handleTimeSlotMouseUp) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                const totalMinutes = (y / rect.height) * 1440;
                const hour = Math.floor(totalMinutes / 60);
                const minute = Math.floor((totalMinutes % 60) / 30) * 30;
                handleTimeSlotMouseUp(e, d, hour, minute);
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
              {/* Drag preview overlay for event placement (drag-to-create) */}
              {dragPreview && dragPreview.startDate.toDateString() === d.toDateString() && (() => {
                // Calculate start and end in minutes
                const startMinutes = dragPreview.startHour * 60 + (dragPreview.startMinute || 0);
                const endMinutes = dragPreview.endHour * 60 + (dragPreview.endMinute || 0);
                const top = (startMinutes / 1440) * 100;
                const height = Math.max(2, (endMinutes - startMinutes) / 1440 * 100);
                // Format time range
                const start = new Date(dragPreview.startDate);
                start.setHours(dragPreview.startHour, dragPreview.startMinute || 0, 0, 0);
                const end = new Date(dragPreview.endDate);
                end.setHours(dragPreview.endHour, dragPreview.endMinute || 0, 0, 0);
                const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
                const timeLabel = `${start.toLocaleTimeString([], options)} – ${end.toLocaleTimeString([], options)}`;
                return (
                  <div
                    className="absolute left-0 w-full pointer-events-none"
                    style={{
                      top: `${top}%`,
                      height: `${height}%`,
                      zIndex: 2000,
                      border: '2px solid #0a80ed',
                      background: 'rgba(10,128,237,0.10)',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      background: 'rgba(10,128,237,0.95)',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '13px',
                      padding: '2px 8px',
                      borderTopLeftRadius: '8px',
                      borderTopRightRadius: '8px',
                      textAlign: 'center',
                      pointerEvents: 'none',
                    }}>{timeLabel}</div>
                  </div>
                );
              })()}
              {/* Drag-and-drop preview overlay for moving events (dashed blue border) */}
              {isDraggingTask && draggedTask && dragTargetHour !== null && dragTargetDate?.toDateString() === d.toDateString() && (() => {
                // Calculate start and end in minutes (preserve event duration)
                const originalStart = new Date(draggedTask.start_time!);
                const originalEnd = new Date(draggedTask.end_time!);
                const durationMinutes = (originalEnd.getTime() - originalStart.getTime()) / 60000;
                const startMinutes = dragTargetHour * 60 + (dragTargetMinute || 0);
                const endMinutes = startMinutes + durationMinutes;
                const top = (startMinutes / 1440) * 100;
                const height = Math.max(2, (endMinutes - startMinutes) / 1440 * 100);
                return (
                  <div
                    className="absolute left-0 w-full pointer-events-none"
                    style={{
                      top: `${top}%`,
                      height: `${height}%`,
                      zIndex: 1000,
                      border: '2px dashed #2563eb',
                      background: 'rgba(37,99,235,0.08)',
                      borderRadius: 8,
                    }}
                  />
                );
              })()}
              {/* Render events */}
              {eventPositions.map((pos) => {
                const isOverdue = calculateSubtaskStatus(pos.goal) === 'Overdue' && pos.goal.goal_id !== 'Google Calendar';
                return (
                  <div
                    key={`${pos.goal.goal_id}-${pos.goal.task_id}-${pos.goal.subtask_id}-${pos.goal.id}`}
                    className={`absolute rounded p-2 text-xs font-medium cursor-pointer hover:opacity-90 shadow-sm
                      ${pos.goal.task_completed ? 'bg-gray-300 text-gray-500' : 'text-white'}
                      ${isOverdue ? 'border-4 border-red-500' : 'border-2 border-white'}
                    `}
                    style={{
                      backgroundColor: pos.goal.task_completed ? undefined : getEventColor(pos.goal),
                      width: `${pos.width}%`,
                      left: `${pos.left}%`,
                      top: `${pos.top}%`,
                      height: `${pos.height}%`,
                      zIndex: pos.zIndex + 50,
                      minHeight: '16px',
                      boxShadow: '0 2px 8px 0 rgba(0,0,0,0.06)',
                    }}
                    tabIndex={0}
                    onClick={(e) => handleGoalClick(pos.goal, e)}
                    onMouseEnter={(e) => onTaskHover(pos.goal, e)}
                    onMouseLeave={onTaskMouseLeave}
                    draggable={pos.goal.goal_id !== "Google Calendar"}
                    onDragStart={e => handleSubtaskDragStart(e, pos.goal)}
                    onDragEnd={e => handleSubtaskDragEnd(e)}
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
                      handleTimeSlotDrop(e, d, hour, minute);
                    }}
                  >
                    {/* Warning icon for conflicting events */}
                    {pos.goal.is_conflicting === true && (
                      <AlertTriangle className="absolute right-2 top-2 w-6 h-6 text-white drop-shadow" style={{zIndex: 100}} />
                    )}
                    {/* Event Title */}
                    <div className={`font-semibold leading-tight truncate pr-6 ${pos.goal.task_completed ? 'line-through' : ''}`} style={{ zIndex: pos.zIndex + 20 }}>
                      {pos.goal.goal_id === 'Google Calendar' ? (pos.goal.task_title ?? "(untitled)") : (pos.goal.subtask_descr ?? "(untitled)")}
                    </div>
                    {/* Status indicator for non-Google Calendar events */}
                    {pos.goal.goal_id !== "Google Calendar" && pos.goal.status && (
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
                );
              })}
              {/* Drag Preview and other overlays can go here if needed */}
            </div>
          );
        })}
      </div>
    </div>
  </>
);