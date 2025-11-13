import React from 'react';
import { 
  Clock, 
  Edit 
} from 'lucide-react';
import { Course } from './CourseCard';
import { useRouter } from 'next/navigation';

interface CourseListItemProps {
  course: Course;
  onEditCourse?: (course: Course) => void;
}

const CourseListItem: React.FC<CourseListItemProps> = ({ course, onEditCourse }) => {
  const IconComponent = course.icon;
  const router = useRouter();
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editedTitle, setEditedTitle] = React.useState(course.title);
  const [editedDescription, setEditedDescription] = React.useState(course.description);
  const [editedSubject, setEditedSubject] = React.useState(course.subject);
  const [editedSemester, setEditedSemester] = React.useState(course.semester);
  const [isSaving, setIsSaving] = React.useState(false);
  
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

  const handleRowClick = () => {
    router.push(`/courses/${course.dbId}`);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEditModal(true);
  };

  return (
    <>
    <div 
      onClick={handleRowClick}
      onKeyDown={(e) => e.key === 'Enter' && handleRowClick()}
      role="button"
      tabIndex={0}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer group`}
    >
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 relative">
          <IconComponent className="w-7 h-7 text-white opacity-80" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-semibold text-gray-900 truncate">{course.title}</h3>
            <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              course.badge === 'Creator' ? 'bg-purple-500 text-white' : 'bg-blue-500 text-white'
            }`}>
              {course.badge}
            </div>
            {isActiveToday(course.lastAccessed) && (
              <div className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                Active Today
              </div>
            )}
          </div>
          
          <p className="text-sm text-gray-600 mb-1 line-clamp-1">{course.description}</p>
          
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{new Date(course.lastAccessed).toLocaleDateString()}</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full ${
              course.semester === 'Fall 2024' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {course.semester}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900 mb-0.5">{course.dailyProgress}%</div>
            <div className="w-36 bg-gray-200 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all duration-300 ${getProgressColor(course.dailyProgress)}`}
                style={{ width: `${course.dailyProgress}%` }}
              ></div>
            </div>
          </div>
          
          <button 
            onClick={handleEditClick}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit className="w-5 h-5" />
          </button>
        </div>
      </div>
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

export default CourseListItem; 