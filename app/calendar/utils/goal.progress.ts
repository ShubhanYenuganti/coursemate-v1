import { Goal } from "./goal.types";

/** True if the goal is an all-day event (no real clock component) */
export const isAllDay = (g: Goal) => {
    if (!g.start_time || !g.end_time) return true;
    const start = new Date(g.start_time);
    const end = new Date(g.end_time);
    return start.getHours() === 0 && start.getMinutes() === 0 &&
        end.getHours() === 0 && end.getMinutes() === 0;
};

/** Height percentage the card must occupy in its hour-row grid */
export const heightPct = (g: Goal) => {
    const start = new Date(g.start_time ?? g.due_date!);
    const end = new Date(g.end_time ?? g.due_date!);
    return ((end.getTime() - start.getTime()) / 3_600_000) * 100;
};

/** Minutes (plus fractional) past the hour where this goal really starts */
export const minuteOffset = (g: Goal) => {
    const s = new Date(g.start_time ?? g.due_date!);
    return s.getMinutes() + s.getSeconds() / 60;
};

/** Group tasks by task_id for non-Google Calendar goals and calculate subtask progress */
export const groupTasksByTaskId = (goals: Goal[]) => {
    const groupedTasks: Record<string, {
        taskId: string;
        taskTitle: string;
        taskDescr: string;
        subtasks: Goal[];
        completedSubtasks: number;
        totalSubtasks: number;
        progress: number;
        startTime: string | null;
        endTime: string | null;
        courseId: string;
        googleCalendarColor: string | null;
    }> = {};

    goals.forEach(goal => {
        // Only group non-Google Calendar goals
        if (goal.goal_id === "Google Calendar") {
            // For Google Calendar events, treat each as individual
            const key = `${goal.goal_id}-${goal.task_id}-${goal.subtask_id}`;
            groupedTasks[key] = {
                taskId: goal.task_id || '',
                taskTitle: goal.task_title || '',
                taskDescr: goal.task_descr || '',
                subtasks: [goal],
                completedSubtasks: goal.subtask_completed ? 1 : 0,
                totalSubtasks: 1,
                progress: goal.subtask_completed ? 100 : 0,
                startTime: goal.start_time || null,
                endTime: goal.end_time || null,
                courseId: goal.course_id,
                googleCalendarColor: goal.google_calendar_color ?? null
            };
        } else {
            // Group by task_id for regular goals
            const taskId = goal.task_id || '';
            if (!groupedTasks[taskId]) {
                groupedTasks[taskId] = {
                    taskId,
                    taskTitle: goal.task_title || '',
                    taskDescr: goal.task_descr || '',
                    subtasks: [],
                    completedSubtasks: 0,
                    totalSubtasks: 0,
                    progress: 0,
                    startTime: goal.start_time || null,
                    endTime: goal.end_time || null,
                    courseId: goal.course_id,
                    googleCalendarColor: goal.google_calendar_color ?? null
                };
            }

            groupedTasks[taskId].subtasks.push(goal);
            if (goal.subtask_completed) {
                groupedTasks[taskId].completedSubtasks++;
            }
        }
    });

    // Calculate progress for each group
    Object.values(groupedTasks).forEach(group => {
        group.totalSubtasks = group.subtasks.length;
        group.progress = group.totalSubtasks > 0 ? Math.round((group.completedSubtasks / group.totalSubtasks) * 100) : 0;
    });

    return groupedTasks;
};