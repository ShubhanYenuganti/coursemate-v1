"use client";
import React, { useState } from "react";
import CourseDetailHeader from "../components/CourseDetailHeader";
import CourseDetailTabs from "../components/CourseDetailTabs";
import { Course } from "../components/CourseCard";
import { Code, Beaker, Calculator, Globe, Palette, Music } from 'lucide-react';
import { use } from 'react';

// Sample course data (same as in page.tsx)
const courses: Course[] = [
  {
    id: 1,
    title: "Advanced React Development",
    subject: "Programming",
    semester: "Fall 2024",
    dailyProgress: 80,
    lastAccessed: "2024-06-13",
    badge: "Creator",
    isPinned: true,
    isArchived: false,
    description: "Deep dive into React hooks, context, and performance optimization",
    icon: Code
  },
  {
    id: 2,
    title: "Organic Chemistry Fundamentals",
    subject: "Science",
    semester: "Fall 2024", 
    dailyProgress: 60,
    lastAccessed: "2024-06-12",
    badge: "Enrolled",
    isPinned: false,
    isArchived: false,
    description: "Introduction to organic molecular structures and reactions",
    icon: Beaker
  },
  {
    id: 3,
    title: "Calculus III - Multivariable",
    subject: "Mathematics",
    semester: "Spring 2024",
    dailyProgress: 100,
    lastAccessed: "2024-05-15",
    badge: "Enrolled",
    isPinned: false,
    isArchived: false,
    description: "Vector calculus, partial derivatives, and multiple integrals",
    icon: Calculator
  },
  {
    id: 4,
    title: "World History: Ancient Civilizations",
    subject: "History",
    semester: "Fall 2023",
    dailyProgress: 0,
    lastAccessed: "2024-01-20",
    badge: "Creator",
    isPinned: false,
    isArchived: true,
    description: "Comprehensive study of ancient civilizations and their impact",
    icon: Globe
  },
  {
    id: 5,
    title: "Digital Art and Design",
    subject: "Art",
    semester: "Fall 2024",
    dailyProgress: 90,
    lastAccessed: "2024-06-13",
    badge: "Enrolled",
    isPinned: true,
    isArchived: false,
    description: "Modern digital art techniques and design principles",
    icon: Palette
  },
  {
    id: 6,
    title: "Music Theory Basics",
    subject: "Music",
    semester: "Summer 2024",
    dailyProgress: 40,
    lastAccessed: "2024-06-10",
    badge: "Enrolled",
    isPinned: false,
    isArchived: false,
    description: "Fundamentals of music theory, scales, and harmony",
    icon: Music
  }
];

const TAB_COMPONENTS = (course: Course): Record<string, React.ReactNode> => ({
  overview: <div><CourseDetailHeader course={course} /><div className="text-center text-gray-400">[More overview content coming soon]</div></div>,
  materials: <div className="text-center text-gray-400">[Materials tab coming soon]</div>,
  ai: <div className="text-center text-gray-400">[AI Chat tab coming soon]</div>,
  study: <div className="text-center text-gray-400">[Study Plan tab coming soon]</div>,
  community: <div className="text-center text-gray-400">[Community tab coming soon]</div>,
  progress: <div className="text-center text-gray-400">[Progress tab coming soon]</div>,
});

const CourseDetailPage = ({ params }: { params: Promise<{ courseId: string }> }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const { courseId } = use(params);
  const course = courses.find(c => c.id === Number(courseId));
  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center text-2xl text-gray-400">
        Course not found
      </div>
    );
  }
  const tabContent = TAB_COMPONENTS(course)[activeTab];
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8 relative">
      <div className="max-w-5xl mx-auto">
        <CourseDetailTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        <div id={`tab-panel-${activeTab}`} role="tabpanel">
          {tabContent}
        </div>
      </div>
    </div>
  );
};

export default CourseDetailPage; 