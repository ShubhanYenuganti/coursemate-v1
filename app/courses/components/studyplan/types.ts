export interface Goal {
  id: string;
  courseId: string;
  title: string;
  targetDate: string; // ISO date string
  workMinutesPerDay: number;
  frequency: 'daily' | 'weekly' | 'custom';
  customScheduleDays?: number[]; // Array of day numbers (0-6, where 0 is Sunday)
  createdAt: string;
  updatedAt: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface Task {
  id: string;
  goalId?: string;
  name: string;
  description?: string;
  scheduledDate: string; // ISO date string
  completed: boolean;
  estimatedHours?: number;
  priority?: 'high' | 'medium' | 'low';
  createdAt?: string;
  updatedAt?: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  name: string;
  description?: string;
  type: 'reading' | 'flashcard' | 'quiz' | 'practice' | 'review' | 'assessment' | 'other';
  estimatedMinutes?: number;
  estimatedTimeMinutes?: number;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  task_due_date?: string;
  subtask_order?: number;
  start_time?: string; // ISO string for scheduled start time
  end_time?: string;   // ISO string for scheduled end time
  timeSpentSeconds?: number; // Actual time spent on this subtask (in seconds)
  
  // Canvas-style time tracking fields
  subtask_engagement_start?: string; // ISO string for when user first started working on subtask
  subtask_engagement_end?: string;   // ISO string for when user finished working on subtask
  subtask_total_active_minutes?: number; // Total time spent (like Canvas's "time questions were on-screen")
  subtask_last_interaction?: string; // ISO string for last time user interacted with subtask
  has_conflict?: boolean;
}

export interface StudyPlanStats {
  totalGoals: number;
  completedGoals: number;
  totalTasks: number;
  completedTasks: number;
  totalSubtasks: number;
  completedSubtasks: number;
  averageCompletionRate: number;
  tasksOverdue: number;
  estimatedMinutesRemaining: number;
}

export interface GoalWithProgress extends Goal {
  progress: number; // 0-100
  totalTasks: number;
  completedTasks: number;
  completed: boolean;
  customScheduledDays?: string[];
}

export interface TaskWithProgress extends Task {
  progress: number; // 0-100
  totalSubtasks: number;
  completedSubtasks: number;
  subtasks: Subtask[];
  description: string;
  scheduledDate: string;
} 