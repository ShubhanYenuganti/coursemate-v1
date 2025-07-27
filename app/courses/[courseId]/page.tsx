"use client";
import React, { useState, useEffect, use } from "react";
import CourseDetailHeader from "../components/CourseDetailHeader";
import CourseDetailTabs from "../components/CourseDetailTabs";
import { Course } from "../components/CourseCard";
import { courseService, CourseData } from "../../../lib/api/courseService";
import { Code, Beaker, Calculator, Globe, Palette, Music } from 'lucide-react';
import PinnedResources from "../components/PinnedResources";
import ShareInviteFeature from "../components/ShareInviteFeature";
import MaterialsManagerCourse from "../components/ai-chat/MaterialsManagerCourse";
import RecommendedResources from "../components/RecommendedResources";
import NewAIChatInterface from "../components/ai-chat/NewAIChatInterface";
import { StudyPlanTab } from "../components/studyplan";
import EnrolledUsersList from '../components/EnrolledUsersList';
import LeaveCourseButton from '../components/LeaveCourseButton';
import CommunityTab from '../components/community/CommunityTab';

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

const mapCourse = (data: CourseData): Course => {
  const comboId = data.combo_id || (data.id && data.user_id ? `${data.id}-${data.user_id}` : '');
  return {
    id: 0, // not used here
    dbId: data.id!,
    comboId,
    title: data.title,
    subject: data.subject,
    semester: data.semester,
    dailyProgress: data.daily_progress ?? 0,
    lastAccessed: data.last_accessed ?? new Date().toISOString().split('T')[0],
    badge: data.badge ?? 'Creator',
    isPinned: data.is_pinned ?? false,
    isArchived: data.is_archived ?? false,
    description: data.description,
    icon: getSubjectIcon(data.subject),
    tags: data.tags,
    course_image: data.course_image
  };
};

interface Props {
  params: Promise<{ courseId: string }>;
}

const CourseDetailPage: React.FC<Props> = ({ params }) => {
  // Use localStorage to persist the last opened tab
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lastCourseTab') || 'overview';
    }
    return 'overview';
  });
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right'>('right');

  // Save tab to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastCourseTab', activeTab);
    }
  }, [activeTab]);

  // Tab order for animation direction
  const tabOrder = ['overview', 'materials', 'ai', 'study', 'community', 'progress'];

  // Handle animated tab switching
  const handleTabChange = (newTab: string) => {
    if (newTab === activeTab || isAnimating) return;
    
    const currentIndex = tabOrder.indexOf(activeTab);
    const newIndex = tabOrder.indexOf(newTab);
    const direction = newIndex > currentIndex ? 'left' : 'right';
    
    // Immediately update the tab (load new content)
    setActiveTab(newTab);
    setAnimationDirection(direction);
    setIsAnimating(true);
    
    // End animation after slide-in completes
    setTimeout(() => {
      setIsAnimating(false);
    }, 500);
  };

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

  const handleCourseUpdate = (updatedCourseData: CourseData) => {
    const updatedCourse = mapCourse(updatedCourseData);
    setCourse(updatedCourse);
  };

  const tabContentMap: Record<string, React.ReactNode> = {
    overview: (
      <div>
        <CourseDetailHeader
          course={course}
          onCourseUpdate={handleCourseUpdate}
        />
        <PinnedResources course={course} />
        <div className="mt-8" />
        {course.badge === 'Creator' && (() => { console.log('ShareInviteFeature comboId:', course.comboId); return <ShareInviteFeature course={course} /> })()}
        {course.badge === 'Creator' && <EnrolledUsersList courseId={course.dbId} isCreator />}
        {course.badge === 'Enrolled' && <LeaveCourseButton courseId={course.dbId} />}
      </div>
    ),
    materials: (
      <div className="h-full">
        <MaterialsManagerCourse courseId={course.dbId} />
      </div>
    ),
    ai: <NewAIChatInterface courseId={course.comboId} materialsDbId={course.dbId} />,
    study: <StudyPlanTab courseId={course.dbId} />,
    community: <CommunityTab courseId={course.dbId} />,
    progress: <div className="text-center text-gray-400">[Progress tab coming soon]</div>,
  };
  const tabContent = tabContentMap[activeTab];

  const tabLabel = {
    overview: 'Overview',
    materials: 'Materials',
    ai: 'AI Chat',
    study: 'Study Plan',
    community: 'Community',
    progress: 'Progress',
  }[activeTab] || '';

  return (
    <div className={`${activeTab === 'ai' ? 'h-full flex flex-col' : 'h-full overflow-y-auto'} bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative`}>
      {/* Banner Header as horizontal bar extending sidebar's top border */}
      <div className="bg-white border-b border-gray-200 flex items-center px-8 py-4 sticky top-0 z-10 flex-shrink-0">
        <h2 className="text-3xl font-bold text-gray-800 truncate mr-4">{course.title}</h2>
        {tabLabel !== 'Study Plan' && (
        <span className="text-xl text-gray-500 font-medium">- {tabLabel}</span>
        )}
      </div>
      <div className={`${activeTab === 'ai' ? 'flex-1 flex flex-col min-h-0' : 'mx-auto p-8 pb-24'} ${activeTab === 'ai' ? 'max-w-7xl mx-auto' : 'max-w-5xl'}`}>
        <div className={activeTab === 'ai' ? 'p-8 pb-4 flex-shrink-0' : ''}>
          <CourseDetailTabs activeTab={activeTab} setActiveTab={handleTabChange} />
        </div>
        <div className={`relative ${activeTab === 'ai' ? 'flex-1 px-8 pb-8 min-h-0' : 'overflow-hidden min-h-[400px]'}`}>
          <div 
            className={`transition-all duration-500 ease-out ${activeTab === 'ai' ? 'h-full' : ''}`}
            style={{
              transform: isAnimating 
                ? animationDirection === 'left' 
                  ? 'translateX(-20px)' 
                  : 'translateX(20px)'
                : 'translateX(0)',
              opacity: isAnimating ? 0.3 : 1
            }}
            id={`tab-panel-${activeTab}`} 
            role="tabpanel"
          >
            {tabContent}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailPage; 