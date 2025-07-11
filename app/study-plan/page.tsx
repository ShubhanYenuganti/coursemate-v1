"use client"

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
  const loading = useAuthRedirect()

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <h1 className="text-3xl font-bold mb-4">Study Plan</h1>
        <p className="text-gray-600">This is the Study Plan page. More features coming soon!</p>
      </div>
    </div>
  );
} 