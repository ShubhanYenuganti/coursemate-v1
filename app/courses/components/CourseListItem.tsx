import React from 'react';
import { 
  Star, 
  StarOff, 
  Clock, 
  Play, 
  Edit 
} from 'lucide-react';
import { Course } from './CourseCard';

interface CourseListItemProps {
  course: Course;
  onTogglePin: (courseId: number) => void;
}

const CourseListItem: React.FC<CourseListItemProps> = ({ course, onTogglePin }) => {
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
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-all duration-200 ${course.isPinned ? 'ring-1 ring-blue-200' : ''} group`}>
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 relative">
          <IconComponent className="w-7 h-7 text-white opacity-80" />
          {course.isPinned && (
            <Star className="w-3 h-3 text-yellow-500 fill-current absolute -top-1 -right-1" />
          )}
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
          
          <div className="flex gap-3">
            <button className="bg-blue-600 text-white py-2 px-3 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1">
              <Play className="w-4 h-4" />
              Enter
            </button>
            <button className="bg-gray-100 text-gray-700 py-2 px-3 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-1">
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
          
          <button 
            onClick={() => onTogglePin(course.id)}
            className="p-2 text-gray-400 hover:text-yellow-500 transition-colors"
          >
            {course.isPinned ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseListItem; 