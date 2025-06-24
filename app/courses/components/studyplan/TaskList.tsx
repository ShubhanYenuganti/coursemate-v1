"use client";
import React from 'react';
import { getTasksWithProgress } from './mockData';
import { TaskWithProgress } from './types';
import TaskCard from './TaskCard';

interface TaskListProps {
  goalId: string;
  onTaskUpdated?: (task: TaskWithProgress) => void;
}

const TaskList: React.FC<TaskListProps> = ({ goalId, onTaskUpdated }) => {
  const tasks = getTasksWithProgress(goalId);

  if (tasks.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No tasks created yet for this goal.</p>
        <p className="text-sm mt-1">Tasks will be generated when you create the goal.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-3">
      {tasks.map(task => (
        <TaskCard 
          key={task.id} 
          task={task} 
          onTaskUpdated={onTaskUpdated}
        />
      ))}
    </div>
  );
};

export default TaskList; 