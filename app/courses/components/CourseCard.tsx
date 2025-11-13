import React, { useState } from 'react';
import { 
  Clock,
  Edit
} from 'lucide-react';
import {
  useRouter
} from 'next/navigation';

export interface Course {
  id: number;          // numeric id only for UI component keys
  dbId: string;        // real UUID from database
  comboId: string; // unique combo_id from backend
  title: string;
  subject: string;
  semester: string;
  dailyProgress: number;
  lastAccessed: string;
  badge: string;
  isPinned: boolean;
  isArchived: boolean;
  description: string;
  icon: React.ComponentType<any>;
  tags?: string[];
  course_image?: string | null;
  visibility?: 'Private' | 'Friends Only' | 'Public' | 'Only Me';
}

interface CourseCardProps {
  course: Course;
  onEditCourse?: (course: Course) => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, onEditCourse }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedTitle, setEditedTitle] = useState(course.title);
  const [editedDescription, setEditedDescription] = useState(course.description);
  const [editedSubject, setEditedSubject] = useState(course.subject);
  const [editedSemester, setEditedSemester] = useState(course.semester);
  const [isSaving, setIsSaving] = useState(false);

  const router = useRouter();

  const IconComponent = course.icon;
  
  const getProgressColor = (dailyProgress: number) => {
    if (dailyProgress === 100) return 'bg-green-500';
    if (dailyProgress >= 80) return 'bg-green-400';
    if (dailyProgress >= 50) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  const isActiveToday = (lastAccessed: string) => {
    const today = new Date().toISOString().split('T')[0];
    return lastAccessed === today;
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEditModal(true);
  };

  return (
    <>
      <div className="relative group" style={{ minWidth: 220, maxWidth: 320 }}>
        {/* Edit Button - Positioned absolutely outside the main button */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <button 
            onClick={handleEditClick}
            className="bg-white rounded-full shadow p-2 hover:bg-blue-50 border border-gray-200 flex items-center justify-center"
            title="Edit course"
            aria-label="Edit course"
          >
            <Edit className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      
      <button 
        className={`bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 relative overflow-hidden flex flex-col cursor-pointer text-left w-full`}
        onClick={() => router.push(`/courses/${course.dbId}`)}
        aria-label={`Open ${course.title} course`}
      >
        
        <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          {course.course_image ? (
            <img src={course.course_image} alt={course.title} className="object-cover w-full h-full" style={{ aspectRatio: '4/3' }} />
          ) : (
            <IconComponent className="w-10 h-10 text-white opacity-80" />
          )}
          
          {/* Active Today Badge - Top Left */}
          {isActiveToday(course.lastAccessed) && (
            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
              Active Today
            </div>
          )}
          
          {/* Badge - Bottom Left */}
          <div className={`absolute bottom-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${
            course.badge === 'Creator' ? 'bg-purple-500 text-white' : 'bg-blue-500 text-white'
          }`}>
            {course.badge}
          </div>
        </div>
      
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 text-base leading-tight group-hover:text-blue-600 transition-colors mb-1" title={course.title}>
            {course.title}
          </h3>
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">{course.description}</p>
        </div>
        
        <div>
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Progress</span>
              <span className="font-medium">{course.dailyProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(course.dailyProgress)}`}
                style={{ width: `${course.dailyProgress}%` }}
                title={`Daily: ${course.dailyProgress}%`}
              ></div>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{new Date(course.lastAccessed).toLocaleDateString()}</span>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs ${
              course.semester === 'Fall 2024' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {course.semester}
            </span>
          </div>
        </div>
      </div>
    </button>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowEditModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Edit Course</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Title
                </label>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Semester
                  </label>
                  <input
                    type="text"
                    value={editedSemester}
                    onChange={(e) => setEditedSemester(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={async () => {
                    setIsSaving(true);
                    try {
                      const { courseService } = await import('../../../lib/api/courseService');
                      await courseService.updateCourse(course.dbId, {
                        title: editedTitle,
                        description: editedDescription,
                        subject: editedSubject,
                        semester: editedSemester,
                      });
                      
                      // Update local state immediately
                      if (onEditCourse) {
                        // Get the icon based on subject
                        const mod = await import('lucide-react');
                        const iconMap: { [key: string]: any } = {
                          'Programming': mod.Code,
                          'Computer Science': mod.Code,
                          'Science': mod.Beaker,
                          'Biology': mod.Beaker,
                          'Mathematics': mod.Calculator,
                          'History': mod.Globe,
                          'Art': mod.Palette,
                          'Music': mod.Music,
                        };
                        const newIcon = iconMap[editedSubject] || mod.Code;
                        
                        onEditCourse({
                          ...course,
                          title: editedTitle,
                          description: editedDescription,
                          subject: editedSubject,
                          semester: editedSemester,
                          icon: newIcon,
                        });
                      }
                      
                      setShowEditModal(false);
                    } catch (error) {
                      console.error('Failed to update course:', error);
                      alert('Failed to update course. Please try again.');
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  disabled={isSaving}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setEditedTitle(course.title);
                    setEditedDescription(course.description);
                    setEditedSubject(course.subject);
                    setEditedSemester(course.semester);
                    setShowEditModal(false);
                  }}
                  disabled={isSaving}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CourseCard; 