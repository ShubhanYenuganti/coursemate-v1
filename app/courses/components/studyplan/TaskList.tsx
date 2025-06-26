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
      const response = await fetch(`/api/goals/${goalId}/tasks`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data = await response.json();
      
      // Process and group by task_id
      const taskMap = new Map();
      
      // First pass: create task objects
      data.forEach((item: any) => {
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
          type: item.subtask_type,
          estimatedTimeMinutes: 15, // Default value
          completed: item.subtask_completed,
          createdAt: item.created_at,
          updatedAt: item.updated_at
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
      
      setTasks(Array.from(taskMap.values()));
    } catch (error) {
      console.error('Error fetching tasks:', error);
      // Fallback to mock data if API fails
      const mockTasks = getTasksWithProgress(goalId);
      setTasks(mockTasks);
      toast.error('Failed to load tasks. Using sample data instead.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (goalId) {
      fetchTasks();
    }
  }, [goalId]);

  const handleTaskDeleted = async (taskId: string) => {
    try {
      const response = await fetch(`/api/goals/${goalId}/tasks/${taskId}`, {
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
          onTaskDeleted={handleTaskDeleted}
        />
      ))}
    </div>
  );
};

export default TaskList; 