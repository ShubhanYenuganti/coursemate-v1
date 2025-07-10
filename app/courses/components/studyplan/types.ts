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
  createdAt?: string;
  updatedAt?: string;
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
}

export interface TaskWithProgress extends Task {
  progress: number; // 0-100
  totalSubtasks: number;
  completedSubtasks: number;
  subtasks: Subtask[];
} 