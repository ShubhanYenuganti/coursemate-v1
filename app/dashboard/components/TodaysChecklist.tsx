import React, { useState, useEffect } from 'react';
import { format, isToday, isBefore, isAfter, parseISO } from 'date-fns';
import { courseService, CourseData } from '../../../lib/api/courseService';
import { taskService, Task as TaskType } from '../../../lib/api/taskService';
import { getSubtasksForTask } from '../../courses/components/studyplan/mockData';
import { ChevronDown, ChevronRight, CheckCircle, Circle } from 'lucide-react';

export interface Task {
  id: string;
  title: string;
  course: string;
  time: string;
  completed: boolean;
  dueDate: string;
  color?: string;
}

const FILTERS = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: "Today's" },
  { key: 'upcoming', label: 'Upcoming' },
] as const;
type FilterType = typeof FILTERS[number]['key'];

const DEFAULT_COLORS = [
  '#0ea5e9', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
  '#10b981', // emerald
  '#6b7280', // gray
];

const TodaysChecklist: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('today');
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [userCourses, setUserCourses] = useState<CourseData[]>([]);
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [form, setForm] = useState({
    title: '',
    course: '',
    dueDate: '',
    color: DEFAULT_COLORS[0],
    time: '',
  });
  const [expandedTasks, setExpandedTasks] = useState<{ [taskId: string]: boolean }>({});

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

  // Fetch tasks based on selected filter
  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true);
      try {
        const apiTasks = await taskService.getTasks('all');
        const transformedTasks: Task[] = apiTasks.map(task => ({
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
        console.error('❌ Failed to fetch tasks:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const filteredCourses = userCourses.filter(course =>
    course.title.toLowerCase().includes(courseSearchTerm.toLowerCase()) ||
    course.subject.toLowerCase().includes(courseSearchTerm.toLowerCase())
  );

  // Date helpers
  const todayDate = new Date();
  const filterTasks = (tasks: Task[]) => {
    return tasks.filter(task => {
      const due = parseISO(task.dueDate);
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
  const filteredTasks = filterTasks(tasks);
  const isTaskOverdue = (task: Task) => {
    const due = parseISO(task.dueDate);
    return isBefore(due, todayDate) && !isToday(due);
  };

  // Toggle expand/collapse for a task
  const toggleTaskExpand = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  // Toggle subtask completion (mock, for demo)
  const [subtaskState, setSubtaskState] = useState<{ [subtaskId: string]: boolean }>({});
  const handleSubtaskToggle = (subtaskId: string) => {
    setSubtaskState(prev => ({ ...prev, [subtaskId]: !prev[subtaskId] }));
  };

  const handleTaskToggle = async (taskId: string, checked: boolean) => {
    try {
      console.log('🔄 Toggling task:', taskId, 'to:', checked);
      await taskService.toggleTask(taskId);
      await refreshTasks();
      console.log('✅ Task toggled successfully');
    } catch (error) {
      console.error('❌ Failed to toggle task:', error);
    }
  };

  const handleOpenModal = () => {
    setShowModal(true);
    setIsEditMode(false);
    setEditTaskId(null);
    setForm({ title: '', course: '', dueDate: '', color: DEFAULT_COLORS[0], time: '' });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setForm({ title: '', course: '', dueDate: '', color: DEFAULT_COLORS[0], time: '' });
    setIsEditMode(false);
    setEditTaskId(null);
    setCourseSearchTerm('');
    setShowCourseDropdown(false);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    // Handle course search
    if (name === 'course') {
      setCourseSearchTerm(value);
      setShowCourseDropdown(value.length > 0);
    }
  };

  const handleCourseSelect = (courseTitle: string) => {
    setForm({ ...form, course: courseTitle });
    setCourseSearchTerm(courseTitle);
    setShowCourseDropdown(false);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.course || !form.dueDate) return;
    
    try {
      console.log('➕ Adding/updating task:', form);
      if (isEditMode && editTaskId !== null) {
        // Update existing task
        console.log('✏️ Updating task:', editTaskId);
        await taskService.updateTask(editTaskId, {
          title: form.title,
          course: form.course,
          due_date: form.dueDate,
          color: form.color,
        });
      } else {
        // Create new task
        console.log('🆕 Creating new task');
        await taskService.createTask({
          title: form.title,
          course: form.course,
          due_date: form.dueDate,
          color: form.color,
        });
      }
      
      // Refresh all tasks
      await refreshTasks();
      
      handleCloseModal();
      setShowSuccessMessage(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccessMessage(false), 3000);
      console.log('✅ Task saved successfully');
    } catch (error) {
      console.error('❌ Failed to save task:', error);
    }
  };

  const handleEditClick = (task: Task) => {
    console.log('✏️ Edit clicked for task:', task);
    setIsEditMode(true);
    setEditTaskId(task.id);
    setForm({
      title: task.title,
      course: task.course,
      dueDate: task.dueDate,
      color: task.color || DEFAULT_COLORS[0],
      time: task.time,
    });
    setShowModal(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      console.log('🗑️ Deleting task:', taskId);
      await taskService.deleteTask(taskId);
      await refreshTasks();
      console.log('✅ Task deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete task:', error);
    }
  };

  // Function to refresh all tasks
  const refreshTasks = async () => {
    try {
      console.log('🔄 Refreshing tasks...');
      const apiTasks = await taskService.getTasks('all');
      const transformedTasks: Task[] = apiTasks.map(task => ({
        id: task.id,
        title: task.title,
        course: task.course,
        dueDate: task.due_date,
        completed: task.completed,
        color: task.color,
        time: format(parseISO(task.due_date), 'MMM d'),
      }));
      setTasks(transformedTasks);
      console.log('✅ Tasks refreshed:', transformedTasks);
    } catch (error) {
      console.error('❌ Failed to refresh tasks:', error);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100 min-h-[340px] flex flex-col justify-between" style={{height: '376px'}}>
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-bold text-gray-800 tracking-tight">Checklist</h2>
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded-lg text-sm font-medium ${selectedFilter === 'overdue' ? 'bg-gray-200 text-gray-800' : 'bg-white text-gray-500 border border-gray-200'}`}
            onClick={() => setSelectedFilter('overdue')}
          >
            Overdue
          </button>
          <button
            className={`px-3 py-1 rounded-lg text-sm font-medium ${selectedFilter === 'today' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
            onClick={() => setSelectedFilter('today')}
          >
            Today's
          </button>
          <button
            className={`px-3 py-1 rounded-lg text-sm font-medium ${selectedFilter === 'upcoming' ? 'bg-gray-200 text-gray-800' : 'bg-white text-gray-500 border border-gray-200'}`}
            onClick={() => setSelectedFilter('upcoming')}
          >
            Upcoming
          </button>
        </div>
      </div>
      {/* Checklist Content */}
      <div className="flex-1 flex flex-col justify-center items-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <span className="text-3xl mb-2">📅</span>
            <p className="text-gray-500 text-center">No {selectedFilter === 'today' ? "today's" : selectedFilter} tasks.<br />Time to relax or plan ahead!</p>
          </div>
        ) : (
          <ul className="w-full space-y-3">
            {filteredTasks.map(task => (
              <li key={task.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => handleTaskToggle(task.id, !task.completed)}
                  className="accent-indigo-500 w-5 h-5 rounded"
                />
                <div className="flex-1">
                  <div className={`font-medium text-gray-800 ${task.completed ? 'line-through' : ''}`}>{task.title}</div>
                  <div className="text-xs text-gray-500">{task.course} • {task.time}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TodaysChecklist; 