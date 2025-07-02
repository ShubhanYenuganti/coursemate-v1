export interface Goal {
    id: string;
    user_id: string;
    course_id: string;
    goal_id: string;
    goal_descr: string | null;
    due_date: string | null;          // ISO-8601 string (e.g. "2025-06-30T00:00:00")
    goal_completed: boolean;
    task_id: string | null;
    task_title: string | null;
    task_descr: string | null;
    task_completed: boolean;
    subtask_id: string | null;
    subtask_descr: string | null;
    subtask_type: string | null;
    subtask_completed: boolean;
    created_at: string | null;        // ISO
    updated_at: string | null;
    start_time: string | null;   // ISO string – NOT always midnight
    end_time: string | null;   // ISO string – ≧ start_time       // ISO
    google_calendar_color?: string | null;  // Hex color from Google Calendar
    // Progress tracking for grouped tasks
    progress?: number;
    totalSubtasks?: number;
    completedSubtasks?: number;
    subtasks?: Goal[];
    // Status field
    status?: "Overdue" | "In Progress" | "Completed" | null;
    sync_status?: "Synced" | "Not Synced" | null;
    google_calendar_id?: string | null;
}

export type GoalsByDate = Record<string, Goal[]>

export interface Course {
    goals: Goal[];
    course_id: string;
    course_title: string;
    course_description: string;
    color: string;
}