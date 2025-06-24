export interface Goal {
  id: string;
  courseId: string;
  title: string;
  targetDate: string;
  workMinutesPerDay: number;
  frequency: 'daily' | 'weekly' | 'custom';
  customScheduleDays?: string[]; // ['monday', 'wednesday', 'friday']
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  goalId: string;
  name: string;
  scheduledDate: string;
  completed: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  name: string;
  type: 'reading' | 'practice' | 'flashcard' | 'quiz' | 'review' | 'other';
  estimatedTimeMinutes: number;
  completed: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
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