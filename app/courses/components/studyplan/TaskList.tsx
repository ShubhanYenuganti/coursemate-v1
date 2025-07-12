"use client";
import React, { useState, useEffect } from 'react';
import { getTasksWithProgress } from './mockData';
import { TaskWithProgress } from './types';
import TaskCard from './TaskCard';
import { toast } from 'react-hot-toast';

interface TaskListProps {
  goalId: string;
  onTaskUpdated?: (task: TaskWithProgress) => void;
}

const TaskList: React.FC<TaskListProps> = ({ goalId, onTaskUpdated }) => {
  const [tasks, setTasks] = useState<TaskWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      console.log(`Fetching tasks for goal: ${goalId}`);
      
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        throw new Error('Authentication token missing');
      }
      
      const response = await fetch(`${api}/api/goals/${goalId}/tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log(`API response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error response: ${errorText}`);
        throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Tasks data received:', data);
      
      if (!Array.isArray(data) || data.length === 0) {
        console.log('No tasks found or empty array returned');
        // Use mock data if the API returns an empty array
        const mockTasks = getTasksWithProgress(goalId);
        setTasks(mockTasks);
        return;
      }
      
      // Process and group by task_id
      const taskMap = new Map();
      
      // First pass: create task objects
      data.forEach((item: any) => {
        // Filter out placeholder tasks
        if (item.task_id === 'placeholder') {
          return;
        }
        
        if (!taskMap.has(item.task_id)) {
          taskMap.set(item.task_id, {
            id: item.task_id,
            goalId: goalId,
            name: item.task_title,
            scheduledDate: item.due_date || new Date().toISOString(),
            completed: item.task_completed,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            subtasks: [],
            totalSubtasks: 0,
            completedSubtasks: 0,
            progress: 0
          });
        }
        
        // Add subtask to the task
        const task = taskMap.get(item.task_id);
        task.subtasks.push({
          id: item.subtask_id,
          taskId: item.task_id,
          name: item.subtask_descr,
          type: item.subtask_type || 'other',
          estimatedTimeMinutes: 15, // Default value
          completed: item.subtask_completed,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          task_due_date: item.task_due_date,
          subtask_order: item.subtask_order
        });
      });
      
      // Second pass: calculate progress for each task
      taskMap.forEach(task => {
        task.totalSubtasks = task.subtasks.length;
        task.completedSubtasks = task.subtasks.filter((s: any) => s.completed).length;
        task.progress = task.totalSubtasks > 0 
          ? Math.round((task.completedSubtasks / task.totalSubtasks) * 100) 
          : 0;
      });
      
      const tasksArray = Array.from(taskMap.values());
      console.log('Processed tasks:', tasksArray);
      setTasks(tasksArray);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      // Fallback to mock data if API fails
      console.log('Falling back to mock data');
      const mockTasks = getTasksWithProgress(goalId);
      setTasks(mockTasks);
      toast.error('Failed to load tasks. Using sample data instead.', {
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (goalId) {
      fetchTasks();
    }
  }, [goalId]);

  const saveNewTask = async (newTask: TaskWithProgress) => {
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        throw new Error('Authentication token missing');
      }
      
      // Use the new create-empty-task endpoint
      const response = await fetch(`${api}/api/goals/${goalId}/create-empty-task`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to create new task');
      }
      
      // Refresh tasks after adding a new one
      fetchTasks();
      toast.success('New task added successfully');
      
      // If there's a parent component callback, call it
      if (onTaskUpdated) {
        onTaskUpdated(newTask);
      }
    } catch (error) {
      console.error('Error creating new task:', error);
      toast.error('Failed to add new task. Please try again.');
    }
  };

  const handleTaskDeleted = async (taskId: string) => {
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/goals/${goalId}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      // Remove the task from the local state
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      toast.success('Task deleted successfully');

      // If there's a parent component callback, call it
      if (onTaskUpdated) {
        // Create a dummy updated task to trigger the parent update
        const dummyTask: TaskWithProgress = {
          id: 'deleted',
          goalId: goalId,
          name: 'deleted',
          description: "",
          scheduledDate: new Date().toISOString(),
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          subtasks: [],
          totalSubtasks: 0,
          completedSubtasks: 0,
          progress: 0
        };
        onTaskUpdated(dummyTask);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task. Please try again.');
      
      // Refresh the task list to ensure UI is in sync with server
      fetchTasks();
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Loading tasks...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 mb-4">No tasks created yet for this goal.</p>
        <button 
          onClick={() => {
            // Create a new empty task
            const newTask: TaskWithProgress = {
              id: `new-${Date.now()}`,
              goalId: goalId,
              name: "New Task",
              description: "",
              scheduledDate: new Date().toISOString(),
              completed: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              subtasks: [],
              totalSubtasks: 0,
              completedSubtasks: 0,
              progress: 0
            };
            
            // Save the new task to the server
            saveNewTask(newTask);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Add Task
        </button>
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
          onTaskDeleted={handleTaskDeleted}
        />
      ))}
    </div>
  );
};

export default TaskList; 