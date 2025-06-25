import { Goal, Task, Subtask, GoalWithProgress, TaskWithProgress } from './types';

// Mock data for development
export const mockGoals: Goal[] = [
  {
    id: '1',
    courseId: 'fb5da4cf-205a-495d-9146-2ea3b0606487',
    title: 'Final Exam Preparation',
    targetDate: '2025-12-15',
    workMinutesPerDay: 120,
    frequency: 'daily',
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '2',
    courseId: 'fb5da4cf-205a-495d-9146-2ea3b0606487',
    title: 'Lab Report',
    targetDate: '2024-09-20',
    workMinutesPerDay: 45,
    frequency: 'daily',
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '3',
    courseId: 'fb5da4cf-205a-495d-9146-2ea3b0606487',
    title: 'Research Paper',
    targetDate: '2024-10-15',
    workMinutesPerDay: 60,
    frequency: 'custom',
    customScheduleDays: [1, 3, 5], // Monday, Wednesday, Friday
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  }
];

export const mockTasks: Task[] = [
  // Tasks for Goal 1 (Final Exam Preparation) - Ongoing goal
  {
    id: '1',
    goalId: '1',
    name: 'Review Chapter 1-3',
    scheduledDate: '2024-12-10',
    completed: false,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '2',
    goalId: '1',
    name: 'Practice Problems Set A',
    scheduledDate: '2024-12-11',
    completed: true,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '3',
    goalId: '1',
    name: 'Create Study Flashcards',
    scheduledDate: '2024-12-12',
    completed: false,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '4',
    goalId: '1',
    name: 'Mock Exam Practice',
    scheduledDate: '2024-12-13',
    completed: false,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  
  // Tasks for Goal 2 (Lab Report) - Completed goal
  {
    id: '5',
    goalId: '2',
    name: 'Lab Experiment',
    scheduledDate: '2024-09-15',
    completed: true,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '6',
    goalId: '2',
    name: 'Data Analysis',
    scheduledDate: '2024-09-17',
    completed: true,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '7',
    goalId: '2',
    name: 'Write Report',
    scheduledDate: '2024-09-19',
    completed: true,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  
  // Tasks for Goal 3 (Research Paper) - Overdue goal
  {
    id: '8',
    goalId: '3',
    name: 'Literature Review',
    scheduledDate: '2024-10-10',
    completed: true,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '9',
    goalId: '3',
    name: 'Methodology Section',
    scheduledDate: '2024-10-12',
    completed: false,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '10',
    goalId: '3',
    name: 'Results & Discussion',
    scheduledDate: '2024-10-14',
    completed: false,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  }
];

export const mockSubtasks: Subtask[] = [
  // Subtasks for Task 1 (Review Chapter 1-3) - Ongoing
  {
    id: '1',
    taskId: '1',
    name: 'Read Chapter 1',
    type: 'reading',
    estimatedTimeMinutes: 30,
    completed: true,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '2',
    taskId: '1',
    name: 'Take notes on key concepts',
    type: 'reading',
    estimatedTimeMinutes: 20,
    completed: false,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '3',
    taskId: '1',
    name: 'Review chapter summary',
    type: 'review',
    estimatedTimeMinutes: 10,
    completed: false,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  
  // Subtasks for Task 2 (Practice Problems Set A) - Completed
  {
    id: '4',
    taskId: '2',
    name: 'Complete problems 1-5',
    type: 'practice',
    estimatedTimeMinutes: 25,
    completed: true,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '5',
    taskId: '2',
    name: 'Complete problems 6-10',
    type: 'practice',
    estimatedTimeMinutes: 30,
    completed: true,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '6',
    taskId: '2',
    name: 'Review solutions',
    type: 'review',
    estimatedTimeMinutes: 15,
    completed: true,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  
  // Subtasks for Task 3 (Create Study Flashcards) - Ongoing
  {
    id: '7',
    taskId: '3',
    name: 'Create flashcards for Chapter 1',
    type: 'flashcard',
    estimatedTimeMinutes: 20,
    completed: false,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '8',
    taskId: '3',
    name: 'Create flashcards for Chapter 2',
    type: 'flashcard',
    estimatedTimeMinutes: 25,
    completed: false,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '9',
    taskId: '3',
    name: 'Practice with flashcards',
    type: 'practice',
    estimatedTimeMinutes: 15,
    completed: false,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  
  // Subtasks for Task 4 (Mock Exam Practice) - Future
  {
    id: '10',
    taskId: '4',
    name: 'Take practice quiz 1',
    type: 'quiz',
    estimatedTimeMinutes: 30,
    completed: false,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '11',
    taskId: '4',
    name: 'Review incorrect answers',
    type: 'review',
    estimatedTimeMinutes: 20,
    completed: false,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '12',
    taskId: '4',
    name: 'Take practice quiz 2',
    type: 'quiz',
    estimatedTimeMinutes: 30,
    completed: false,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  
  // Subtasks for Task 5 (Lab Experiment) - Completed
  {
    id: '13',
    taskId: '5',
    name: 'Set up lab equipment',
    type: 'practice',
    estimatedTimeMinutes: 20,
    completed: true,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '14',
    taskId: '5',
    name: 'Run experiment',
    type: 'practice',
    estimatedTimeMinutes: 45,
    completed: true,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '15',
    taskId: '5',
    name: 'Record observations',
    type: 'other',
    estimatedTimeMinutes: 15,
    completed: true,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  
  // Subtasks for Task 6 (Data Analysis) - Completed
  {
    id: '16',
    taskId: '6',
    name: 'Process raw data',
    type: 'practice',
    estimatedTimeMinutes: 30,
    completed: true,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '17',
    taskId: '6',
    name: 'Create data visualizations',
    type: 'practice',
    estimatedTimeMinutes: 45,
    completed: true,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '18',
    taskId: '6',
    name: 'Perform statistical analysis',
    type: 'practice',
    estimatedTimeMinutes: 60,
    completed: true,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  
  // Subtasks for Task 7 (Write Report) - Completed
  {
    id: '19',
    taskId: '7',
    name: 'Write introduction',
    type: 'other',
    estimatedTimeMinutes: 30,
    completed: true,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '20',
    taskId: '7',
    name: 'Write methods section',
    type: 'other',
    estimatedTimeMinutes: 25,
    completed: true,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '21',
    taskId: '7',
    name: 'Write results and discussion',
    type: 'other',
    estimatedTimeMinutes: 45,
    completed: true,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '22',
    taskId: '7',
    name: 'Write conclusion',
    type: 'other',
    estimatedTimeMinutes: 20,
    completed: true,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  
  // Subtasks for Task 8 (Literature Review) - Completed
  {
    id: '23',
    taskId: '8',
    name: 'Search academic databases',
    type: 'reading',
    estimatedTimeMinutes: 30,
    completed: true,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '24',
    taskId: '8',
    name: 'Read selected papers',
    type: 'reading',
    estimatedTimeMinutes: 90,
    completed: true,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '25',
    taskId: '8',
    name: 'Write literature review',
    type: 'other',
    estimatedTimeMinutes: 120,
    completed: true,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  
  // Subtasks for Task 9 (Methodology Section) - Overdue
  {
    id: '26',
    taskId: '9',
    name: 'Define research methods',
    type: 'other',
    estimatedTimeMinutes: 45,
    completed: false,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '27',
    taskId: '9',
    name: 'Write methodology section',
    type: 'other',
    estimatedTimeMinutes: 60,
    completed: false,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  
  // Subtasks for Task 10 (Results & Discussion) - Overdue
  {
    id: '28',
    taskId: '10',
    name: 'Analyze research data',
    type: 'practice',
    estimatedTimeMinutes: 75,
    completed: false,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '29',
    taskId: '10',
    name: 'Write results section',
    type: 'other',
    estimatedTimeMinutes: 90,
    completed: false,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '30',
    taskId: '10',
    name: 'Write discussion section',
    type: 'other',
    estimatedTimeMinutes: 60,
    completed: false,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z'
  }
];

// Helper functions to get data with progress
export const getGoalsWithProgress = (courseId: string): GoalWithProgress[] => {
  const goals = mockGoals.filter(goal => goal.courseId === courseId);
  
  return goals.map(goal => {
    const goalTasks = mockTasks.filter(task => task.goalId === goal.id);
    const completedTasks = goalTasks.filter(task => task.completed).length;
    const progress = goalTasks.length > 0 ? (completedTasks / goalTasks.length) * 100 : 0;
    
    return {
      ...goal,
      progress: Math.round(progress),
      totalTasks: goalTasks.length,
      completedTasks
    };
  });
};

export const getTasksWithProgress = (goalId: string): TaskWithProgress[] => {
  const tasks = mockTasks.filter(task => task.goalId === goalId);
  
  return tasks.map(task => {
    const taskSubtasks = mockSubtasks.filter(subtask => subtask.taskId === task.id);
    const completedSubtasks = taskSubtasks.filter(subtask => subtask.completed).length;
    const progress = taskSubtasks.length > 0 ? (completedSubtasks / taskSubtasks.length) * 100 : 0;
    
    return {
      ...task,
      progress: Math.round(progress),
      totalSubtasks: taskSubtasks.length,
      completedSubtasks,
      subtasks: taskSubtasks
    };
  });
};

export const getSubtasksForTask = (taskId: string): Subtask[] => {
  return mockSubtasks.filter(subtask => subtask.taskId === taskId);
}; 