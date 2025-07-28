import React, { useState, useEffect } from 'react';
import { format, isToday, isBefore, isAfter, parseISO } from 'date-fns';
import { courseService, CourseData } from '../../../lib/api/courseService';
import { Clock } from 'lucide-react';

export interface Subtask {
  id: string;
  title: string;
  course: string;
  time: string;
  completed: boolean;
  dueDate: string;
  color?: string;
  courseId?: string;
  goalId?: string;
  start_time?: string;
  end_time?: string;
}

const FILTERS = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: "Today's" },
  { key: 'upcoming', label: 'Upcoming' },
] as const;
type FilterType = typeof FILTERS[number]['key'];

const TodaysChecklist: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('today');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userCourses, setUserCourses] = useState<CourseData[]>([]);

  // Fetch user courses on component mount
  useEffect(() => {
    const fetchUserCourses = async () => {
      try {
        const courses = await courseService.getCourses();
        setUserCourses(courses);
      } catch (error) {
        console.error('Failed to fetch user courses:', error);
      }
    };
    fetchUserCourses();
  }, []);

  // Fetch subtasks from the checklist endpoint
  useEffect(() => {
    const fetchChecklistSubtasks = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/goals/checklist?type=${selectedFilter}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const subtasksData = await response.json();
          
          // Map subtasks to the Subtask interface format
          const mappedSubtasks: Subtask[] = subtasksData.map((subtask: any, index: number) => {
            let courseTitle = subtask.course_id || '';
            
            // Find course title from userCourses
            if (subtask.course_id && userCourses.length > 0) {
              const found = userCourses.find(c => c.id === subtask.course_id || c.combo_id === subtask.course_id);
              if (found && found.title) {
                courseTitle = found.title;
              }
            }

            // Use start_time for scheduled subtasks, fallback to task_due_date
            const dueDate = subtask.start_time || subtask.task_due_date || subtask.due_date || '';
            return {
              id: subtask.subtask_id || subtask.id || `subtask-${index}`,
              title: subtask.subtask_descr || subtask.subtask_title || 'Untitled Subtask',
              course: courseTitle,
              dueDate: dueDate,
              completed: subtask.subtask_completed || false,
              color: subtask.color || '#10B981',
              time: dueDate ? format(parseISO(dueDate), 'MMM d') : '',
              courseId: subtask.course_id,
              goalId: subtask.goal_id,
              start_time: subtask.start_time,
              end_time: subtask.end_time,
            };
          });
          
          setSubtasks(mappedSubtasks);
        } else {
          console.error('Failed to fetch checklist subtasks:', response.statusText);
          setSubtasks([]);
        }
      } catch (error) {
        console.error('❌ Failed to fetch checklist subtasks:', error);
        setSubtasks([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (userCourses.length > 0) {
      fetchChecklistSubtasks();
    }
  }, [selectedFilter, userCourses]);

  // Date helpers
  const todayDate = new Date();
  const filterSubtasks = (subtasks: Subtask[]) => {
    return subtasks.filter(subtask => {
      const due = parseISO(subtask.dueDate);
      if (selectedFilter === 'today') {
        return isToday(due);
      } else if (selectedFilter === 'overdue') {
        return isBefore(due, todayDate) && !isToday(due);
      } else if (selectedFilter === 'upcoming') {
        return isAfter(due, todayDate);
      }
      return false;
    });
  };
  const filteredSubtasks = filterSubtasks(subtasks);

  const handleSubtaskToggle = async (subtaskId: string, checked: boolean) => {
    try {
      console.log('🔄 Toggling subtask:', subtaskId, 'to:', checked);
      const token = localStorage.getItem('token');
      
      // Call the subtask toggle endpoint
      const response = await fetch(`/api/goals/tasks/subtasks/${subtaskId}/toggle`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Optimistically update the local state
        setSubtasks(prev => prev.map(subtask => 
          subtask.id === subtaskId ? { ...subtask, completed: checked } : subtask
        ));
        console.log('✅ Subtask toggled successfully');
      } else {
        console.error('❌ Failed to toggle subtask:', response.statusText);
      }
    } catch (error) {
      console.error('❌ Failed to toggle subtask:', error);
    }
  };

  // Limit the number of subtasks shown
  const MAX_SUBTASKS = 5;
  const visibleSubtasks = filteredSubtasks.slice(0, MAX_SUBTASKS);
  const hasMoreSubtasks = filteredSubtasks.length > MAX_SUBTASKS;

  // Helper for due date formatting
  const getDueDateLabel = (dueDate: string) => {
    if (!dueDate) return '';
    const due = parseISO(dueDate);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    if (isToday(due)) return 'Today';
    if (due.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return format(due, 'MMM d');
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-md border border-gray-100 h-full flex flex-col justify-start">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3 sm:gap-0">
        <h2 className="text-lg font-bold text-gray-800 tracking-tight">Checklist</h2>
        <div className="flex gap-1 sm:gap-2 overflow-x-auto">
          <button
            className={`px-2 sm:px-3 py-1 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap ${selectedFilter === 'overdue' ? 'bg-gray-200 text-gray-800' : 'bg-white text-gray-500 border border-gray-200'}`}
            onClick={() => setSelectedFilter('overdue')}
          >
            Overdue
          </button>
          <button
            className={`px-2 sm:px-3 py-1 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap ${selectedFilter === 'today' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
            onClick={() => setSelectedFilter('today')}
          >
            Today's
          </button>
          <button
            className={`px-2 sm:px-3 py-1 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap ${selectedFilter === 'upcoming' ? 'bg-gray-200 text-gray-800' : 'bg-white text-gray-500 border border-gray-200'}`}
            onClick={() => setSelectedFilter('upcoming')}
          >
            Upcoming
          </button>
        </div>
      </div>
      {/* Checklist Content */}
      <div className="flex-1 flex flex-col justify-start items-stretch overflow-y-auto min-h-[200px] sm:min-h-[220px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-6 sm:py-8">
            <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 text-sm sm:text-base">Loading subtasks...</p>
          </div>
        ) : visibleSubtasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 sm:py-8">
            <span className="text-2xl sm:text-3xl mb-2">📅</span>
            <p className="text-gray-500 text-center text-sm sm:text-base">
              No {selectedFilter === 'today' ? "today's" : selectedFilter} subtasks.<br />
              Time to relax or plan ahead!
            </p>
          </div>
        ) : (
          <ul className="w-full space-y-2">
            {visibleSubtasks.map(subtask => (
              <li
                key={subtask.id}
                className="flex items-center bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 px-2 sm:px-3 py-2 gap-2 group hover:shadow-md transition-all relative"
              >
                {/* Play button links to studyplan tab and goal */}
                <a
                  href={`/courses/${subtask.courseId}/goals/${subtask.goalId}`}
                  className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white mr-2 sm:mr-3 shadow flex-shrink-0"
                  title="Go to Study Plan"
                >
                  <svg width="12" height="12" className="sm:w-[14px] sm:h-[14px]" fill="currentColor" viewBox="0 0 20 20">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                </a>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className={`font-bold text-gray-800 text-xs sm:text-sm truncate ${subtask.completed ? 'line-through' : ''}`}>
                    {subtask.title}
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 text-xs text-gray-500 mt-1 flex-wrap">
                    <span className="truncate max-w-[80px] sm:max-w-[120px]">{subtask.course}</span>
                    {/* Scheduled Time Display */}
                    {subtask.start_time && subtask.end_time && (
                      <span className="flex items-center gap-1 text-blue-600 whitespace-nowrap">
                        <Clock size={8} className="sm:w-[10px] sm:h-[10px]" />
                        {(() => {
                          try {
                            const startDate = new Date(subtask.start_time);
                            const endDate = new Date(subtask.end_time);
                            const startTime = startDate.toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            });
                            const endTime = endDate.toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            });
                            return `${startTime}-${endTime}`;
                          } catch (e) {
                            return 'Scheduled';
                          }
                        })()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end justify-center min-w-[40px] sm:min-w-[48px] flex-shrink-0">
                  <span className="text-xs text-gray-400 font-medium">{getDueDateLabel(subtask.dueDate)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Divider */}
      <div className="my-3 sm:my-4 border-t border-gray-200"></div>
      
      {/* Bottom area: more subtasks indicator and Go to Calendar button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between w-full gap-2 sm:gap-0 pt-0 pb-2 sm:pb-3 min-h-[40px]">
        <div className="flex-1 order-2 sm:order-1">
          {hasMoreSubtasks && (
            <div className="text-xs text-gray-400">
              +{filteredSubtasks.length - MAX_SUBTASKS} more subtasks in calendar
            </div>
          )}
        </div>
        <a
          href="/calendar"
          className="inline-block px-3 sm:px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg shadow transition-colors text-xs sm:text-sm order-1 sm:order-2 w-full sm:w-auto text-center min-w-[100px] sm:min-w-[130px]"
        >
          Go to Calendar
        </a>
      </div>
    </div>
  );
};

export default TodaysChecklist; 