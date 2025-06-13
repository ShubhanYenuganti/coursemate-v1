import React, { useState } from 'react';

export interface Task {
  id: number;
  title: string;
  course: string;
  time: string;
  completed: boolean;
}

interface TodaysChecklistProps {
  tasks?: Task[];
  onTaskToggle?: (taskId: number, checked: boolean) => void;
  onAddTask?: () => void;
}

const defaultTasks: Task[] = [
  {
    id: 1,
    title: 'Physics Quiz - Chapter 4',
    course: 'Physics Fundamentals',
    time: 'Today',
    completed: true,
  },
  {
    id: 2,
    title: 'Calculus Assignment',
    course: 'Due End of day',
    time: 'Tomorrow',
    completed: false,
  },
  {
    id: 3,
    title: 'Work on Project Proposal',
    course: 'Intro to Programming',
    time: 'Oct 28',
    completed: false,
  },
];

const TodaysChecklist: React.FC<TodaysChecklistProps> = ({
  tasks = [],
  onTaskToggle,
  onAddTask,
}) => {
  const [checkedTasks, setCheckedTasks] = useState<Record<number, boolean>>({});

  const tasksToDisplay = tasks.length > 0 ? tasks : defaultTasks;

  const handleTaskToggle = (taskId: number) => {
    const newCheckedState = !checkedTasks[taskId];
    setCheckedTasks((prev) => ({
      ...prev,
      [taskId]: newCheckedState,
    }));
    onTaskToggle && onTaskToggle(taskId, newCheckedState);
  };

  const isTaskCompleted = (task: Task) => {
    return checkedTasks[task.id] !== undefined ? checkedTasks[task.id] : task.completed;
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-semibold text-gray-800">Today's Checklist</h2>
        <button
          onClick={onAddTask}
          className="text-emerald-500 font-medium cursor-pointer hover:text-emerald-600 transition-colors"
        >
          ➕
        </button>
      </div>
      {/* Task List */}
      {tasksToDisplay.map((task) => (
        <div key={task.id} className="flex items-center py-3 border-b border-gray-100 last:border-b-0">
          <div
            onClick={() => handleTaskToggle(task.id)}
            className={`w-4.5 h-4.5 border-2 border-gray-300 rounded cursor-pointer flex items-center justify-center mr-3 transition-all ${
              isTaskCompleted(task) ? 'bg-emerald-500 border-emerald-500 text-white' : 'hover:border-emerald-400'
            }`}
          >
            {isTaskCompleted(task) && '✓'}
          </div>
          <div className="flex-1">
            <div className={`font-medium ${isTaskCompleted(task) ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
              {task.title}
            </div>
            <div className="text-xs text-gray-600">{task.course}</div>
          </div>
          <div className="text-xs text-gray-600 ml-auto">{task.time}</div>
        </div>
      ))}
      {/* Empty State / Motivational Message */}
      <div className="text-center mt-5 text-gray-400">
        <div className="mb-3">📋</div>
        <div className="mb-1">Nothing scheduled for today.</div>
        <div className="mb-3">Time to relax or plan ahead!</div>
        <button
          onClick={onAddTask}
          className="px-3 py-1.5 bg-indigo-500 text-white text-xs rounded-md hover:bg-indigo-600 transition-colors"
        >
          📝 Add a task
        </button>
      </div>
    </div>
  );
};

export default TodaysChecklist; 