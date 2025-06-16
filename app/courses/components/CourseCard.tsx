import React from 'react';
import { 
  Star, 
  StarOff, 
  Clock, 
  Play, 
  Edit, 
  CheckCircle2, 
  Archive 
} from 'lucide-react';
import Link from "next/link";

export interface Course {
  id: number;
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
}

interface CourseCardProps {
  course: Course;
  onTogglePin: (courseId: number) => void;
  onToggleArchive: (courseId: number) => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, onTogglePin, onToggleArchive }) => {
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

  return (
    <div className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 ${course.isPinned ? 'ring-2 ring-blue-200' : ''} group relative overflow-hidden`}>
      {course.isPinned && (
        <div className="absolute top-2 left-2 z-10">
          <Star className="w-4 h-4 text-yellow-500 fill-current" />
        </div>
      )}
      
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
          <h3 className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-blue-600 transition-colors" title={course.title}>
            {course.title}
          </h3>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => onTogglePin(course.id)}
              className="p-1 text-gray-400 hover:text-yellow-500"
            >
              {course.isPinned ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{course.description}</p>
        
        <div className="space-y-2">
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
        
        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
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
        
        <div className="flex gap-2 mt-4">
          <Link href={`/courses/${course.id}`} legacyBehavior>
            <a className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-md text-xs font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1">
              <Play className="w-3 h-3" />
              Enter Course
            </a>
          </Link>
          <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-md text-xs font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1">
            <Edit className="w-3 h-3" />
            Edit Course
          </button>
        </div>
        
        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 py-1">
            <button className="w-full px-3 py-1 text-xs text-left hover:bg-gray-50 flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3" />
              Mark Complete
            </button>
            <button 
              onClick={() => onToggleArchive(course.id)}
              className="w-full px-3 py-1 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
            >
              <Archive className="w-3 h-3" />
              {course.isArchived ? 'Unarchive' : 'Archive'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCard; 