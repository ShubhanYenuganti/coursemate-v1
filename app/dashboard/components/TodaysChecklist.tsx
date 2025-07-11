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

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-semibold text-gray-800">Checklist</h2>
      </div>
      
      {/* Filter Button Group */}
      <div className="flex gap-2 mb-4">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors focus:outline-none ${selectedFilter === f.key ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
            onClick={() => setSelectedFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>
      
      {/* Task List */}
      {filteredTasks.length > 0 ? (
        filteredTasks.map((task) => {
          const overdue = isTaskOverdue(task);
          const subtasks = getSubtasksForTask(task.id);
          return (
            <div key={task.id} className={`mb-2 rounded-lg border ${overdue ? 'bg-red-50 border-red-200' : 'border-gray-100'} transition-all`}>
              <div className="flex items-center py-4 px-3 cursor-pointer" onClick={() => toggleTaskExpand(task.id)}>
                <span className="mr-2">
                  {expandedTasks[task.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </span>
                <div className="flex-1">
                  <div className={`font-medium ${overdue ? 'text-red-700' : 'text-gray-800'}`}>{task.title}</div>
                  {/* Progress Bar for Subtasks */}
                  {subtasks.length > 0 && (
                    <div className="w-full h-2 bg-gray-200 rounded-full my-2">
                      <div
                        className="h-2 bg-green-500 rounded-full transition-all"
                        style={{ width: `${(subtasks.filter(st => subtaskState[st.id] || st.completed).length / subtasks.length) * 100}%` }}
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: task.color || '#6b7280' }} />
                    <span className={`text-xs ${overdue ? 'text-red-600' : 'text-gray-600'}`}>{task.course}</span>
                    {overdue && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">OVERDUE</span>
                    )}
                  </div>
                </div>
                <div className={`text-xs ml-auto ${overdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>{task.time}</div>
              </div>
              {/* Subtasks Dropdown */}
              {expandedTasks[task.id] && subtasks.length > 0 && (
                <div className="pl-10 pr-4 pb-4">
                  <div className="space-y-2">
                    {subtasks.map(subtask => (
                      <div key={subtask.id} className="flex items-center gap-2">
                        <button
                          onClick={() => handleSubtaskToggle(subtask.id)}
                          className="flex-shrink-0 mt-0.5"
                        >
                          {subtaskState[subtask.id] || subtask.completed ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-300" />
                          )}
                        </button>
                        <span className={`text-sm ${subtaskState[subtask.id] || subtask.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{subtask.name}</span>
                        <span className="text-xs text-gray-400">({subtask.estimatedTimeMinutes} min)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })
      ) : (
        /* Empty State / Motivational Message */
        <div className="text-center mt-5 text-gray-400">
          <div className="mb-3">📋</div>
          <div className="mb-1">No {FILTERS.find(f => f.key === selectedFilter)?.label.toLowerCase()} tasks.</div>
          <div className="mb-3">Time to relax or plan ahead!</div>
        </div>
      )}
      
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={handleCloseModal}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4">{isEditMode ? 'Edit Task' : 'Add Task'}</h2>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Course</label>
                <div className="relative">
                  <input
                    type="text"
                    name="course"
                    value={form.course}
                    onChange={handleFormChange}
                    onFocus={() => setShowCourseDropdown(form.course.length > 0)}
                    onBlur={() => setTimeout(() => setShowCourseDropdown(false), 200)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    placeholder="Start typing to search your courses..."
                    required
                  />
                  {showCourseDropdown && filteredCourses.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredCourses.map((course) => (
                        <button
                          key={course.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                          onClick={() => handleCourseSelect(course.title)}
                        >
                          <div className="font-medium">{course.title}</div>
                          <div className="text-xs text-gray-500">{course.subject}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <input
                  type="date"
                  name="dueDate"
                  value={form.dueDate}
                  onChange={handleFormChange}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Color</label>
                <select
                  name="color"
                  value={form.color}
                  onChange={handleFormChange}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  {DEFAULT_COLORS.map((c) => (
                    <option key={c} value={c} style={{ color: c }}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                {isEditMode && (
                  <button
                    type="button"
                    onClick={() => {
                      if (editTaskId !== null) {
                        handleDeleteTask(editTaskId);
                        handleCloseModal();
                      }
                    }}
                    className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    Delete Task
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-indigo-500 text-white hover:bg-indigo-600"
                >
                  {isEditMode ? 'Update Task' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodaysChecklist; 