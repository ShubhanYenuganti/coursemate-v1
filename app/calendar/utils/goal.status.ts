import { Goal } from "./goal.types";

/** Calculate status based on completion and due date */
export const calculateStatus = (goal: Goal): "Overdue" | "In Progress" | "Completed" | null => {
    // Return null if it's a Google Calendar entry
    if (goal.goal_id === "Google Calendar") {
        return null;
    }

    // If task is completed, status is "Completed"
    if (goal.task_completed) {
        return "Completed";
    }

    // If task is not completed, check if it's overdue
    if (goal.task_due_date) {
        let dueLocal: Date;
        // If the due date is a UTC midnight string (ends with Z or +00:00 and time is 00:00:00), treat as local date
        if (typeof goal.task_due_date === 'string' &&
            (goal.task_due_date.endsWith('Z') || goal.task_due_date.endsWith('+00:00')) &&
            goal.task_due_date.includes('T00:00:00')) {
            // Parse as local date (ignore timezone)
            const [year, month, day] = goal.task_due_date.split('T')[0].split('-').map(Number);
            dueLocal = new Date(year, month - 1, day);
            console.log('[calculateStatus] Parsed UTC midnight string as local date:', goal.task_due_date, '->', dueLocal);
        } else {
            // Fallback: parse as normal date
            const dueDate = new Date(goal.task_due_date);
            dueLocal = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
            console.log('[calculateStatus] Parsed as normal date:', goal.task_due_date, '->', dueLocal);
        }
        const today = new Date();
        const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        // Debugging logs
        console.log('[calculateStatus] goal:', goal);
        console.log('[calculateStatus] dueLocal:', dueLocal, 'todayLocal:', todayLocal);
        console.log('[calculateStatus] dueLocal < todayLocal:', dueLocal < todayLocal);
        console.log('[calculateStatus] dueLocal === todayLocal:', dueLocal.getTime() === todayLocal.getTime());

        // If due date is strictly before today, it's overdue
        if (dueLocal < todayLocal) {
            return "Overdue";
        }
    }

    // If not completed and not overdue, it's in progress
    return "In Progress";
};

/** Calculate subtask status based on completion and end time */
export const calculateSubtaskStatus = (subtask: Goal): "Overdue" | "In Progress" | "Completed" => {
    if (subtask.subtask_completed) {
        return "Completed";
    }
    if (subtask.end_time) {
        const endTime = new Date(subtask.end_time);
        const now = new Date();
        if (now > endTime) {
            return "Overdue";
        }
    }
    return "In Progress";
};

/** Get color class based on status */
export const getStatusColor = (status: "Overdue" | "In Progress" | "Completed" | null): string => {
    switch (status) {
      case "Overdue":
        return "text-red-600";
      case "In Progress":
        return "text-yellow-600";
      case "Completed":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };