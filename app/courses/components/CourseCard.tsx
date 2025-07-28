import React, { useState } from 'react';
import { 
  Star, 
  StarOff, 
  Clock, 
  Play, 
  Edit, 
  CheckCircle2, 
  Archive,
  BookOpen,
  Target,
  Users,
  MoreVertical,
  Trash2
} from 'lucide-react';
import Link from "next/link";

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
  onTogglePin: (courseId: number) => void;
  onToggleArchive: (courseId: number) => void;
  onDeleteCourse?: (courseId: number) => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, onTogglePin, onToggleArchive, onDeleteCourse }) => {
  const IconComponent = course.icon;
  const [showMenu, setShowMenu] = useState(false);
  
  const isActiveToday = (lastAccessed: string) => {
    const today = new Date().toISOString().split('T')[0];
    return lastAccessed === today;
  };

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleArchive(course.id);
    setShowMenu(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDeleteCourse) {
      onDeleteCourse(course.id);
    }
    setShowMenu(false);
  };

  return (
    <div className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 ${course.isPinned ? 'ring-2 ring-blue-200' : ''} group relative overflow-hidden`}>
      {course.isPinned && (
        <div className="absolute top-2 left-2 z-10">
          <Star className="w-4 h-4 text-yellow-500 fill-current" />
        </div>
      )}
      
      {/* Three dots menu button */}
      <div className="absolute top-2 right-2 z-10">
        <button 
          onClick={handleMenuToggle}
          className="p-1 text-white hover:text-gray-200 transition-colors"
        >
          <MoreVertical className="w-6 h-6" />
        </button>
        
        {/* Dropdown menu */}
        {showMenu && (
          <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px] z-20">
            <button 
              onClick={handleArchiveClick}
              className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
            >
              <Archive className="w-3 h-3" />
              {course.isArchived ? 'Unarchive' : 'Archive'}
            </button>
            <Link href={`/courses/${course.dbId}/edit`} legacyBehavior>
              <a className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2">
                <Edit className="w-3 h-3" />
                Edit Course
              </a>
            </Link>
            <button 
              onClick={handleDeleteClick}
              className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 text-red-600 flex items-center gap-2"
            >
              <Trash2 className="w-3 h-3" />
              Delete Course
            </button>
          </div>
        )}
      </div>
      
      <div className="aspect-[16/9] bg-gradient-to-br from-blue-500 to-purple-600 relative flex items-center justify-center">
        <IconComponent className="w-10 h-10 text-white opacity-80" />
        {isActiveToday(course.lastAccessed) && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
            Active Today
          </div>
        )}
        <div className={`absolute bottom-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${
          course.badge === 'Creator' ? 'bg-purple-500 text-white' : 'bg-blue-500 text-white'
        }`}>
          {course.badge}
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1">
            <Link href={`/courses/${course.dbId}?tab=overview`} legacyBehavior>
              <a className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-blue-600 transition-colors cursor-pointer" title={course.title}>
                {course.title}
              </a>
            </Link>
            <span className={`px-2 py-1 rounded-full text-xs ${
              course.semester === 'Fall 2024' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {course.semester}
            </span>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => onTogglePin(course.id)}
              className="p-1 text-gray-400 hover:text-yellow-500"
            >
              {course.isPinned ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        <p className="text-xs text-gray-600 mb-4 line-clamp-2">{course.description}</p>
        
        <div className="flex gap-2">
          <Link href={`/courses/${course.dbId}?tab=materials`} legacyBehavior>
            <a className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-md text-xs font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1">
              <BookOpen className="w-3 h-3" />
              Materials
            </a>
          </Link>
          <Link href={`/courses/${course.dbId}?tab=study`} legacyBehavior>
            <a className="flex-1 bg-green-600 text-white py-2 px-3 rounded-md text-xs font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-1">
              <Target className="w-3 h-3" />
              Study Plan
            </a>
          </Link>
          <Link href={`/courses/${course.dbId}?tab=community`} legacyBehavior>
            <a className="flex-1 bg-purple-600 text-white py-2 px-3 rounded-md text-xs font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-1">
              <Users className="w-3 h-3" />
              Community
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CourseCard; 