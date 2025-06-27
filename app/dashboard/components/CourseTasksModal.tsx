import React, { useState, useEffect } from 'react';
import { format, parseISO, isToday, isBefore, isAfter } from 'date-fns';
import { taskService, Task as TaskType } from '../../../lib/api/taskService';
import { X, Calendar, CheckCircle, Circle, Clock } from 'lucide-react';

export interface Task {
  id: string;
  title: string;
  course: string;
  time: string;
  completed: boolean;
  dueDate: string;
  color?: string;
}

interface CourseTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: {
    id: number;
    name: string;
    professor: string;
    schedule: string;
    progress: number;
    icon: string;
    iconBg: string;
    iconColor: string;
    progressColor: string;
    dbId?: string;
  };
}

const CourseTasksModal: React.FC<CourseTasksModalProps> = ({ isOpen, onClose, course }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'overdue' | 'upcoming'>('all');

  useEffect(() => {
    if (isOpen && course.name) {
      fetchCourseTasks();
    }
  }, [isOpen, course.name]);

  const fetchCourseTasks = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Fetching tasks for course:', course.name);
      // Fetch all tasks and filter by course name
      const allTasks = await taskService.getTasks('all');
      
      // Filter tasks for this specific course
      const courseTasks = allTasks.filter(task => 
        task.course.toLowerCase() === course.name.toLowerCase()
      );
      
      console.log('📋 Course tasks found:', courseTasks);
      
      // Transform to component format
      const transformedTasks: Task[] = courseTasks.map(task => ({
        id: task.id,
        title: task.title,
        course: task.course,
        dueDate: task.due_date,
        completed: task.completed,
        color: task.color,
        time: format(parseISO(task.due_date), 'MMM d'),
      }));

      setTasks(transformedTasks);
    } catch (error) {
      console.error('❌ Failed to fetch course tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskToggle = async (taskId: string, checked: boolean) => {
    try {
      console.log('🔄 Toggling task:', taskId, 'to:', checked);
      await taskService.toggleTask(taskId);
      await fetchCourseTasks(); // Refresh tasks
      console.log('✅ Task toggled successfully');
    } catch (error) {
      console.error('❌ Failed to toggle task:', error);
    }
  };

  const filterTasks = (tasks: Task[]) => {
    const today = new Date();
    
    return tasks.filter(task => {
      const due = parseISO(task.dueDate);
      
      switch (filter) {
        case 'today':
          return isToday(due);
        case 'overdue':
          return isBefore(due, today) && !isToday(due);
        case 'upcoming':
          return isAfter(due, today);
        default:
          return true;
      }
    });
  };

  const isTaskOverdue = (task: Task) => {
    const due = parseISO(task.dueDate);
    return isBefore(due, new Date()) && !isToday(due);
  };

  const getTaskStats = () => {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const today = tasks.filter(task => isToday(parseISO(task.dueDate))).length;
    const overdue = tasks.filter(task => isTaskOverdue(task)).length;
    
    return { total, completed, today, overdue };
  };

  const stats = getTaskStats();
  const filteredTasks = filterTasks(tasks);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${course.iconBg} ${course.iconColor} rounded-lg flex items-center justify-center`}>
              {course.icon}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{course.name}</h2>
              <p className="text-sm text-gray-600">{course.professor} • {course.schedule}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Stats */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
              <div className="text-xs text-gray-600">Total Tasks</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-xs text-gray-600">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.today}</div>
              <div className="text-xs text-gray-600">Today</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <div className="text-xs text-gray-600">Overdue</div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All', count: stats.total },
              { key: 'today', label: "Today's", count: stats.today },
              { key: 'overdue', label: 'Overdue', count: stats.overdue },
              { key: 'upcoming', label: 'Upcoming', count: stats.total - stats.today - stats.overdue }
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors focus:outline-none ${
                  filter === key 
                    ? 'bg-indigo-500 text-white border-indigo-500' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        </div>

        {/* Tasks List */}
        <div className="p-6 overflow-y-auto max-h-96">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : filteredTasks.length > 0 ? (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const overdue = isTaskOverdue(task);
                return (
                  <div
                    key={task.id}
                    className={`flex items-center p-4 border rounded-lg ${
                      overdue ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <button
                      onClick={() => handleTaskToggle(task.id, !task.completed)}
                      className="mr-3 text-gray-400 hover:text-indigo-500 transition-colors"
                    >
                      {task.completed ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    
                    <div className="flex-1">
                      <div className={`font-medium ${
                        task.completed ? 'text-gray-500 line-through' : overdue ? 'text-red-700' : 'text-gray-800'
                      }`}>
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: task.color || '#6b7280' }}
                        />
                        <span className={`text-xs ${overdue ? 'text-red-600' : 'text-gray-600'}`}>
                          {task.course}
                        </span>
                        {overdue && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                            OVERDUE
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {task.time}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-lg font-medium mb-1">No tasks found</p>
              <p className="text-sm">
                {filter === 'all' 
                  ? `No tasks have been created for ${course.name} yet.`
                  : `No ${filter} tasks for ${course.name}.`
                }
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} shown
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseTasksModal; 