"use client"

import { useState, useEffect } from 'react';
import { Sidebar } from '../dashboard/components/sidebar';
import useAuthRedirect from "@/hooks/useAuthRedirect";
import { ChevronDown, ChevronRight, Target, TrendingUp, Calendar, Clock, CheckCircle, Circle, BarChart3, PieChart, Activity, MessageSquare, X } from 'lucide-react';
import { ProgressChart } from '@/components/charts/ProgressChart';
import { PieChart as PieChartComponent } from '@/components/charts/PieChart';
import { BarChart } from '@/components/charts/BarChart';
import { GoalWithProgress, Task, Subtask, StudyPlanStats } from '../courses/components/studyplan/types';
import { courseService } from '@/lib/api/courseService';
import { PomodoroProvider } from '../courses/components/PomodoroContext';
import { PomodoroTimer } from '../courses/components/PomodoroTimer';

interface CourseData {
  id?: string;
  title: string;
  subject: string;
  course_code?: string;
  semester: string;
  professor?: string;
  units?: number;
  variable_units?: boolean;
  description: string;
  visibility?: 'Public' | 'Private' | 'Only Me' | 'Friends Only';
  tags?: string[];
  collaborators?: string[];
  daily_progress?: number;
  is_pinned?: boolean;
  is_archived?: boolean;
  badge?: 'Creator' | 'Enrolled';
  course_image?: string;
  materials?: string[];
  created_at?: string;
  updated_at?: string;
  last_accessed?: string;
}

interface Course {
  id: string;
  title: string;
  subject: string;
  goals: GoalWithProgress[];
  stats: {
    totalGoals: number;
    completedGoals: number;
    totalTasks: number;
    completedTasks: number;
    progress: number;
  };
}

interface TaskWithSubtasks {
  id: string;
  name: string;
  scheduledDate: string;
  completed: boolean;
  subtasks: {
    id: string;
    name: string;
    type: string;
    estimatedTimeMinutes: number;
    completed: boolean;
  }[];
}

export default function StudyPlanPage() {
  const loading = useAuthRedirect();
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [viewMode, setViewMode] = useState<'courses' | 'study-plan'>('courses');
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [expandedFeedbackGoals, setExpandedFeedbackGoals] = useState<Set<string>>(new Set());
  const [courses, setCourses] = useState<Course[]>([]);
  const [tasksData, setTasksData] = useState<Record<string, TaskWithSubtasks[]>>({});
  const [overallStats, setOverallStats] = useState<StudyPlanStats>({
    totalGoals: 0,
    completedGoals: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalSubtasks: 0,
    completedSubtasks: 0,
    averageCompletionRate: 0,
    tasksOverdue: 0,
    estimatedMinutesRemaining: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{ task: any, goal: any, feedback: string } | null>(null);
  const [pomodoroModal, setPomodoroModal] = useState<{ subtask: any, task: any, goal: any } | null>(null);
  const [selectedCourseForDetail, setSelectedCourseForDetail] = useState<string>('');

  // Fetch user's enrolled courses and their goals
  useEffect(() => {
    const fetchCoursesAndGoals = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Placeholder courses
        const placeholderCourses: CourseData[] = [
          {
            id: 'placeholder-1',
            title: 'Calculus 101',
            subject: 'Mathematics',
            semester: 'Fall 2024',
            professor: 'Prof. Einstein',
            description: 'Introductory calculus course covering limits, derivatives, and integrals.',
            badge: 'Enrolled',
            course_image: 'https://images.unsplash.com/photo-1503676382389-4809596d5290?w=400&h=200&fit=crop',
          },
          {
            id: 'placeholder-2',
            title: 'Physics Fundamentals',
            subject: 'Physics',
            semester: 'Spring 2024',
            professor: 'Prof. Newton',
            description: 'Fundamental concepts in physics including motion, forces, and energy.',
            badge: 'Enrolled',
            course_image: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?w=400&h=200&fit=crop',
          },
          {
            id: 'placeholder-3',
            title: 'World History',
            subject: 'History',
            semester: 'Fall 2024',
            professor: 'Prof. Curie',
            description: 'A survey of world history from ancient to modern times.',
            badge: 'Enrolled',
            course_image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=400&h=200&fit=crop',
          },
        ];

        const coursesWithGoals: Course[] = [];
        const allTasksData: Record<string, TaskWithSubtasks[]> = {};

        // For each placeholder course, generate placeholder goals, tasks, and subtasks
        for (const courseData of placeholderCourses) {
          // Placeholder goals for each course
          const placeholderGoals: GoalWithProgress[] = [
            {
              id: `${courseData.id}-goal-1`,
              courseId: courseData.id!,
              title: courseData.subject === 'Mathematics' ? 'Ace the Midterm Exam' : courseData.subject === 'Physics' ? 'Complete Lab Project' : 'Write Research Paper',
              targetDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
              workMinutesPerDay: 60,
              frequency: 'daily',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              progress: 0,
              totalTasks: 0,
              completedTasks: 0
            },
            {
              id: `${courseData.id}-goal-2`,
              courseId: courseData.id!,
              title: courseData.subject === 'Mathematics' ? 'Finish Homework Assignments' : courseData.subject === 'Physics' ? 'Prepare for Final Exam' : 'Prepare Presentation',
              targetDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
              workMinutesPerDay: 45,
              frequency: 'weekly',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              progress: 0,
              totalTasks: 0,
              completedTasks: 0
            }
          ];

          // Add placeholder tasks and subtasks for each goal (reuse the logic already present)
          const courseTasks: TaskWithSubtasks[] = [];
          for (const goal of placeholderGoals) {
            // Generate placeholder tasks for each goal based on goal title
            const goalTitle = goal.title.toLowerCase();
            let placeholderTasks: TaskWithSubtasks[] = [];
            if (goalTitle.includes('exam') || goalTitle.includes('test')) {
              placeholderTasks = [
                {
                  id: `${goal.id}-task-1`,
                  name: `Study Material Review`,
                  scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                  completed: true,
                  subtasks: [
                    {
                      id: `${goal.id}-task-1-subtask-1`,
                      name: 'Review lecture notes',
                      type: 'Review',
                      estimatedTimeMinutes: 45,
                      completed: true
                    },
                    {
                      id: `${goal.id}-task-1-subtask-2`,
                      name: 'Read textbook chapters',
                      type: 'Reading',
                      estimatedTimeMinutes: 60,
                      completed: true
                    },
                    {
                      id: `${goal.id}-task-1-subtask-3`,
                      name: 'Create study flashcards',
                      type: 'Study',
                      estimatedTimeMinutes: 30,
                      completed: true
                    }
                  ]
                },
                {
                  id: `${goal.id}-task-2`,
                  name: `Practice Problems`,
                  scheduledDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
                  completed: true,
                  subtasks: [
                    {
                      id: `${goal.id}-task-2-subtask-1`,
                      name: 'Complete practice questions',
                      type: 'Practice',
                      estimatedTimeMinutes: 90,
                      completed: true
                    },
                    {
                      id: `${goal.id}-task-2-subtask-2`,
                      name: 'Review incorrect answers',
                      type: 'Review',
                      estimatedTimeMinutes: 45,
                      completed: true
                    },
                    {
                      id: `${goal.id}-task-2-subtask-3`,
                      name: 'Take practice quiz',
                      type: 'Quiz',
                      estimatedTimeMinutes: 30,
                      completed: true
                    }
                  ]
                },
                {
                  id: `${goal.id}-task-3`,
                  name: `Final Preparation`,
                  scheduledDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
                  completed: true,
                  subtasks: [
                    {
                      id: `${goal.id}-task-3-subtask-1`,
                      name: 'Review key concepts',
                      type: 'Review',
                      estimatedTimeMinutes: 60,
                      completed: true
                    },
                    {
                      id: `${goal.id}-task-3-subtask-2`,
                      name: 'Get good sleep',
                      type: 'Preparation',
                      estimatedTimeMinutes: 480,
                      completed: true
                    }
                  ]
                }
              ];
            } else if (goalTitle.includes('project') || goalTitle.includes('assignment')) {
              placeholderTasks = [
                {
                  id: `${goal.id}-task-1`,
                  name: `Research and Planning`,
                  scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                  completed: true,
                  subtasks: [
                    {
                      id: `${goal.id}-task-1-subtask-1`,
                      name: 'Research topic thoroughly',
                      type: 'Research',
                      estimatedTimeMinutes: 60,
                      completed: true
                    },
                    {
                      id: `${goal.id}-task-1-subtask-2`,
                      name: 'Create project outline',
                      type: 'Planning',
                      estimatedTimeMinutes: 45,
                      completed: true
                    },
                    {
                      id: `${goal.id}-task-1-subtask-3`,
                      name: 'Set project milestones',
                      type: 'Planning',
                      estimatedTimeMinutes: 30,
                      completed: true
                    }
                  ]
                },
                {
                  id: `${goal.id}-task-2`,
                  name: `Development Phase`,
                  scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                  completed: true,
                  subtasks: [
                    {
                      id: `${goal.id}-task-2-subtask-1`,
                      name: 'Write first draft',
                      type: 'Writing',
                      estimatedTimeMinutes: 120,
                      completed: true
                    },
                    {
                      id: `${goal.id}-task-2-subtask-2`,
                      name: 'Create visual elements',
                      type: 'Design',
                      estimatedTimeMinutes: 90,
                      completed: true
                    },
                    {
                      id: `${goal.id}-task-2-subtask-3`,
                      name: 'Implement core features',
                      type: 'Development',
                      estimatedTimeMinutes: 180,
                      completed: true
                    }
                  ]
                },
                {
                  id: `${goal.id}-task-3`,
                  name: `Final Review and Submission`,
                  scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  completed: true,
                  subtasks: [
                    {
                      id: `${goal.id}-task-3-subtask-1`,
                      name: 'Proofread and edit',
                      type: 'Review',
                      estimatedTimeMinutes: 60,
                      completed: true
                    },
                    {
                      id: `${goal.id}-task-3-subtask-2`,
                      name: 'Format document',
                      type: 'Formatting',
                      estimatedTimeMinutes: 30,
                      completed: true
                    },
                    {
                      id: `${goal.id}-task-3-subtask-3`,
                      name: 'Submit final work',
                      type: 'Submission',
                      estimatedTimeMinutes: 15,
                      completed: true
                    }
                  ]
                }
              ];
            } else if (goalTitle.includes('presentation') || goalTitle.includes('speech')) {
              placeholderTasks = [
                {
                  id: `${goal.id}-task-1`,
                  name: `Content Preparation`,
                  scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                  completed: true,
                  subtasks: [
                    {
                      id: `${goal.id}-task-1-subtask-1`,
                      name: 'Research presentation topic',
                      type: 'Research',
                      estimatedTimeMinutes: 60,
                      completed: true
                    },
                    {
                      id: `${goal.id}-task-1-subtask-2`,
                      name: 'Create presentation outline',
                      type: 'Planning',
                      estimatedTimeMinutes: 45,
                      completed: true
                    },
                    {
                      id: `${goal.id}-task-1-subtask-3`,
                      name: 'Write speech notes',
                      type: 'Writing',
                      estimatedTimeMinutes: 90,
                      completed: true
                    }
                  ]
                },
                {
                  id: `${goal.id}-task-2`,
                  name: `Visual Design`,
                  scheduledDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
                  completed: true,
                  subtasks: [
                    {
                      id: `${goal.id}-task-2-subtask-1`,
                      name: 'Create slides',
                      type: 'Design',
                      estimatedTimeMinutes: 120,
                      completed: true
                    },
                    {
                      id: `${goal.id}-task-2-subtask-2`,
                      name: 'Add visual elements',
                      type: 'Design',
                      estimatedTimeMinutes: 60,
                      completed: true
                    },
                    {
                      id: `${goal.id}-task-2-subtask-3`,
                      name: 'Review slide flow',
                      type: 'Review',
                      estimatedTimeMinutes: 30,
                      completed: true
                    }
                  ]
                },
                {
                  id: `${goal.id}-task-3`,
                  name: `Practice and Delivery`,
                  scheduledDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
                  completed: true,
                  subtasks: [
                    {
                      id: `${goal.id}-task-3-subtask-1`,
                      name: 'Practice speech timing',
                      type: 'Practice',
                      estimatedTimeMinutes: 45,
                      completed: true
                    },
                    {
                      id: `${goal.id}-task-3-subtask-2`,
                      name: 'Record and review',
                      type: 'Review',
                      estimatedTimeMinutes: 30,
                      completed: true
                    },
                    {
                      id: `${goal.id}-task-3-subtask-3`,
                      name: 'Final rehearsal',
                      type: 'Practice',
                      estimatedTimeMinutes: 60,
                      completed: true
                    }
                  ]
                }
              ];
            } else {
              // Default task set for other goals
              placeholderTasks = [
                {
                  id: `${goal.id}-task-1`,
                  name: `Initial Research`,
                  scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                  completed: true,
                  subtasks: [
                    {
                      id: `${goal.id}-task-1-subtask-1`,
                      name: 'Gather background information',
                      type: 'Research',
                      estimatedTimeMinutes: 45,
                      completed: true
                    },
                    {
                      id: `${goal.id}-task-1-subtask-2`,
                      name: 'Identify key resources',
                      type: 'Research',
                      estimatedTimeMinutes: 30,
                      completed: true
                    },
                    {
                      id: `${goal.id}-task-1-subtask-3`,
                      name: 'Create action plan',
                      type: 'Planning',
                      estimatedTimeMinutes: 25,
                      completed: true
                    }
                  ]
                },
                {
                  id: `${goal.id}-task-2`,
                  name: `Main Work`,
                  scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                  completed: true,
                  subtasks: [
                    {
                      id: `${goal.id}-task-2-subtask-1`,
                      name: 'Complete primary work',
                      type: 'Work',
                      estimatedTimeMinutes: 120,
                      completed: true
                    },
                    {
                      id: `${goal.id}-task-2-subtask-2`,
                      name: 'Review progress',
                      type: 'Review',
                      estimatedTimeMinutes: 30,
                      completed: true
                    },
                    {
                      id: `${goal.id}-task-2-subtask-3`,
                      name: 'Make adjustments',
                      type: 'Revision',
                      estimatedTimeMinutes: 45,
                      completed: true
                    }
                  ]
                },
                {
                  id: `${goal.id}-task-3`,
                  name: `Completion`,
                  scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  completed: true,
                  subtasks: [
                    {
                      id: `${goal.id}-task-3-subtask-1`,
                      name: 'Final review',
                      type: 'Review',
                      estimatedTimeMinutes: 40,
                      completed: true
                    },
                    {
                      id: `${goal.id}-task-3-subtask-2`,
                      name: 'Submit or complete',
                      type: 'Submission',
                      estimatedTimeMinutes: 15,
                      completed: true
                    }
                  ]
                }
              ];
            }
            courseTasks.push(...placeholderTasks);
          }

          // Map tasks to each goal.id
          for (const goal of placeholderGoals) {
            allTasksData[goal.id] = courseTasks.filter(task => task.id.startsWith(goal.id));
          }

          // Calculate course stats based on placeholder data
          const totalGoals = placeholderGoals.length;
          const completedGoals = 0; // Will be calculated based on task completion
          const totalTasks = courseTasks.length;
          const completedTasks = 0; // Will be calculated based on subtask completion
          const progress = 0; // Will be calculated based on completion

          coursesWithGoals.push({
            id: courseData.id!,
            title: courseData.title,
            subject: courseData.subject,
            goals: placeholderGoals,
            stats: {
              totalGoals,
              completedGoals,
              totalTasks,
              completedTasks,
              progress
            }
          });
        }

        setCourses(coursesWithGoals);
        setTasksData(allTasksData);
        // Set the first course as default if no course is selected
        if (coursesWithGoals.length > 0 && !selectedCourse) {
          setSelectedCourse(coursesWithGoals[0].id);
        }
        // Calculate overall stats
        const totalGoals = coursesWithGoals.reduce((sum, course) => sum + course.stats.totalGoals, 0);
        const completedGoals = coursesWithGoals.reduce((sum, course) => sum + course.stats.completedGoals, 0);
        const totalTasks = coursesWithGoals.reduce((sum, course) => sum + course.stats.totalTasks, 0);
        const completedTasks = coursesWithGoals.reduce((sum, course) => sum + course.stats.completedTasks, 0);
        setOverallStats({
          totalGoals,
          completedGoals,
          totalTasks,
          completedTasks,
          totalSubtasks: 0,
          completedSubtasks: 0,
          averageCompletionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
          tasksOverdue: 0,
          estimatedMinutesRemaining: 0
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load study plan data');
        console.error('Error fetching courses and goals:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCoursesAndGoals();
  }, [selectedCourse]);

  // Add useEffect to load state from localStorage on mount
  useEffect(() => {
    const savedViewMode = localStorage.getItem('studyPlanViewMode') as 'courses' | 'study-plan' | null;
    const savedSelectedCourse = localStorage.getItem('studyPlanSelectedCourse');
    const savedSelectedCourseForDetail = localStorage.getItem('studyPlanSelectedCourseForDetail');
    
    if (savedViewMode) {
      setViewMode(savedViewMode);
    }
    if (savedSelectedCourse) {
      setSelectedCourse(savedSelectedCourse);
    }
    if (savedSelectedCourseForDetail) {
      setSelectedCourseForDetail(savedSelectedCourseForDetail);
    }
  }, []);

  // Add useEffect to save state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('studyPlanViewMode', viewMode);
    localStorage.setItem('studyPlanSelectedCourse', selectedCourse);
    localStorage.setItem('studyPlanSelectedCourseForDetail', selectedCourseForDetail);
  }, [viewMode, selectedCourse, selectedCourseForDetail]);

  // Loading state
  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Sidebar />
        <div className="ml-64 p-8">
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">Loading study plan...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
        <div className="ml-64 p-8">
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            <p>Error: {error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 text-sm underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const toggleCourseExpansion = (courseId: string) => {
    const newExpanded = new Set(expandedCourses);
    if (newExpanded.has(courseId)) {
      newExpanded.delete(courseId);
    } else {
      newExpanded.add(courseId);
    }
    setExpandedCourses(newExpanded);
  };

  const toggleGoalExpansion = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const toggleFeedbackGoal = (goalId: string) => {
    setExpandedFeedbackGoals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(goalId)) newSet.delete(goalId); else newSet.add(goalId);
      return newSet;
    });
  };

  const handleSubtaskToggle = (goalId: string, taskId: string, subtaskId: string) => {
    console.log('Subtask toggle clicked:', { goalId, taskId, subtaskId });
    
    setTasksData(prev => {
      const newData = { ...prev };
      const courseId = selectedCourse;
      const courseTasks = newData[courseId] || [];
      
      // Find the task
      const taskIndex = courseTasks.findIndex(task => task.id === taskId);
      
      if (taskIndex !== -1) {
        const subtaskIndex = courseTasks[taskIndex].subtasks.findIndex(subtask => subtask.id === subtaskId);
        
        if (subtaskIndex >= 0) {
          // Toggle subtask completion
          const wasCompleted = courseTasks[taskIndex].subtasks[subtaskIndex].completed;
          courseTasks[taskIndex].subtasks[subtaskIndex].completed = !wasCompleted;
          console.log('Subtask toggled from', wasCompleted, 'to', !wasCompleted);
          
          // Update task completion based on subtasks - only complete if ALL subtasks are done
          const allSubtasksCompleted = courseTasks[taskIndex].subtasks.every(subtask => subtask.completed);
          courseTasks[taskIndex].completed = allSubtasksCompleted;
          console.log('Task completion updated to:', allSubtasksCompleted);
        }
      }
      
      return newData;
    });

    // Update course and goal progress
    updateProgress();
  };

  const updateProgress = () => {
    // This would typically call an API to update progress
    // For now, we'll just recalculate locally
    console.log('Progress updated');
  };

  // Filter courses based on selection
  const filteredCourses = selectedCourse 
    ? courses.filter(course => course.id === selectedCourse)
    : [];

  // Get selected course for stats
  const selectedCourseData = selectedCourse 
    ? courses.find(course => course.id === selectedCourse)
    : null;

  // Calculate course-specific statistics
  const getCourseSpecificStats = () => {
    if (!selectedCourseData) {
      return {
        totalGoals: 0,
        completedGoals: 0,
        totalTasks: 0,
        completedTasks: 0,
        totalSubtasks: 0,
        completedSubtasks: 0,
        averageCompletionRate: 0,
        tasksOverdue: 0,
        estimatedMinutesRemaining: 0
      };
    }

    const courseGoals = selectedCourseData.goals;
    const courseTasks = tasksData[selectedCourseData.id] || [];
    
    const totalGoals = courseGoals.length;
    const completedGoals = courseGoals.filter(goal => {
      const goalTasks = tasksData[goal.id] || [];
      const allTasksCompleted = goalTasks.every(task => task.completed);
      return allTasksCompleted;
    }).length;
    
    const totalTasks = courseTasks.length;
    const completedTasks = courseTasks.filter(task => task.completed).length;
    
    const totalSubtasks = courseTasks.reduce((sum: number, task: TaskWithSubtasks) => sum + task.subtasks.length, 0);
    const completedSubtasks = courseTasks.reduce((sum: number, task: TaskWithSubtasks) => 
      sum + task.subtasks.filter(subtask => subtask.completed).length, 0
    );

    return {
      totalGoals,
      completedGoals,
      totalTasks,
      completedTasks,
      totalSubtasks,
      completedSubtasks,
      averageCompletionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      tasksOverdue: 0, // You can calculate this based on your logic
      estimatedMinutesRemaining: courseTasks.reduce((sum: number, task: TaskWithSubtasks) => 
        sum + task.subtasks.filter(subtask => !subtask.completed).reduce((taskSum: number, subtask) => 
          taskSum + subtask.estimatedTimeMinutes, 0
        ), 0
      )
    };
  };

  const courseStats = getCourseSpecificStats();

  // Feedback Modal Component
  const FeedbackModal = ({ task, goal, feedback, onClose }: { task: any, goal: any, feedback: string, onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Feedback for: {task.name}</h3>
        <p className="text-sm text-gray-600 mb-4">Goal: <span className="font-medium">{goal.title}</span></p>
        <div className="text-base text-gray-800 mb-2">
          {feedback}
        </div>
      </div>
    </div>
  );

  // Add function to generate feedback for completed subtasks
  const generateFeedbackForSubtask = (subtask: any, task: any, goal: any) => {
    const timeSpent = subtask.estimatedTimeMinutes;
    const taskName = subtask.name.toLowerCase();
    
    let feedback = "";
    
    if (timeSpent <= subtask.estimatedTimeMinutes * 0.8) {
      feedback = `Excellent work! You completed "${subtask.name}" efficiently, finishing ${Math.round((subtask.estimatedTimeMinutes - timeSpent) / subtask.estimatedTimeMinutes * 100)}% faster than estimated. Your time management skills are impressive!`;
    } else if (timeSpent <= subtask.estimatedTimeMinutes * 1.2) {
      feedback = `Great job! You completed "${subtask.name}" within the expected timeframe. Your planning was accurate and execution was smooth.`;
    } else {
      feedback = `Good effort on "${subtask.name}"! You took a bit longer than estimated, which might indicate the task was more complex than initially thought. Consider breaking down similar tasks in the future.`;
    }
    
    // Add specific feedback based on task type
    if (taskName.includes('review') || taskName.includes('read')) {
      feedback += " Reading and review tasks are foundational - you're building a strong knowledge base.";
    } else if (taskName.includes('practice') || taskName.includes('exercise')) {
      feedback += " Practice makes perfect! Regular practice sessions like this will help reinforce your learning.";
    } else if (taskName.includes('create') || taskName.includes('write')) {
      feedback += " Creative tasks like this help you synthesize information and develop deeper understanding.";
    }
    
    return feedback;
  };

  // Add function to get completed subtasks with feedback
  const getCompletedSubtasksWithFeedback = () => {
    const completedSubtasks: Array<{
      subtask: any;
      task: any;
      goal: any;
      feedback: string;
    }> = [];
    
    courses.forEach(course => {
      course.goals.forEach(goal => {
        const goalTasks = tasksData[goal.id] || [];
        goalTasks.forEach(task => {
          task.subtasks.forEach(subtask => {
            if (subtask.completed) {
              completedSubtasks.push({
                subtask,
                task,
                goal,
                feedback: generateFeedbackForSubtask(subtask, task, goal)
              });
            }
          });
        });
      });
    });
    
    return completedSubtasks;
  };

  // Add function to generate feedback for completed tasks
  const generateFeedbackForTask = (task: any, goal: any) => {
    const completedSubtasks = task.subtasks.filter((subtask: any) => subtask.completed).length;
    const totalSubtasks = task.subtasks.length;
    const completionRate = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
    const taskName = task.name.toLowerCase();
    
    let feedback = "";
    
    if (completionRate === 100) {
      feedback = `Excellent work! You completed all subtasks in "${task.name}". Your systematic approach to breaking down complex tasks is impressive!`;
    } else if (completionRate >= 75) {
      feedback = `Great progress on "${task.name}"! You've completed ${completedSubtasks} out of ${totalSubtasks} subtasks. You're very close to finishing this task.`;
    } else if (completionRate >= 50) {
      feedback = `Good progress on "${task.name}"! You've completed ${completedSubtasks} out of ${totalSubtasks} subtasks. Keep up the momentum to finish strong.`;
    } else {
      feedback = `You've started "${task.name}" with ${completedSubtasks} out of ${totalSubtasks} subtasks completed. Consider breaking down the remaining work into smaller, manageable chunks.`;
    }
    
    // Add specific feedback based on task type
    if (taskName.includes('review') || taskName.includes('read')) {
      feedback += " Reading and review tasks build strong foundations - you're developing good study habits.";
    } else if (taskName.includes('practice') || taskName.includes('exercise')) {
      feedback += " Practice tasks reinforce learning - consistent practice will help you master the material.";
    } else if (taskName.includes('create') || taskName.includes('write')) {
      feedback += " Creative tasks help synthesize information - you're developing deeper understanding through application.";
    }
    
    return feedback;
  };

  // Add function to get completed tasks with feedback
  const getCompletedTasksWithFeedback = () => {
    const completedTasks: Array<{
      task: any;
      goal: any;
      feedback: string;
      completedSubtasks: number;
      totalSubtasks: number;
    }> = [];
    
    courses.forEach(course => {
      course.goals.forEach(goal => {
        const goalTasks = tasksData[goal.id] || [];
        goalTasks.forEach(task => {
          const completedSubtasks = task.subtasks.filter((subtask: any) => subtask.completed).length;
          const totalSubtasks = task.subtasks.length;
          
          // Only include tasks that have at least one completed subtask
          if (completedSubtasks > 0) {
            completedTasks.push({
              task,
              goal,
              feedback: generateFeedbackForTask(task, goal),
              completedSubtasks,
              totalSubtasks
            });
          }
        });
      });
    });
    
    return completedTasks;
  };

  return (
    <PomodoroProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          {/* Page Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-4xl font-bold text-gray-900">Study Plan</h1>
                {viewMode === 'study-plan' && (
                  <button
                    onClick={() => {
                      setViewMode('courses');
                      setSelectedCourseForDetail('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    ← Back
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-row gap-8">
            {/* Main Content */}
            <div className="flex-1 p-6">
              {viewMode === 'courses' ? (
                // Course Cards View
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {courses.map((course) => (
                      <div
                        key={course.id}
                        className="border border-gray-200 rounded-lg hover:border-indigo-500 hover:-translate-y-1 transition-all duration-200 hover:shadow-md overflow-hidden flex flex-col min-h-[320px] bg-white cursor-pointer"
                        onClick={() => {
                          setSelectedCourse(course.id);
                          setSelectedCourseForDetail(course.id);
                          setViewMode('study-plan');
                        }}
                      >
                        {/* Course Banner */}
                        <div className="w-full h-40 bg-gradient-to-r from-blue-500 to-purple-600 relative overflow-hidden">
                          <img
                            src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=200&fit=crop"
                            alt={`${course.title} banner`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        </div>

                        {/* Course Content */}
                        <div className="p-6 flex flex-col h-full">
                          {/* Course Header */}
                          <div className="flex items-center mb-4">
                            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-4 text-xl">
                              📚
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-800 text-xl">{course.title}</h3>
                              <div className="text-base text-gray-600">
                                {course.subject}
                              </div>
                            </div>
                          </div>

                          {/* Goals */}
                          <div className="mb-4">
                            <h4 className="text-base font-medium text-gray-700 mb-3">Goals</h4>
                            <div className="space-y-3">
                              {course.goals.slice(0, 3).map((goal, index) => (
                                <div key={goal.id} className="flex items-center justify-between">
                                  <span className="text-sm text-gray-600 truncate flex-1">{goal.title}</span>
                                  <span className="text-sm text-gray-500 ml-2">
                                    {Math.round(goal.progress)}%
                                  </span>
                                </div>
                              ))}
                              {course.goals.length > 3 && (
                                <div className="text-sm text-gray-500">
                                  +{course.goals.length - 3} more goals
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCourse(course.id);
                              setSelectedCourseForDetail(course.id);
                              setViewMode('study-plan');
                            }}
                            className="px-4 py-2 bg-indigo-500 text-white text-sm rounded-md hover:bg-indigo-600 transition-colors w-full"
                          >
                            View Study Plan
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Detailed Study Plan View
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">Course Progress</h2>
                  {courses.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📚</div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Enrolled Courses</h3>
                      <p className="text-gray-600 mb-6">You need to enroll in courses to see your study plan.</p>
                      <a 
                        href="/courses/discover" 
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Discover Courses
                      </a>
                    </div>
                  ) : !selectedCourse ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📚</div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Course</h3>
                      <p className="text-gray-600">Please select a course from the dropdown above to view its study plan.</p>
                    </div>
                  ) : filteredCourses.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🔍</div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Course Not Found</h3>
                      <p className="text-gray-600">The selected course could not be found.</p>
                    </div>
                  ) : (
                    filteredCourses.map(course => (
                    <div key={course.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      {/* Course Header */}
                      <div
                        className={
                          course.title === 'Calculus 101'
                            ? 'p-4 bg-gray-50' // No cursor-pointer or hover for Calculus 101
                            : 'p-4 cursor-pointer hover:bg-gray-50 transition-colors'
                        }
                        onClick={
                          course.title === 'Calculus 101'
                            ? undefined
                            : () => toggleCourseExpansion(course.id)
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {course.title === 'Calculus 101' ? null : (
                              expandedCourses.has(course.id) ? (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-gray-500" />
                              )
                            )}
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{course.title}</h3>
                              <p className="text-sm text-gray-600">{course.subject}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Course Content (Collapsible) */}
                      {(course.title === 'Calculus 101' || expandedCourses.has(course.id)) && (
                        <div className="border-t border-gray-200 p-4">
                          <div className="space-y-6">
                            {course.goals.map(goal => {
                              const goalTasks = tasksData[goal.id] || [];
                              const completedTasks = goalTasks.filter(task => {
                                // Task is complete only if all its subtasks are complete
                                return task.subtasks.length > 0 && task.subtasks.every(subtask => subtask.completed);
                              }).length;
                              const totalTasks = goalTasks.length;
                              const goalProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                              const completedSubtasks = goalTasks.reduce((sum, task) => 
                                sum + task.subtasks.filter(subtask => subtask.completed).length, 0
                              );
                              const totalSubtasks = goalTasks.reduce((sum, task) => 
                                sum + task.subtasks.length, 0
                              );

                              return (
                                <div key={goal.id} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                  {/* Goal Header */}
                                  <div 
                                    className="p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => toggleGoalExpansion(goal.id)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        {expandedGoals.has(goal.id) ? (
                                          <ChevronDown className="w-4 h-4 text-gray-500" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4 text-gray-500" />
                                        )}
                                        <div>
                                          <h4 className="font-medium text-gray-900 text-base">{goal.title}</h4>
                                          <div className="flex items-center space-x-3 text-xs text-gray-600 mt-1">
                                            <span className="flex items-center">
                                              <Calendar className="w-3 h-3 mr-1" />
                                              Due: {new Date(goal.targetDate).toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center">
                                              <Clock className="w-3 h-3 mr-1" />
                                              {goal.workMinutesPerDay} min/day
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="flex items-center space-x-2">
                                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                            <div 
                                              className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
                                              style={{ width: `${goalProgress}%` }}
                                            ></div>
                                          </div>
                                          <span className="text-xs font-medium text-gray-900">{goalProgress.toFixed(1)}%</span>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-1">
                                          {completedSubtasks}/{totalSubtasks} subtasks
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Goal Content (Collapsible) */}
                                  {expandedGoals.has(goal.id) && (
                                    <div className="border-t border-gray-200 p-3 bg-white">
                                      <div className="space-y-2">
                                        <h5 className="font-medium text-gray-800 text-sm">Tasks:</h5>
                                        {goalTasks.map(task => {
                                          const completedSubtaskCount = task.subtasks.filter(subtask => subtask.completed).length;
                                          const taskProgress = task.subtasks.length > 0 ? (completedSubtaskCount / task.subtasks.length) * 100 : 0;
                                          // Task is complete only if all subtasks are complete
                                          const isTaskComplete = task.subtasks.length > 0 && completedSubtaskCount === task.subtasks.length;

                                          return (
                                            <div key={task.id} className="bg-gray-50 rounded-md border border-gray-200">
                                              {/* Task Header */}
                                              <div 
                                                className="p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                                                onClick={() => toggleTaskExpansion(task.id)}
                                              >
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center space-x-3">
                                                    {expandedTasks.has(task.id) ? (
                                                      <ChevronDown className="w-4 h-4 text-gray-500" />
                                                    ) : (
                                                      <ChevronRight className="w-4 h-4 text-gray-500" />
                                                    )}
                                                    <div className="flex items-center space-x-2">
                                                      {isTaskComplete ? (
                                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                                      ) : (
                                                        <Circle className="w-4 h-4 text-gray-400" />
                                                      )}
                                                      <span className={`text-sm font-medium ${isTaskComplete ? 'text-gray-900' : 'text-gray-600'}`}>
                                                        {task.name}
                                                      </span>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center space-x-3">
                                                    <div className="flex items-center space-x-2">
                                                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                                        <div 
                                                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                                          style={{ width: `${taskProgress}%` }}
                                                        ></div>
                                                      </div>
                                                      <span className="text-xs text-gray-500">{taskProgress.toFixed(0)}%</span>
                                                    </div>
                                                    <span className="text-xs text-gray-500">
                                                      {new Date(task.scheduledDate).toLocaleDateString()}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                              
                                              {/* Subtasks (Collapsible) */}
                                              {expandedTasks.has(task.id) && (
                                                <div className="border-t border-gray-100 p-3 bg-white">
                                                  <div className="space-y-2">
                                                    {task.subtasks.map(subtask => (
                                                      <div key={subtask.id} className="flex items-center space-x-3">
                                                        <button
                                                          onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleSubtaskToggle(goal.id, task.id, subtask.id);
                                                          }}
                                                          className="flex items-center justify-center w-4 h-4 hover:bg-gray-200 rounded transition-colors cursor-pointer"
                                                        >
                                                          {subtask.completed ? (
                                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                                          ) : (
                                                            <Circle className="w-4 h-4 text-gray-400" />
                                                          )}
                                                        </button>
                                                        <span
                                                          className={`text-sm underline cursor-pointer ${subtask.completed ? 'text-gray-900 line-through' : 'text-blue-600 hover:text-blue-800'}`}
                                                          onClick={() => setPomodoroModal({ subtask, task, goal })}
                                                        >
                                                          {subtask.name}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                          ({subtask.estimatedTimeMinutes} min)
                                                        </span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}

                {/* Feedback Section - Moved from sidebar to main content */}
                <div className="mt-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Feedback
                  </h2>
                  <div className="bg-white rounded-lg p-6 border border-gray-200">
                    {(() => {
                      const completedTasks = getCompletedTasksWithFeedback();

                      if (completedTasks.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600">Complete some tasks to see feedback</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {completedTasks.map((item, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                              <div 
                                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
                                onClick={() => toggleFeedbackGoal(item.goal.id)}
                              >
                                <div className="flex items-center space-x-3">
                                  {expandedFeedbackGoals.has(item.goal.id) ? (
                                    <ChevronDown className="w-5 h-5 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="w-5 h-5 text-gray-500" />
                                  )}
                                  <span className="text-base font-medium text-gray-900">{item.task.name}</span>
                                </div>
                                <span className="text-sm text-gray-500">{item.completedSubtasks}/{item.totalSubtasks} subtasks</span>
                              </div>
                              
                              {expandedFeedbackGoals.has(item.goal.id) && (
                                <div className="border-t border-gray-200 p-4 bg-gray-50">
                                  <div className="space-y-3">
                                    <div className="text-sm">
                                      <button
                                        onClick={() => setFeedbackModal({ task: item.task, goal: item.goal, feedback: item.feedback })}
                                        className="text-blue-600 hover:text-blue-800 underline text-left w-full text-base"
                                      >
                                        View detailed feedback
                                      </button>
                                      <p className="text-xs text-gray-500 mt-1">
                                        Goal: {item.goal.title}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                </div>
              )}
            </div>

            {/* Right Sidebar: Only show statistics when in study-plan view */}
            {viewMode === 'study-plan' && (
              <aside className="w-full max-w-xs flex flex-col gap-8 p-6">
                {/* Statistics Section */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Overall Statistics
                  </h2>
                  <div className="grid grid-cols-1 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center">
                        <Target className="w-8 h-8 text-blue-600 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600">Goals</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {courseStats.completedGoals}/{courseStats.totalGoals}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center">
                        <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600">Tasks</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {courseStats.completedTasks}/{courseStats.totalTasks}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center">
                        <Clock className="w-8 h-8 text-orange-600 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600">Avg Time per Task</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {courseStats.totalTasks > 0 ? Math.round(courseStats.estimatedMinutesRemaining / courseStats.totalTasks) : 0} min
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pomodoro Timer Section - Hide when modal is open */}
                {!pomodoroModal && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <Clock className="w-5 h-5 mr-2" />
                      Pomodoro Timer
                    </h2>
                    <div className="bg-white rounded-lg p-8 border border-gray-200">
                      <PomodoroTimer large />
                    </div>
                  </div>
                )}
              </aside>
            )}
          </div>
        </div>
      </div>
      {feedbackModal && (
        <FeedbackModal
          task={feedbackModal.task}
          goal={feedbackModal.goal}
          feedback={feedbackModal.feedback}
          onClose={() => setFeedbackModal(null)}
        />
      )}
      {pomodoroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-8 relative flex flex-col items-center">
            <button onClick={() => setPomodoroModal(null)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
              <X className="w-7 h-7" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pomodoro for: <span className="text-blue-600">{pomodoroModal.subtask.name}</span></h2>
            <p className="text-gray-600 mb-4">Task: <span className="font-medium">{pomodoroModal.task.name}</span></p>
            <p className="text-gray-600 mb-6">Goal: <span className="font-medium">{pomodoroModal.goal.title}</span></p>
            <PomodoroTimer large />
          </div>
        </div>
      )}
    </PomodoroProvider>
  );
} 