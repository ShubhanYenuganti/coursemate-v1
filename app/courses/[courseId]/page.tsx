"use client";
import React, { useState, useEffect, use } from "react";
import CourseDetailHeader from "../components/CourseDetailHeader";
import CourseDetailTabs from "../components/CourseDetailTabs";
import { Course } from "../components/CourseCard";
import { courseService, CourseData } from "../../../lib/api/courseService";
import { Code, Beaker, Calculator, Globe, Palette, Music } from 'lucide-react';

// helper to map subject to icon
const getSubjectIcon = (subject: string) => {
  const iconMap: { [key: string]: React.ComponentType<any> } = {
    'Programming': Code,
    'Computer Science': Code,
    'Science': Beaker,
    'Biology': Beaker,
    'Mathematics': Calculator,
    'History': Globe,
    'Art': Palette,
    'Music': Music,
  };
  return iconMap[subject] || Code;
};

const mapCourse = (data: CourseData): Course => ({
  id: 0, // not used here
  dbId: data.id!,
  title: data.title,
  subject: data.subject,
  semester: data.semester,
  dailyProgress: data.dailyProgress ?? 0,
  lastAccessed: data.lastAccessed ?? new Date().toISOString().split('T')[0],
  badge: data.badge ?? 'Creator',
  isPinned: data.isPinned ?? false,
  isArchived: data.isArchived ?? false,
  description: data.description,
  icon: getSubjectIcon(data.subject)
});

interface Props {
  params: Promise<{ courseId: string }>;
}

const CourseDetailPage: React.FC<Props> = ({ params }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Unwrap params Promise
  const { courseId } = use(params);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const data = await courseService.getCourse(courseId);
        setCourse(mapCourse(data));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load course');
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [courseId]);

  if (loading) {
    return (<div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>);
  }
  if (error || !course) {
    return (<div className="min-h-screen flex items-center justify-center text-2xl text-gray-400">Course not found</div>);
  }

  const tabContentMap: Record<string, React.ReactNode> = {
    overview: (
      <div>
        <CourseDetailHeader
          course={course}
          onDescriptionUpdated={(d) => setCourse({ ...course, description: d })}
        />
        <div className="text-center text-gray-400">[More overview content coming soon]</div>
      </div>
    ),
  materials: <div className="text-center text-gray-400">[Materials tab coming soon]</div>,
  ai: <div className="text-center text-gray-400">[AI Chat tab coming soon]</div>,
  study: <div className="text-center text-gray-400">[Study Plan tab coming soon]</div>,
  community: <div className="text-center text-gray-400">[Community tab coming soon]</div>,
  progress: <div className="text-center text-gray-400">[Progress tab coming soon]</div>,
  };
  const tabContent = tabContentMap[activeTab];

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