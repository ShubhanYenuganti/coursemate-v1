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
    if (goal.due_date) {
        const dueDate = new Date(goal.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // startOfToday equivalent
        
        // If due date is before today (not including today), it's overdue
        if (dueDate < today) {
            return "Overdue";
        }
    }

    // If not completed and not overdue, it's in progress
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