import React, { useState, useEffect } from 'react';
import { format, isToday, isBefore, isAfter, parseISO } from 'date-fns';
import { courseService, CourseData } from '../../../lib/api/courseService';
import { taskService, Task as TaskType } from '../../../lib/api/taskService';

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
  const [tasks, setTasks] = useState<any[]>([]);
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
    const fetchChecklistTasks = async () => {
      setIsLoading(true);
      try {
        const api = process.env.BACKEND_URL || "http://localhost:5173";
        const token = localStorage.getItem('token');
        // Fetch all courses for the user
        const coursesResponse = await fetch(`${api}/api/courses`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const coursesData = await coursesResponse.json();
        const allGoals: any[] = [];
        // For each course, fetch its goals
        for (const course of coursesData) {
          const goalsResponse = await fetch(`${api}/api/courses/${course.id}/goals`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!goalsResponse.ok) continue;
          const goals = await goalsResponse.json();
          allGoals.push(...goals.map((g: any) => ({ ...g, course })));
        }
        // For each goal, fetch its tasks
        const allTasks: any[] = [];
        for (const goal of allGoals) {
          const tasksResponse = await fetch(`${api}/api/goals/${goal.goal_id}/tasks`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!tasksResponse.ok) continue;
          const tasksData = await tasksResponse.json();
          // Group by task_id and flatten
          const taskMap = new Map();
          tasksData.forEach((row: any) => {
            if (!taskMap.has(row.task_id)) {
              taskMap.set(row.task_id, {
                id: row.task_id,
                title: row.task_title,
                course: goal.course?.title || '',
                dueDate: row.due_date,
                completed: row.task_completed,
                color: '#0ea5e9', // default color
                time: row.due_date ? format(parseISO(row.due_date), 'MMM d') : '',
              });
            }
          });
          allTasks.push(...Array.from(taskMap.values()));
        }
        setTasks(allTasks);
      } catch (error) {
        console.error('Failed to fetch checklist tasks from study plan:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChecklistTasks();
  }, []);

  // Filter courses based on search term
  const filteredCourses = userCourses.filter(course =>
    course.title.toLowerCase().includes(courseSearchTerm.toLowerCase()) ||
    course.subject.toLowerCase().includes(courseSearchTerm.toLowerCase())
  );

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

  // Date helpers
  const todayDate = new Date();

  const filterTasks = (tasks: any[]) => {
    return tasks.filter(task => {
      if (!task.dueDate) return false;
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

  // Helper function to check if a task is overdue
  const isTaskOverdue = (task: any) => {
    if (!task.dueDate) return false;
    const due = parseISO(task.dueDate);
    return isBefore(due, todayDate) && !isToday(due);
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

  const handleEditClick = (task: any) => {
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
      const transformedTasks: any[] = apiTasks.map(task => ({
        id: task.id,
        title: task.title,
        course: task.course,
        dueDate: task.due_date,
        completed: task.completed,
        color: task.color,
        time: task.due_date ? format(parseISO(task.due_date), 'MMM d') : '',
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
          return (
            <div key={task.id} className={`flex items-center py-3 border-b border-gray-100 last:border-b-0 ${overdue ? 'bg-red-50 border-red-200' : ''}`}>
              <div
                onClick={() => handleTaskToggle(task.id, !task.completed)}
                className={`w-5 h-5 border-2 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                  task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : overdue ? 'border-red-400 hover:border-red-500' : 'hover:border-emerald-400'
                }`}
              >
                {task.completed && '✓'}
              </div>
              <div className="flex-1">
                <div className={`font-medium ${task.completed ? 'text-gray-500 line-through' : overdue ? 'text-red-700' : 'text-gray-800'}`}>
                  {task.title}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: task.color || '#6b7280' }}
                  />
                  <span className={`text-xs ${overdue ? 'text-red-600' : 'text-gray-600'}`}>{task.course}</span>
                  {overdue && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                      OVERDUE
                    </span>
                  )}
                </div>
              </div>
              <div className={`text-xs ml-auto ${overdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>{task.time}</div>
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