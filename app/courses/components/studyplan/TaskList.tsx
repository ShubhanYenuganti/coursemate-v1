"use client";
import React, { useState, useEffect } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { Task } from './types';
import TaskCard from './TaskCard';

interface TaskListProps {
  goalId: string;
}

const TaskList: React.FC<TaskListProps> = ({ goalId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call to fetch tasks for this goal
    const fetchTasks = async () => {
      setIsLoading(true);
      // Mock data - replace with actual API call
      const mockTasks: Task[] = [
        {
          id: 't1',
          goalId: '1',
          name: 'Review Chapter 1-3',
          scheduledDate: '2024-11-25',
          completed: true,
          order: 1,
          createdAt: '2024-11-01',
          updatedAt: '2024-11-01'
        },
        {
          id: 't2',
          goalId: '1',
          name: 'Practice Problem Set A',
          scheduledDate: '2024-11-26',
          completed: false,
          order: 2,
          createdAt: '2024-11-01',
          updatedAt: '2024-11-01'
        },
        {
          id: 't3',
          goalId: '1',
          name: 'Create Study Notes',
          scheduledDate: '2024-11-27',
          completed: false,
          order: 3,
          createdAt: '2024-11-01',
          updatedAt: '2024-11-01'
        }
      ];
      
      setTimeout(() => {
        const goalTasks = mockTasks.filter(task => task.goalId === goalId);
        setTasks(goalTasks.sort((a, b) => a.order - b.order));
        setIsLoading(false);
      }, 300);
    };

    fetchTasks();
  }, [goalId]);

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(prev => prev.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600">Loading tasks...</span>
      </div>
    );
  }

  const completedTasks = tasks.filter(task => task.completed);
  const incompleteTasks = tasks.filter(task => !task.completed);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-gray-800 flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          <span>Tasks ({tasks.length})</span>
        </h4>
        <button className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors">
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      {tasks.length > 0 ? (
        <div className="space-y-3">
          {incompleteTasks.map(task => (
            <TaskCard key={task.id} task={task} onUpdate={handleTaskUpdate} />
          ))}
          
          {completedTasks.length > 0 && (
            <>
              <div className="border-t border-gray-100 pt-3 mt-6">
                <h5 className="text-sm font-medium text-gray-600 mb-3">
                  Completed Tasks ({completedTasks.length})
                </h5>
              </div>
              {completedTasks.map(task => (
                <TaskCard key={task.id} task={task} onUpdate={handleTaskUpdate} />
              ))}
            </>
          )}
        </div>
      ) : (
        <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h5 className="text-sm font-medium text-gray-800 mb-1">No tasks yet</h5>
          <p className="text-sm text-gray-600 mb-4">Add tasks to break down this goal</p>
          <button className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
            <Plus className="w-4 h-4" />
            <span>Add First Task</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default TaskList; 