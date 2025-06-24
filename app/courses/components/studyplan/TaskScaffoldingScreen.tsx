"use client";
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock, Save, Plus, Trash2 } from 'lucide-react';
import { Goal, Task, Subtask } from './types';

interface TaskScaffoldingScreenProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  onSave: (goal: Goal, tasks: Task[], subtasks: Subtask[]) => void;
}

interface TaskTemplate {
  id: string;
  name: string;
  scheduledDate: string;
  subtasks: {
    name: string;
    type: Subtask['type'];
    estimatedTimeMinutes: number;
  }[];
}

const TaskScaffoldingScreen: React.FC<TaskScaffoldingScreenProps> = ({ 
  isOpen, 
  onClose, 
  goal, 
  onSave 
}) => {
  const [tasks, setTasks] = useState<TaskTemplate[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (goal && isOpen) {
      generateTaskSchedule(goal);
    }
  }, [goal, isOpen]);

  const generateTaskSchedule = (goal: Goal) => {
    if (!goal) return;

    const startDate = new Date();
    const endDate = new Date(goal.targetDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate how many study sessions we need based on frequency
    let studyDays = [];
    if (goal.frequency === 'daily') {
      studyDays = Array.from({ length: totalDays }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        return date;
      });
    } else if (goal.frequency === 'weekly') {
      const weeksCount = Math.ceil(totalDays / 7);
      studyDays = Array.from({ length: weeksCount }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + (i * 7));
        return date;
      });
    } else if (goal.frequency === 'custom' && goal.customScheduleDays) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const customDayNumbers = goal.customScheduleDays.map(day => dayNames.indexOf(day));
      
      for (let i = 0; i < totalDays; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        if (customDayNumbers.includes(date.getDay())) {
          studyDays.push(date);
        }
      }
    }

    // Generate task templates
    const taskTemplates: TaskTemplate[] = studyDays.slice(0, Math.min(studyDays.length, 10)).map((date, index) => ({
      id: `task-${index + 1}`,
      name: `Study Session ${index + 1}`,
      scheduledDate: date.toISOString().split('T')[0],
      subtasks: generateSubtasksForSession(goal.workMinutesPerDay)
    }));

    setTasks(taskTemplates);
  };

  const generateSubtasksForSession = (totalMinutes: number) => {
    const subtaskTypes: Subtask['type'][] = ['reading', 'practice', 'review'];
    const subtasksPerSession = 3;
    const timePerSubtask = Math.floor(totalMinutes / subtasksPerSession);

    return Array.from({ length: subtasksPerSession }, (_, index) => ({
      name: `${subtaskTypes[index] || 'other'} activity`,
      type: subtaskTypes[index] || 'other',
      estimatedTimeMinutes: timePerSubtask
    }));
  };

  const handleTaskNameChange = (taskId: string, name: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, name } : task
    ));
  };

  const handleSubtaskChange = (taskId: string, subtaskIndex: number, field: string, value: any) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? {
            ...task,
            subtasks: task.subtasks.map((subtask, index) => 
              index === subtaskIndex 
                ? { ...subtask, [field]: value }
                : subtask
            )
          }
        : task
    ));
  };

  const handleAddTask = () => {
    const newTask: TaskTemplate = {
      id: `task-${Date.now()}`,
      name: `Study Session ${tasks.length + 1}`,
      scheduledDate: new Date().toISOString().split('T')[0],
      subtasks: generateSubtasksForSession(goal?.workMinutesPerDay || 30)
    };
    setTasks(prev => [...prev, newTask]);
  };

  const handleRemoveTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const handleSave = async () => {
    if (!goal) return;

    setIsSubmitting(true);
    try {
      const createdTasks: Task[] = tasks.map((task, index) => ({
        id: Date.now().toString() + index,
        goalId: goal.id,
        name: task.name,
        scheduledDate: task.scheduledDate,
        completed: false,
        order: index + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      const createdSubtasks: Subtask[] = [];
      tasks.forEach((task, taskIndex) => {
        task.subtasks.forEach((subtask, subtaskIndex) => {
          createdSubtasks.push({
            id: `${Date.now()}-${taskIndex}-${subtaskIndex}`,
            taskId: createdTasks[taskIndex].id,
            name: subtask.name,
            type: subtask.type,
            estimatedTimeMinutes: subtask.estimatedTimeMinutes,
            completed: false,
            order: subtaskIndex + 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        });
      });

      onSave(goal, createdTasks, createdSubtasks);
      onClose();
    } catch (error) {
      console.error('Error saving scaffolded tasks:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !goal) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Set Up Your Study Plan</h1>
                  <p className="text-gray-600">Customize tasks for: {goal.title}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleAddTask}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Task</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting || tasks.length === 0}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Goal'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="space-y-6">
            {tasks.map((task, taskIndex) => (
              <div key={task.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 pr-4">
                    <input
                      type="text"
                      value={task.name}
                      onChange={(e) => handleTaskNameChange(task.id, e.target.value)}
                      className="text-lg font-medium bg-transparent border-none outline-none focus:bg-gray-50 rounded px-2 py-1 w-full"
                      placeholder="Enter task name"
                    />
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <input
                          type="date"
                          value={task.scheduledDate}
                          onChange={(e) => setTasks(prev => prev.map(t => 
                            t.id === task.id ? { ...t, scheduledDate: e.target.value } : t
                          ))}
                          className="bg-transparent border-none outline-none"
                        />
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{task.subtasks.reduce((sum, s) => sum + s.estimatedTimeMinutes, 0)} min total</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveTask(task.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Remove task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Subtasks:</h4>
                  {task.subtasks.map((subtask, subtaskIndex) => (
                    <div key={subtaskIndex} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-500 w-6">{subtaskIndex + 1}.</span>
                      <input
                        type="text"
                        value={subtask.name}
                        onChange={(e) => handleSubtaskChange(task.id, subtaskIndex, 'name', e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none"
                        placeholder="Enter subtask name"
                      />
                      <select
                        value={subtask.type}
                        onChange={(e) => handleSubtaskChange(task.id, subtaskIndex, 'type', e.target.value)}
                        className="text-sm border-none bg-transparent outline-none"
                      >
                        <option value="reading">Reading</option>
                        <option value="practice">Practice</option>
                        <option value="flashcard">Flashcard</option>
                        <option value="quiz">Quiz</option>
                        <option value="review">Review</option>
                        <option value="other">Other</option>
                      </select>
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          value={subtask.estimatedTimeMinutes}
                          onChange={(e) => handleSubtaskChange(task.id, subtaskIndex, 'estimatedTimeMinutes', parseInt(e.target.value) || 0)}
                          className="w-16 text-sm text-center bg-transparent border-none outline-none"
                          min="5"
                          max="120"
                        />
                        <span className="text-sm text-gray-500">min</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {tasks.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">No tasks generated</h3>
              <p className="text-gray-600 mb-6">Click "Add Task" to create your first study session</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskScaffoldingScreen; 